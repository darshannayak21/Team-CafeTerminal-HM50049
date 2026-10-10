"""Database-First Live News Ingestion, Deduplication, and Processing Pipeline for RainGuard.

Key Guarantees:
1. Zero LLM Calls on Read: GET /api/news reads strictly from SQLite.
2. Canonical URL & Fingerprint Deduplication: Duplicate articles are skipped before any LLM invocation.
3. Concurrency Lock: Atomic SQLite state claiming prevents race conditions across workers.
4. Genuine Geocoding: Integrates OpenStreetMap Nominatim with caching, rate limiting, and precision classification.
5. Strict Fallbacks: Never invents coordinates, never jitters, never defaults to Pune centroid.
6. Failure Handling: Explicit status tracking (PENDING, PROCESSING, COMPLETED, FAILED) with retry limits.
7. Full Article Extraction: Uses trafilatura to fetch full article body for accurate LLM location extraction.
"""

import hashlib
import json
import logging
import os
import re
import threading
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import feedparser
import requests
from bs4 import BeautifulSoup

from backend.services.ai_service import extract_news_location_and_hazard
from backend.services.geocoding_service import geocode_location
from backend.services.db import (
    claim_article_for_processing,
    complete_article_processing,
    fail_article_processing,
    get_all_news,
    get_article_by_canonical_url,
    get_article_by_content_hash,
    get_pending_articles,
    increment_metric,
    insert_raw_article,
    touch_article_last_seen,
)

logger = logging.getLogger(__name__)

# ============================================================================
# Configured RSS Feeds — Pune-specific verified sources only
# ============================================================================
# 1. Google News RSS: Pune + disaster keywords, last 7 days
# 2. Times of India Pune city feed (filtered for disaster keywords)
# 3. NDTV Pune-specific search
# 4. Indian Express Pune
FEEDS = {
    "google_news_pune_local": (
        "https://news.google.com/rss/search?"
        "q=site%3Apunekarnews.in+OR+site%3Apunemirror.com+Pune+(flood+OR+waterlogging+OR+landslide+OR+rescue)"
        "+when%3A7d&hl=en-IN&gl=IN&ceid=IN%3Aen"
    ),
    "google_news_maharashtra_admin": (
        "https://news.google.com/rss/search?"
        "q=site%3Amaharashtra.gov.in+OR+site%3Apune.gov.in+(flood+OR+disaster+OR+warning)"
        "+when%3A7d&hl=en-IN&gl=IN&ceid=IN%3Aen"
    ),
}

# Disaster keywords that an article MUST contain to qualify
DISASTER_KEYWORDS = {
    "flood", "landslide", "waterlogging", "waterlogged", "rain", "rainfall",
    "heavy rain", "cloudburst", "dam", "overflow", "rescue", "evacuation",
    "collapse", "bridge collapse", "wall collapse", "building collapse",
    "fire", "trapped", "stranded", "disaster", "monsoon", "deluge",
    "submerge", "submerged", "inundate", "inundated", "drown",
    "mud", "mudslide", "rockfall", "road closed", "road closure",
    "ndrf", "sdrf", "red alert", "orange alert", "warning",
}

# Pune locality keywords — article must reference Pune area
PUNE_LOCALITY_KEYWORDS = {
    "pune", "pimpri", "chinchwad", "pcmc", "pmc",
    "kothrud", "warje", "baner", "hinjewadi", "wakad", "hadapsar",
    "swargate", "shivajinagar", "katraj", "kondhwa", "bibwewadi",
    "sinhagad", "navale", "viman nagar", "kharadi", "undri", "dhayari",
    "ambegaon", "baramati", "bhor", "daund", "haveli", "indapur",
    "junnar", "khed", "maval", "mulshi", "purandar", "shirur", "velhe",
    "lonavala", "khandala", "lavasa", "pashan", "aundh", "deccan",
    "yerawada", "lohegaon", "vishrantwadi", "dhanori", "wagholi",
    "mula", "mutha", "pavana", "indrayani",  # rivers
    "pune district", "western ghats",
}

