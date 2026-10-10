"""Database-backed News Feed and Operational Analytics API."""

import json
from flask import Blueprint, jsonify, request
from backend.services.db import get_all_news, get_operational_metrics
from backend.services.news_service import run_full_pipeline

news_bp = Blueprint("news", __name__)


@news_bp.route("/api/news", methods=["GET"])
def list_news():
    """Retrieve news feed items purely from the SQLite database.

    Frontend polling NEVER triggers LLM calls or outbound scraping.
    """
    limit = request.args.get("limit", default=50, type=int)
    status_filter = request.args.get("status", default=None, type=str)
    only_located = request.args.get("only_located", default="false").lower() in ("true", "1")

    db_items = get_all_news(limit=limit, status_filter=status_filter, only_located=only_located)

    news_list = []
    for item in db_items:
        # Latitude and Longitude are strictly from geocoder or None: NEVER default to Pune or inject jitter
        lat = item.get("latitude")
        lon = item.get("longitude")

        # Parse analysis_result if stored as JSON string
        analysis = item.get("analysis_result")
        if isinstance(analysis, str) and analysis:
            try:
                analysis = json.loads(analysis)
            except Exception:
                pass

        news_list.append({
            "id": item.get("id"),
            "title": item.get("title", ""),
            "description": item.get("original_description") or item.get("description", ""),
            "source": item.get("source", "News"),
            "url": item.get("canonical_url") or item.get("source_url") or "",
            "canonical_url": item.get("canonical_url"),
            "source_url": item.get("source_url"),
            "severity": item.get("severity", "MEDIUM"),
            "timestamp": item.get("published_at") or item.get("timestamp"),
            "published_at": item.get("published_at") or item.get("timestamp"),
            "extracted_location": item.get("extracted_location"),
            "location_name": item.get("extracted_location") or item.get("location_name"),
            "location_evidence": item.get("location_evidence"),
            "administrative_area": item.get("administrative_area"),
            "latitude": lat,
            "longitude": lon,
            "geolocation_status": item.get("geolocation_status", "UNRESOLVED"),
            "geolocation_source": item.get("geolocation_source"),
            "geolocation_matched_name": item.get("geolocation_matched_name"),
            "processing_status": item.get("processing_status", "PENDING"),
            "processed_at": item.get("processed_at"),
            "retry_count": item.get("retry_count", 0),
            "error_message": item.get("error_message"),
            "analysis_result": analysis,
        })

    return jsonify({
        "success": True,
        "count": len(news_list),
        "news": news_list,
        "data": news_list,
    }), 200


@news_bp.route("/api/news/ingest", methods=["POST"])
def trigger_ingestion():
    """Explicitly trigger news ingestion and pending article processing.

    Separated from reads and frontend dashboard refreshes.
    """
    try:
        results = run_full_pipeline()
        return jsonify({
            "success": True,
            "message": "Ingestion and processing completed successfully.",
            "data": results,
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Ingestion error: {str(e)}",
        }), 500


@news_bp.route("/api/news/stats", methods=["GET"])
def get_stats():
    """Retrieve operational visibility metrics.

    Exposes genuine persisted counters for articles fetched, discovered, skipped,
    LLM requests made, geocoding stats, and status breakdowns.
    """
    metrics = get_operational_metrics()
    return jsonify({
        "success": True,
        "metrics": metrics,
        "data": metrics,
    }), 200
