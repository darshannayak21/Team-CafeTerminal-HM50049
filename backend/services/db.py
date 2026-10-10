"""Persistent SQLite database manager for RainGuard."""

import os
import sqlite3
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.config import Config, get_config


def get_db_path() -> str:
    """Retrieve SQLite database path from Flask app config or base config."""
    try:
        from flask import current_app, has_app_context
        if has_app_context() and current_app and "DATABASE_PATH" in current_app.config:
            db_path = current_app.config["DATABASE_PATH"]
            os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
            return db_path
    except Exception:
        pass

    config = get_config()
    db_path = getattr(config, "DATABASE_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "rainguard.db"))
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    return db_path


def get_connection() -> sqlite3.Connection:
    """Open SQLite connection with row factory enabled."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database tables, migrations, geocoding cache, and operational metrics."""
    db_path = get_db_path()
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Reports Table (Ground reports submitted via Mobile / API)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                incident_type TEXT NOT NULL,
                description TEXT DEFAULT '',
                image_url TEXT,
                image_filename TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                accuracy REAL,
                location_name TEXT,
                timestamp TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'ground_report',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL
            )
            """
        )

        # Ensure report extensions for LLM analysis and deduplication
        cursor.execute("PRAGMA table_info(reports)")
        report_columns = [col[1] for col in cursor.fetchall()]
        if "processing_status" not in report_columns:
            cursor.execute("ALTER TABLE reports ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'pending'")
        if "analysis_result" not in report_columns:
            cursor.execute("ALTER TABLE reports ADD COLUMN analysis_result TEXT")
        if "content_hash" not in report_columns:
            cursor.execute("ALTER TABLE reports ADD COLUMN content_hash TEXT")
        if "processed_at" not in report_columns:
            cursor.execute("ALTER TABLE reports ADD COLUMN processed_at TEXT")
        if "estimated_population_1km" not in report_columns:
            cursor.execute("ALTER TABLE reports ADD COLUMN estimated_population_1km REAL")
        if "impact_radius_km" not in report_columns:
            cursor.execute("ALTER TABLE reports ADD COLUMN impact_radius_km REAL")

        # 2. News Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS news (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'News',
                category TEXT NOT NULL DEFAULT 'Traffic Alert',
                location_name TEXT,
                latitude REAL,
                longitude REAL,
                timestamp TEXT NOT NULL,
                is_simulated INTEGER NOT NULL DEFAULT 0,
                badge TEXT NOT NULL DEFAULT 'News',
                created_at TEXT NOT NULL
            )
            """
        )

        # Check and add extended news fields for production ingestion pipeline
        cursor.execute("PRAGMA table_info(news)")
        news_columns = [col[1] for col in cursor.fetchall()]

        extended_fields = {
            "source_url": "TEXT",
            "canonical_url": "TEXT",
            "original_description": "TEXT",
            "published_at": "TEXT",
            "first_seen_at": "TEXT",
            "last_seen_at": "TEXT",
            "content_hash": "TEXT",
            "processing_status": "TEXT NOT NULL DEFAULT 'PENDING'",
            "processed_at": "TEXT",
            "retry_count": "INTEGER NOT NULL DEFAULT 0",
            "extracted_location": "TEXT",
            "location_evidence": "TEXT",
            "administrative_area": "TEXT",
            "is_incident": "INTEGER NOT NULL DEFAULT 1",
            "geolocation_status": "TEXT NOT NULL DEFAULT 'UNRESOLVED'",
            "geolocation_source": "TEXT",
            "geolocation_matched_name": "TEXT",
            "severity": "TEXT NOT NULL DEFAULT 'MEDIUM'",
            "analysis_result": "TEXT",
            "error_message": "TEXT",
            "updated_at": "TEXT",
            "estimated_population_1km": "REAL",
            "impact_radius_km": "REAL",
        }

        for field_name, field_type in extended_fields.items():
            if field_name not in news_columns:
                cursor.execute(f"ALTER TABLE news ADD COLUMN {field_name} {field_type}")

        # Unique partial indexes for atomic deduplication
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_news_canonical_url ON news (canonical_url) WHERE canonical_url IS NOT NULL")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_news_content_hash ON news (content_hash) WHERE content_hash IS NOT NULL")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_processing_status ON news (processing_status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_created_at ON news (created_at)")

        # 3. Geocoding Cache Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS geocoding_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_key TEXT UNIQUE NOT NULL,
                matched_name TEXT,
                latitude REAL,
                longitude REAL,
                geolocation_status TEXT NOT NULL,
                location_type TEXT,
                provider TEXT NOT NULL DEFAULT 'osm_nominatim',
                raw_response TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_geocoding_cache_query ON geocoding_cache (query_key)")

        # 4. Operational Metrics Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS operational_metrics (
                metric_key TEXT PRIMARY KEY,
                metric_value INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            )
            """
        )

        conn.commit()


# ============================================================================
# Operational Metrics
# ============================================================================

def increment_metric(metric_key: str, amount: int = 1) -> int:
    """Increment an operational metric atomically and return the new value."""
    init_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO operational_metrics (metric_key, metric_value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(metric_key) DO UPDATE SET
                metric_value = metric_value + excluded.metric_value,
                updated_at = excluded.updated_at
            """,
            (metric_key, amount, now_iso),
        )
        conn.commit()
        cursor.execute("SELECT metric_value FROM operational_metrics WHERE metric_key = ?", (metric_key,))
        row = cursor.fetchone()
        return row[0] if row else 0