# Tracking query parameters to strip for URL canonicalization
TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "ref", "ref_src", "source", "feedName", "feedType",
}

# Background worker controls
_SCHEDULER_THREAD: Optional[threading.Thread] = None
_STOP_EVENT = threading.Event()
_INGESTION_LOCK = threading.Lock()


# ============================================================================
# Canonicalization & Fingerprinting
# ============================================================================

def canonicalize_url(raw_url: Optional[str]) -> Optional[str]:
    """Normalize a URL by lowercasing scheme/host, sorting query params, and stripping tracking tags."""
    if not raw_url or not raw_url.strip():
        return None
    try:
        parsed = urllib.parse.urlparse(raw_url.strip())
        if not parsed.netloc:
            return None

        # Clean query params
        query_pairs = urllib.parse.parse_qsl(parsed.query)
        cleaned_pairs = [
            (k, v) for k, v in query_pairs
            if k.lower() not in TRACKING_PARAMS and not k.lower().startswith("utm_")
        ]
        cleaned_pairs.sort()
        cleaned_query = urllib.parse.urlencode(cleaned_pairs)

        # Standardize path
        path = parsed.path.rstrip("/")
        if not path:
            path = "/"

        canonical = urllib.parse.urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            path,
            "",  # params
            cleaned_query,
            "",  # fragment
        ))
        return canonical
    except Exception:
        return raw_url.strip()


def compute_content_hash(title: str, description: str) -> str:
    """Generate deterministic SHA-256 fingerprint from normalized content."""
    clean_title = re.sub(r"\s+", " ", title or "").strip().lower()
    clean_desc = re.sub(r"\s+", " ", description or "").strip().lower()
    combined = f"{clean_title}||{clean_desc}".encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


def strip_html_tags(text: Optional[str]) -> str:
    """Remove HTML markup safely."""
    if not text:
        return ""
    try:
        soup = BeautifulSoup(str(text), "html.parser")
        return soup.get_text(separator=" ").strip()
    except Exception:
        return re.sub(r"<[^>]+>", "", str(text)).strip()


def is_pune_disaster_article(title: str, description: str) -> bool:
    """Strict filter: article must mention Pune locality AND a disaster keyword."""
    text = f"{title} {description}".lower()

    has_pune = any(kw in text for kw in PUNE_LOCALITY_KEYWORDS)
    has_disaster = any(kw in text for kw in DISASTER_KEYWORDS)

    # Reject non-disaster irrelevant noise (commodity prices, sports, politics)
    reject_keywords = ["price", "prices", "soar", "coriander", "crop", "onion", "market", "sport", "cricket", "election", "bjp", "congress", "ncp"]
    has_reject = any(kw in text for kw in reject_keywords)

    return has_pune and has_disaster and not has_reject


# ============================================================================
# Full Article Text Extraction (trafilatura)
# ============================================================================

def extract_full_article_text(url: str) -> Optional[str]:
    """Fetch and extract the full article body text using trafilatura.

    This gives the LLM much richer context than the RSS description snippet,
    enabling it to find specific location names like street, bridge, village.
    """
    if not url or not url.strip():
        return None

    try:
        import trafilatura
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
            if text and len(text) > 50:
                # Cap at 2000 chars to avoid overwhelming the LLM
                return text[:2000]
    except ImportError:
        logger.warning("[NewsIngestion] trafilatura not installed, falling back to requests+BS4")
    except Exception as e:
        logger.debug(f"[NewsIngestion] trafilatura extraction failed for {url}: {e}")

    # Fallback: basic requests + BeautifulSoup
    try:
        resp = requests.get(url, timeout=8, headers={
            "User-Agent": "Mozilla/5.0 (compatible; RainGuard/2.0; Disaster Response)"
        })
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            # Remove scripts, styles, nav
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            if text and len(text) > 100:
                return text[:2000]
    except Exception as e:
        logger.debug(f"[NewsIngestion] BS4 fallback failed for {url}: {e}")

    return None


# ============================================================================
# Feed Fetching & Ingestion
# ============================================================================

