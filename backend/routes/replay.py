"""Historical Replay API blueprint."""

from flask import Blueprint, jsonify, request
import json
import os
import logging

logger = logging.getLogger(__name__)
replay_bp = Blueprint("replay", __name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "historical_events.json")

def load_events():
    if not os.path.exists(DATA_PATH):
        return {"events": []}
    with open(DATA_PATH, "r") as f:
        return json.load(f)

@replay_bp.route("/api/replay/events", methods=["GET"])
def get_events():
    """Retrieve all available historical events."""
    data = load_events()
    return jsonify({
        "success": True,
        "events": data.get("events", [])
    }), 200

@replay_bp.route("/api/replay/load", methods=["POST"])
def load_replay():
    """Load a specific historical event and apply its state."""
    data = request.json or {}
    event_id = data.get("event_id")
    if not event_id:
        return jsonify({"success": False, "error": "event_id is required"}), 400
        
    events_data = load_events()
    selected_event = next((e for e in events_data.get("events", []) if e["id"] == event_id), None)
    
    if not selected_event:
        return jsonify({"success": False, "error": "Event not found"}), 404
        
    # In a full implementation, loading a replay would update the global / scenario state
    # so that /api/priorities/live and other endpoints return this replayed data instead.
    # For now, we return it to the frontend so the frontend can enter "Replay Mode".
    
    return jsonify({
        "success": True,
        "message": f"Successfully loaded replay: {selected_event['name']}",
        "event": selected_event,
        "is_replay_mode": True
    }), 200