def get_operational_metrics() -> Dict[str, Any]:
    """Retrieve all persisted operational counters with breakdown."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT metric_key, metric_value FROM operational_metrics")
        rows = cursor.fetchall()
        metrics = {row["metric_key"]: row["metric_value"] for row in rows}

        # Calculate live database breakdown for real-time consistency
        cursor.execute("SELECT COUNT(*) FROM news")
        total_news = cursor.fetchone()[0]

        cursor.execute("SELECT geolocation_status, COUNT(*) FROM news GROUP BY geolocation_status")
        geo_counts = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.execute("SELECT processing_status, COUNT(*) FROM news GROUP BY processing_status")
        proc_counts = {row[0]: row[1] for row in cursor.fetchall()}

        return {
            "articles_fetched": metrics.get("articles_fetched", 0),
            "new_articles_discovered": metrics.get("new_articles_discovered", 0),
            "duplicate_articles_skipped": metrics.get("duplicate_articles_skipped", 0),
            "llm_requests_made": metrics.get("llm_requests_made", 0),
            "successfully_processed_articles": metrics.get("successfully_processed_articles", 0),
            "failed_processing_jobs": metrics.get("failed_processing_jobs", 0),
            "geocoding_requests": metrics.get("geocoding_requests", 0),
            "geocoding_cache_hits": metrics.get("geocoding_cache_hits", 0),
            "verified_locations": geo_counts.get("VERIFIED", 0),
            "approximate_locations": geo_counts.get("APPROXIMATE_LOCALITY", 0),
            "ambiguous_locations": geo_counts.get("AMBIGUOUS", 0),
            "unresolved_locations": geo_counts.get("UNRESOLVED", 0),
            "processing_breakdown": proc_counts,
            "total_persisted_articles": total_news,
        }


# ============================================================================
# Geocoding Cache
# ============================================================================

def get_cached_geocoding(query_key: str) -> Optional[Dict[str, Any]]:
    """Retrieve cached geocoding result by normalized query key."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM geocoding_cache WHERE query_key = ?", (query_key,))
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)