def fetch_feed_entries(feed_name: str, feed_url: str) -> List[Dict[str, Any]]:
    """Download and parse RSS feed entries without invoking any LLM.

    Applies strict Pune+disaster filtering before persisting.
    """
    try:
        feed = feedparser.parse(feed_url)
        entries: List[Dict[str, Any]] = []

        for entry in feed.entries:
            title = strip_html_tags(getattr(entry, "title", ""))
            desc = strip_html_tags(getattr(entry, "description", getattr(entry, "summary", "")))
            raw_link = getattr(entry, "link", "")

            if not title:
                continue

            # STRICT FILTER: Must be Pune + disaster
            if not is_pune_disaster_article(title, desc):
                continue

            canonical_link = canonicalize_url(raw_link)
            content_hash = compute_content_hash(title, desc)

            pub_date = getattr(entry, "published", getattr(entry, "updated", None))
            if not pub_date:
                pub_date = datetime.now(timezone.utc).isoformat()

            entries.append({
                "source": feed_name.replace("_", " ").title(),
                "source_url": raw_link,
                "canonical_url": canonical_link,
                "title": title,
                "original_description": desc,
                "published_at": pub_date,
                "content_hash": content_hash,
            })

            if len(entries) >= 10:
                break

        logger.info(f"[NewsIngestion] Feed '{feed_name}': {len(feed.entries)} total, {len(entries)} passed Pune+disaster filter.")
        return entries
    except Exception as e:
        logger.warning(f"[NewsIngestion] Error fetching feed {feed_name}: {e}")
        return []


