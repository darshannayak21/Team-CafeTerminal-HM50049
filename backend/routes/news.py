"""News Feed API blueprint."""

from flask import Blueprint, jsonify
from backend.services.db import get_all_news
from backend.services.live_scraper import get_live_alerts

news_bp = Blueprint("news", __name__)


@news_bp.route("/api/news", methods=["GET"])
def list_news():
    """Retrieve news feed items, mixing DB mocked reports with live scraped alerts."""
    db_items = get_all_news()
    live_items = get_live_alerts()
    
    # We can format the db_items to match the UI if needed, but for now we append them
    # Ensure they have similar structure
    combined = []
    import re
    
    def strip_html(text):
        if not text:
            return ""
        return re.sub(r'<[^>]+>', '', str(text)).strip()
    
    for item in live_items:
        coords = item.get("coordinates", [18.5204, 73.8567])
        lat = coords[0] if coords and len(coords) > 0 else 18.5204
        lng = coords[1] if coords and len(coords) > 1 else 73.8567
        
        combined.append({
            "id": f"live_{abs(hash(item['title']))}",
            "title": strip_html(item["title"]),
            "description": strip_html(item.get("description", "")),
            "source": item["source"],
            "url": item["link"],
            "severity": item["severity"],
            "timestamp": item["published"],
            "latitude": lat,
            "longitude": lng
        })
        
    for item in db_items:
        combined.append({
            "id": item.get("id"),
            "title": strip_html(item.get("headline", item.get("title", ""))),
            "description": strip_html(item.get("description", "")),
            "source": item.get("source"),
            "url": item.get("url"),
            "severity": item.get("severity"),
            "timestamp": item.get("published_at", item.get("timestamp")),
            "latitude": item.get("latitude", 18.5204),
            "longitude": item.get("longitude", 73.8567)
        })

    combined = combined[:5]

    return jsonify({
        "success": True,
        "count": len(combined),
        "news": combined,
        "data": combined,
    }), 200
