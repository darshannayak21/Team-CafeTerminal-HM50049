"""Persistent SQLite database manager for RainGuard."""

import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.config import Config, get_config


def get_db_path() -> str:
    """Retrieve SQLite database path from config."""
    config = get_config()
    db_path = getattr(config, "DATABASE_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "rainguard.db"))
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    return db_path


def get_connection() -> sqlite3.Connection:
    """Open SQLite connection with row factory enabled."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database tables, ensure single initial ground report (if empty), and single news record."""
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

        # 2. News Table (Exactly ONE static news record)
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

        # Ensure single initial ground report if database is fresh / empty
        cursor.execute("SELECT COUNT(*) as count FROM reports")
        rep_row = cursor.fetchone()
        if rep_row and rep_row["count"] == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                """
                INSERT INTO reports (
                    id, incident_type, description, image_url, image_filename,
                    latitude, longitude, accuracy, location_name,
                    timestamp, source, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "RG-20260927-PUNE01",
                    "Road Blocked",
                    "Debris and fallen tree branches obstructing primary lane near Chandani Chowk bypass. Traffic moving at reduced speed.",
                    None,
                    None,
                    18.5089,
                    73.7925,
                    8.0,
                    "Chandani Chowk, Paud Road",
                    now_iso,
                    "ground_report",
                    "pending",
                    now_iso,
                ),
            )

        # 2. News Table
        cursor.execute("SELECT COUNT(*) as count FROM news")
        news_row = cursor.fetchone()
        if news_row and news_row["count"] == 0:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            # 8 PM ISO (20:00:00)
            warje_time = f"{today}T20:00:00Z"
            # 9 PM ISO (21:00:00)
            suncity_time = f"{today}T21:00:00Z"

            # Warje Bridge News
            cursor.execute(
                """
                INSERT INTO news (
                    id, title, description, source, category,
                    location_name, latitude, longitude, timestamp,
                    is_simulated, badge, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "NEWS-WARJE-01",
                    "CRITICAL: Warje Bridge Over Mutha River Partially Collapses",
                    "A massive structural failure has led to the partial collapse of the Warje Bridge spanning the Mutha river. Emergency services are at the scene. Absolute halt on all vehicle movement. Commuters are advised to avoid the area indefinitely.",
                    "Pune Mirror Live",
                    "Infrastructure Failure",
                    "Warje Bridge, Mutha River",
                    18.4756,
                    73.8086,
                    warje_time,
                    0,
                    "News",
                    warje_time,
                ),
            )

            # Suncity Society News
            cursor.execute(
                """
                INSERT INTO news (
                    id, title, description, source, category,
                    location_name, latitude, longitude, timestamp,
                    is_simulated, badge, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "NEWS-SUNCITY-01",
                    "BREAKING: Residential Building Collapse at Suncity Society - Over 100 lives at risk",
                    "Tragedy strikes Anand Nagar as a residential wing in Suncity Society collapses following severe structural stress. Rescue operations are currently mobilizing. Over 100 lives at risk/affected. Multiple casualties feared.",
                    "Times Network",
                    "Disaster Alert",
                    "Suncity Society, Anand Nagar",
                    18.4831,
                    73.8180,
                    suncity_time,
                    0,
                    "News",
                    suncity_time,
                ),
            )

        conn.commit()


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
                timestamp, source, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            ),
        )
        conn.commit()

    return get_report_by_id(report_data["id"])  # type: ignore


def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single report by ID."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)


def get_all_reports() -> List[Dict[str, Any]]:
    """Retrieve all ground reports, newest first."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_all_news() -> List[Dict[str, Any]]:
    """Retrieve the single contextual news item."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM news ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