def save_cached_geocoding(
    query_key: str,
    matched_name: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    geolocation_status: str,
    location_type: Optional[str] = None,
    provider: str = "osm_nominatim",
    raw_response: Optional[Any] = None,
) -> Dict[str, Any]:
    """Cache a geocoding result."""
    init_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    raw_json = json.dumps(raw_response) if raw_response is not None else None

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO geocoding_cache (
                query_key, matched_name, latitude, longitude,
                geolocation_status, location_type, provider, raw_response, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(query_key) DO UPDATE SET
                matched_name = excluded.matched_name,
                latitude = excluded.latitude,
                longitude = excluded.longitude,
                geolocation_status = excluded.geolocation_status,
                location_type = excluded.location_type,
                raw_response = excluded.raw_response
            """,
            (
                query_key,
                matched_name,
                latitude,
                longitude,
                geolocation_status,
                location_type,
                provider,
                raw_json,
                now_iso,
            ),
        )
        conn.commit()

    return get_cached_geocoding(query_key)  # type: ignore


# ============================================================================
# News Pipeline Operations
# ============================================================================

def get_article_by_canonical_url(canonical_url: str) -> Optional[Dict[str, Any]]:
    """Check if article exists by canonical URL."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM news WHERE canonical_url = ?", (canonical_url,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_article_by_content_hash(content_hash: str) -> Optional[Dict[str, Any]]:
    """Check if article exists by content hash."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM news WHERE content_hash = ?", (content_hash,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_article_by_id(article_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve single article by ID."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM news WHERE id = ?", (article_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def insert_raw_article(article_data: Dict[str, Any]) -> tuple[bool, Dict[str, Any]]:
    """Atomically insert a new ingested article if not already present.

    Returns (is_new, article_dict).
    """
    init_db()
    canonical_url = article_data.get("canonical_url")
    content_hash = article_data.get("content_hash")

    # Fast check
    if canonical_url:
        existing = get_article_by_canonical_url(canonical_url)
        if existing:
            touch_article_last_seen(existing["id"])
            return False, existing

    if content_hash:
        existing = get_article_by_content_hash(content_hash)
        if existing:
            touch_article_last_seen(existing["id"])
            return False, existing

    now_iso = datetime.now(timezone.utc).isoformat()
    article_id = article_data.get("id") or f"art_{content_hash[:16] if content_hash else abs(hash(canonical_url))}"

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO news (
                    id, title, description, source, category, location_name,
                    latitude, longitude, timestamp, is_simulated, badge, created_at,
                    source_url, canonical_url, original_description, published_at,
                    first_seen_at, last_seen_at, content_hash, processing_status,
                    retry_count, geolocation_status, severity, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    article_id,
                    article_data.get("title", ""),
                    article_data.get("original_description") or article_data.get("description", ""),
                    article_data.get("source", "News"),
                    article_data.get("category", "Traffic Alert"),
                    article_data.get("location_name"),
                    article_data.get("latitude"),
                    article_data.get("longitude"),
                    article_data.get("published_at") or now_iso,
                    0,
                    article_data.get("badge", "News"),
                    now_iso,
                    article_data.get("source_url"),
                    canonical_url,
                    article_data.get("original_description") or article_data.get("description", ""),
                    article_data.get("published_at") or now_iso,
                    now_iso,
                    now_iso,
                    content_hash,
                    article_data.get("processing_status", "PENDING"),
                    0,
                    article_data.get("geolocation_status", "UNRESOLVED"),
                    article_data.get("severity", "MEDIUM"),
                    now_iso,
                ),
            )
            conn.commit()
            return True, get_article_by_id(article_id)  # type: ignore
        except sqlite3.IntegrityError:
            # Race condition: article inserted concurrently
            if canonical_url:
                existing = get_article_by_canonical_url(canonical_url)
                if existing:
                    return False, existing
            if content_hash:
                existing = get_article_by_content_hash(content_hash)
                if existing:
                    return False, existing
            existing = get_article_by_id(article_id)
            return False, existing or article_data  # type: ignore


def touch_article_last_seen(article_id: str) -> None:
    """Update last_seen_at timestamp for a duplicate article."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE news SET last_seen_at = ?, updated_at = ? WHERE id = ?", (now_iso, now_iso, article_id))
        conn.commit()


def claim_article_for_processing(article_id: str, max_retries: int = 3) -> bool:
    """Atomically set processing_status to PROCESSING if PENDING or FAILED with retries remaining.

    Prevents concurrent workers from processing the same article.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE news
            SET processing_status = 'PROCESSING',
                updated_at = ?
            WHERE id = ?
              AND (
                  processing_status = 'PENDING'
                  OR (processing_status = 'FAILED' AND retry_count < ?)
              )
            """,
            (now_iso, article_id, max_retries),
        )
        conn.commit()
        return cursor.rowcount > 0


def complete_article_processing(
    article_id: str,
    extracted_location: Optional[str],
    location_evidence: Optional[str],
    administrative_area: Optional[str],
    is_incident: bool,
    latitude: Optional[float],
    longitude: Optional[float],
    geolocation_status: str,
    geolocation_source: Optional[str],
    geolocation_matched_name: Optional[str],
    severity: str,
    analysis_result: Dict[str, Any],
    estimated_population_1km: Optional[float] = None,
) -> None:
    """Store complete processed extraction and geocoding result."""
    now_iso = datetime.now(timezone.utc).isoformat()
    analysis_json = json.dumps(analysis_result)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE news
            SET processing_status = 'COMPLETED',
                processed_at = ?,
                extracted_location = ?,
                location_evidence = ?,
                administrative_area = ?,
                is_incident = ?,
                latitude = ?,
                longitude = ?,
                geolocation_status = ?,
                geolocation_source = ?,
                geolocation_matched_name = ?,
                location_name = ?,
                severity = ?,
                analysis_result = ?,
                estimated_population_1km = ?,
                error_message = NULL,
                updated_at = ?
            WHERE id = ?
            """,
            (
                now_iso,
                extracted_location,
                location_evidence,
                administrative_area,
                1 if is_incident else 0,
                latitude,
                longitude,
                geolocation_status,
                geolocation_source,
                geolocation_matched_name,
                extracted_location or geolocation_matched_name or "Unspecified Location",
                severity,
                analysis_json,
                estimated_population_1km,
                now_iso,
                article_id,
            ),
        )
        conn.commit()


def fail_article_processing(article_id: str, error_message: str) -> None:
    """Mark article processing as failed and increment retry_count."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE news
            SET processing_status = 'FAILED',
                retry_count = retry_count + 1,
                error_message = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (error_message, now_iso, article_id),
        )
        conn.commit()


