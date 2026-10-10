"""Live Scraper Service Adapter.

Maintains backward compatibility with legacy callers while routing through
the database-first news ingestion pipeline.
"""

from typing import Any, Dict, List
from backend.services.db import get_all_news
from backend.services.news_service import ingest_feeds, run_full_pipeline, FEEDS, get_official_imd_alerts


def scrape_imd_warnings() -> List[Dict[str, Any]]:
    """Return official IMD bulletins."""
    return get_official_imd_alerts()


def get_live_alerts() -> List[Dict[str, Any]]:
    """Retrieve news articles from database.

    Reads purely from SQLite. Does NOT trigger repeated LLM processing.
    """
    db_items = get_all_news(limit=25)
    alerts = []
    for item in db_items:
        lat = item.get("latitude")
        lng = item.get("longitude")
        coords = [lat, lng] if (lat is not None and lng is not None) else None

        alerts.append({
            "id": item.get("id"),
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "source": item.get("source", "News"),
            "link": item.get("canonical_url") or item.get("source_url") or "",
            "severity": item.get("severity", "MEDIUM"),
            "published": item.get("published_at") or item.get("timestamp"),
            "coordinates": coords,
            "geolocation_status": item.get("geolocation_status", "UNRESOLVED"),
            "extracted_location": item.get("extracted_location"),
            "location_evidence": item.get("location_evidence"),
            "processing_status": item.get("processing_status", "PENDING"),
        })
    return alerts
