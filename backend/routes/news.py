"""News Feed API blueprint."""

from flask import Blueprint, jsonify
from backend.services.db import get_all_news

news_bp = Blueprint("news", __name__)


@news_bp.route("/api/news", methods=["GET"])
def list_news():
    """Retrieve news feed items."""
    news_items = get_all_news()
    return jsonify({
        "success": True,
        "count": len(news_items),
        "news": news_items,
        "data": news_items,
    }), 200