def get_pending_articles(limit: int = 10, max_retries: int = 3) -> List[Dict[str, Any]]:
    """Retrieve articles eligible for LLM processing."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM news
            WHERE processing_status = 'PENDING'
               OR (processing_status = 'FAILED' AND retry_count < ?)
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (max_retries, limit),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def prune_old_news(limit: int = 5) -> None:
    """Keep only the latest `limit` news items and delete the rest."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM news ORDER BY published_at DESC LIMIT ?", (limit,))
        top_ids = [row["id"] for row in cursor.fetchall()]
        
        if len(top_ids) > 0:
            placeholders = ",".join(["?"] * len(top_ids))
            cursor.execute(f"DELETE FROM news WHERE id NOT IN ({placeholders})", tuple(top_ids))
            conn.commit()


def get_all_news(
    limit: int = 5,
    status_filter: Optional[str] = None,
    only_located: bool = False,
) -> List[Dict[str, Any]]:
    """Retrieve news articles directly from the database, newest first."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM news WHERE is_incident = 1"
        params: List[Any] = []

        if status_filter:
            query += " AND processing_status = ?"
            params.append(status_filter)

        if only_located:
            query += " AND latitude IS NOT NULL AND longitude IS NOT NULL"

        query += " ORDER BY published_at DESC, created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


# ============================================================================
# Ground Reports Operations
# ============================================================================

def save_report(report_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new ground report into the database."""
    init_db()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO reports (
                id, incident_type, description, image_url, image_filename,
                latitude, longitude, accuracy, location_name,
                timestamp, source, status, created_at,
                processing_status, analysis_result, content_hash, processed_at,
                estimated_population_1km, impact_radius_km
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_data["id"],
                report_data["incident_type"],
                report_data.get("description", ""),
                report_data.get("image_url"),
                report_data.get("image_filename"),
                report_data["latitude"],
                report_data["longitude"],
                report_data.get("accuracy"),
                report_data.get("location_name"),
                report_data["timestamp"],
                report_data.get("source", "ground_report"),
                report_data.get("status", "pending"),
                report_data["created_at"],
                report_data.get("processing_status", "pending"),
                json.dumps(report_data.get("analysis_result")) if report_data.get("analysis_result") else None,
                report_data.get("content_hash"),
                report_data.get("processed_at"),
                report_data.get("estimated_population_1km"),
                report_data.get("impact_radius_km"),
            ),
        )
        conn.commit()

    return get_report_by_id(report_data["id"])  # type: ignore


def update_report_analysis(report_id: str, analysis_result: Dict[str, Any], processing_status: str = "completed") -> None:
    """Store LLM analysis result for a ground report."""
    now_iso = datetime.now(timezone.utc).isoformat()
    analysis_json = json.dumps(analysis_result)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE reports
            SET analysis_result = ?,
                processing_status = ?,
                processed_at = ?
            WHERE id = ?
            """,
            (analysis_json, processing_status, now_iso, report_id),
        )
        conn.commit()


def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single report by ID."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
        row = cursor.fetchone()
        if not row:
            return None
        res = dict(row)
        if res.get("analysis_result") and isinstance(res["analysis_result"], str):
            try:
                res["analysis_result"] = json.loads(res["analysis_result"])
            except Exception:
                pass
        return res


def get_all_reports() -> List[Dict[str, Any]]:
    """Retrieve all ground reports, newest first."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports ORDER BY created_at DESC")
        rows = cursor.fetchall()
        reports = []
        for row in rows:
            r = dict(row)
            if r.get("analysis_result") and isinstance(r["analysis_result"], str):
                try:
                    r["analysis_result"] = json.loads(r["analysis_result"])
                except Exception:
                    pass
            reports.append(r)
        return reports

def delete_report(report_id: str) -> bool:
    """Delete a ground report from the database."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM reports WHERE id = ?", (report_id,))
        conn.commit()
        return cursor.rowcount > 0