def get_official_imd_alerts() -> List[Dict[str, Any]]:
    """Scrape real IMD warnings for Pune district if available."""
    alerts: List[Dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        resp = requests.get(
            "https://imdpune.gov.in/",
            timeout=10,
            headers={"User-Agent": "RainGuard/2.0 Pune Disaster Response"}
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            warning_elements = soup.find_all(['h1', 'h2', 'h3', 'a', 'marquee', 'li'])
            for elem in warning_elements:
                text = str(elem.text).strip()
                # Exclude header/footer noise
                if len(text) > 20 and any(kw in text.lower() for kw in ["rain", "warning", "alert", "heavy", "flood", "cyclone"]):
                    alerts.append({
                        "source": "IMD Pune Regional",
                        "source_url": "https://imdpune.gov.in/",
                        "canonical_url": f"https://imdpune.gov.in/warning/{compute_content_hash(text, '')[:12]}",
                        "title": f"IMD Alert: {text[:100]}",
                        "original_description": text[:500],
                        "published_at": now_iso,
                        "content_hash": compute_content_hash(text, "imdpune"),
                    })
    except Exception as e:
        logger.debug(f"[NewsIngestion] IMD Pune scrape failed: {e}")

    # Ensure unique
    unique_alerts = {a["content_hash"]: a for a in alerts}
    return list(unique_alerts.values())[:3]


def get_pmc_and_sdma_alerts() -> List[Dict[str, Any]]:
    """Scrape PMC and SDMA official disaster updates."""
    alerts: List[Dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    # PMC Scraper
    try:
        resp = requests.get(
            "https://pmc.gov.in/en",
            timeout=10,
            headers={"User-Agent": "RainGuard/2.0 Pune Disaster Response"}
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for elem in soup.find_all(['a', 'div', 'span']):
                text = str(elem.text).strip()
                if len(text) > 20 and any(kw in text.lower() for kw in ["flood", "waterlogging", "emergency", "alert", "disaster", "evacuat"]):
                    link = elem.get('href', '') if elem.name == 'a' else ''
                    if link and not link.startswith('http'):
                        link = "https://pmc.gov.in" + link
                    alerts.append({
                        "source": "PMC Official",
                        "source_url": link or "https://pmc.gov.in/en",
                        "canonical_url": link or f"https://pmc.gov.in/alert/{compute_content_hash(text, '')[:12]}",
                        "title": f"PMC Update: {text[:100]}",
                        "original_description": text[:500],
                        "published_at": now_iso,
                        "content_hash": compute_content_hash(text, "pmc"),
                    })
    except Exception as e:
        logger.debug(f"[NewsIngestion] PMC scrape failed: {e}")

    # SDMA Scraper (Pune Gov)
    try:
        resp = requests.get(
            "https://pune.gov.in/disaster-management/",
            timeout=10,
            headers={"User-Agent": "RainGuard/2.0 Pune Disaster Response"}
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for elem in soup.find_all(['a', 'p', 'li']):
                text = str(elem.text).strip()
                if len(text) > 20 and any(kw in text.lower() for kw in ["flood", "rescue", "emergency", "landslide", "alert", "disaster"]):
                    alerts.append({
                        "source": "Pune SDMA",
                        "source_url": "https://pune.gov.in/disaster-management/",
                        "canonical_url": f"https://pune.gov.in/alert/{compute_content_hash(text, '')[:12]}",
                        "title": f"SDMA Warning: {text[:100]}",
                        "original_description": text[:500],
                        "published_at": now_iso,
                        "content_hash": compute_content_hash(text, "sdma"),
                    })
    except Exception as e:
        logger.debug(f"[NewsIngestion] SDMA scrape failed: {e}")

    unique_alerts = {a["content_hash"]: a for a in alerts}
    return list(unique_alerts.values())[:3]


def ingest_feeds() -> Dict[str, int]:
    """Fetch all configured feeds and persist raw articles to SQLite.

    Does NOT run LLM extraction; solely populates the database and tracks metrics.
    Returns stats dict: {fetched, new, skipped}.
    """
    all_raw: List[Dict[str, Any]] = []

    # 1. Live IMD Alerts
    imd_alerts = get_official_imd_alerts()
    all_raw.extend(imd_alerts)

    # 1.b Live PMC/SDMA Alerts
    pmc_alerts = get_pmc_and_sdma_alerts()
    all_raw.extend(pmc_alerts)

    # 2. RSS Feeds (strictly filtered for Pune+disaster)
    for name, url in FEEDS.items():
        all_raw.extend(fetch_feed_entries(name, url))

    fetched_count = len(all_raw)
    new_count = 0
    skipped_count = 0

    increment_metric("articles_fetched", fetched_count)

    for article in all_raw:
        is_new, record = insert_raw_article(article)
        if is_new:
            new_count += 1
            increment_metric("new_articles_discovered")
        else:
            skipped_count += 1
            increment_metric("duplicate_articles_skipped")

    logger.info(f"[NewsIngestion] Ingestion cycle complete: {fetched_count} fetched, {new_count} new, {skipped_count} skipped.")
    return {
        "fetched": fetched_count,
        "new": new_count,
        "skipped": skipped_count,
    }


# ============================================================================
# LLM Processing & Geocoding Worker
# ============================================================================

def process_single_article(article: Dict[str, Any]) -> bool:
    """Process a single article with LLM location extraction and genuine geocoding.

    KEY IMPROVEMENT: Fetches full article body via trafilatura before sending to LLM,
    so the LLM sees specific place names (street, bridge, village) not just 'Pune'.
    """
    article_id = article["id"]

    # 1. Atomic Concurrency Lock
    claimed = claim_article_for_processing(article_id)
    if not claimed:
        return False

    try:
        title = article["title"]
        description = article.get("original_description") or article.get("description", "")
        source = article.get("source", "News")
        source_url = article.get("source_url") or article.get("canonical_url") or ""

        # 2. CRITICAL: Fetch full article body for richer location extraction
        full_text = extract_full_article_text(source_url)
        if full_text:
            # Give the LLM the full article text instead of just the RSS snippet
            enriched_description = f"{description}\n\n--- Full Article Text ---\n{full_text}"
        else:
            enriched_description = description

        # 3. Structured Extraction via LLM (Location name & hazards only, NO coordinates)
        extracted = extract_news_location_and_hazard(title, enriched_description, source)

        location_name = extracted.get("exact_location_name")
        location_evidence = extracted.get("location_evidence")
        admin_area = f"{extracted.get('district', 'Pune')}, {extracted.get('state', 'Maharashtra')}"
        is_incident = extracted.get("is_geographic_incident", True)
        severity = extracted.get("severity", "MEDIUM")

        # 4. Genuine Geocoding (OpenStreetMap Nominatim with Rate-Limiting & Caching)
        latitude = None
        longitude = None
        geolocation_status = "UNRESOLVED"
        matched_name = None
        geo_source = "osm_nominatim"

        if location_name and is_incident:
            geo_result = geocode_location(
                location_name=location_name,
                district_context=extracted.get("district") or "Pune",
                state_context=extracted.get("state") or "Maharashtra",
            )
            latitude = geo_result.get("latitude")
            longitude = geo_result.get("longitude")
            geolocation_status = geo_result.get("geolocation_status", "UNRESOLVED")
            matched_name = geo_result.get("matched_name")
            geo_source = geo_result.get("provider", "osm_nominatim")

        # 5. Save Completed State to SQLite
        complete_article_processing(
            article_id=article_id,
            extracted_location=location_name,
            location_evidence=location_evidence,
            administrative_area=admin_area,
            is_incident=is_incident,
            latitude=latitude,
            longitude=longitude,
            geolocation_status=geolocation_status,
            geolocation_source=geo_source,
            geolocation_matched_name=matched_name,
            severity=severity,
            analysis_result=extracted,
        )

        increment_metric("successfully_processed_articles")
        logger.info(f"[NewsProcessor] Processed article '{title[:50]}...' -> Loc: {location_name} ({geolocation_status}) [{latitude}, {longitude}]")
        return True

    except Exception as e:
        error_msg = f"Processing exception: {str(e)}"
        logger.error(f"[NewsProcessor] Failed article {article_id}: {error_msg}")
        fail_article_processing(article_id, error_msg)
        increment_metric("failed_processing_jobs")
        return False


def process_pending_articles(limit: int = 10) -> int:
    """Process pending articles up to batch limit."""
    pending = get_pending_articles(limit=limit)
    processed = 0
    for article in pending:
        success = process_single_article(article)
        if success:
            processed += 1
    return processed


def run_full_pipeline() -> Dict[str, Any]:
    """Execute both feed ingestion and pending article processing synchronously."""
    from backend.services.db import prune_old_news
    with _INGESTION_LOCK:
        ingest_stats = ingest_feeds()
        processed_count = process_pending_articles(limit=15)
        # Prune to keep only the 5 most recent
        prune_old_news(5)
        return {
            "ingested": ingest_stats,
            "processed_count": processed_count,
        }


# ============================================================================
# Background Worker Scheduler
# ============================================================================

def _scheduler_loop(interval_seconds: int = 600) -> None:
    """Background worker daemon loop."""
    logger.info(f"[NewsScheduler] Background ingestion worker started (interval: {interval_seconds}s).")
    while not _STOP_EVENT.is_set():
        try:
            run_full_pipeline()
        except Exception as e:
            logger.error(f"[NewsScheduler] Error in scheduled run: {e}")

        # Sleep in small increments to allow graceful shutdown
        for _ in range(interval_seconds):
            if _STOP_EVENT.is_set():
                break
            time.sleep(1)


def start_background_ingestion(interval_seconds: int = 600) -> None:
    """Start background news ingestion worker thread."""
    global _SCHEDULER_THREAD
    if _SCHEDULER_THREAD is not None and _SCHEDULER_THREAD.is_alive():
        return
    _STOP_EVENT.clear()
    _SCHEDULER_THREAD = threading.Thread(
        target=_scheduler_loop,
        args=(interval_seconds,),
        daemon=True,
        name="RainGuardNewsIngestionThread",
    )
    _SCHEDULER_THREAD.start()


def stop_background_ingestion() -> None:
    """Signal background worker to stop."""
    _STOP_EVENT.set()
    if _SCHEDULER_THREAD is not None:
        _SCHEDULER_THREAD.join(timeout=2.0)
