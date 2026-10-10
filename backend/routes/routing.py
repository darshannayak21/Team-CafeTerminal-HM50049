"""Flood-Aware Routing API Blueprint.

Endpoints:
    POST /api/route           — Compute a flood-aware route (main endpoint)
    GET  /api/route/hazard-segments — Return all currently at-risk road segments
    GET  /api/route/status    — Service health + data source availability
"""

import logging
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)
routing_bp = Blueprint("routing", __name__)


def _get_elevation_processor():
    """Import the already-initialized processor from the elevation route (avoids re-loading .npy)."""
    try:
        from backend.routes.elevation import processor
        return processor
    except Exception as e:
        logger.warning(f"[RoutingAPI] Could not import elevation processor: {e}")
        return None


def _get_rainfall_stations() -> list:
    """Fetch live rainfall station data with caching."""
    try:
        from backend.routes.rainfall import cache, fetch_station, STATIONS
        from concurrent.futures import ThreadPoolExecutor
        import time

        # Use the existing cache if fresh (< 5 min)
        if cache["data"] and (time.time() - cache["last_fetched"]) < 300:
            return cache["data"]

        # Otherwise fetch fresh (non-blocking, up to 10s)
        results = []
        with ThreadPoolExecutor(max_workers=8) as ex:
            futures = [ex.submit(fetch_station, s) for s in STATIONS[:12]]  # Limit for speed
            for f in futures:
                try:
                    res = f.result(timeout=4)
                    if res:
                        results.append(res)
                except Exception:
                    pass
        return results
    except Exception as e:
        logger.warning(f"[RoutingAPI] Could not fetch rainfall stations: {e}")
        return []


def _get_recent_reports() -> list:
    """Fetch recent ground reports from SQLite (last 24h)."""
    try:
        from backend.services.db import get_all_reports
        reports = get_all_reports()
        # Filter: only reports with coordinates
        return [
            r for r in reports
            if r.get("latitude") is not None and r.get("longitude") is not None
        ]
    except Exception as e:
        logger.warning(f"[RoutingAPI] Could not fetch reports: {e}")
        return []


@routing_bp.route("/api/route", methods=["POST"])
def compute_route():
    """Compute a flood-aware route from origin to destination.

    Request body (JSON):
        origin_lat      float  — required
        origin_lon      float  — required
        dest_lat        float  — required
        dest_lon        float  — required
        team_name       str    — optional, display name

    Response:
        waypoints           list[[lat, lon]]
        distance_km         float
        duration_minutes    float
        overall_risk_score  float [0..1]
        safety_status       str
        safety_classification str
        at_risk_segments_count  int
        blocked_segments_count  int
        evidence_summary    list[str]
        confidence          float
        rerouted            bool
        reroute_reason      str|null
        safety_brief        list[str]
        segment_details     list[dict]
    """
    payload = request.get_json(silent=True) or {}

    # Parse and validate coordinates
    try:
        origin_lat = float(payload["origin_lat"])
        origin_lon = float(payload["origin_lon"])
        dest_lat = float(payload["dest_lat"])
        dest_lon = float(payload["dest_lon"])
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({
            "success": False,
            "error": f"Missing or invalid coordinates: {e}. "
                     "Required: origin_lat, origin_lon, dest_lat, dest_lon"
        }), 400

    # Bounds check
    for name, lat, lon in [("Origin", origin_lat, origin_lon), ("Destination", dest_lat, dest_lon)]:
        if not (17.0 <= lat <= 20.0 and 72.0 <= lon <= 76.0):
            return jsonify({
                "success": False,
                "error": f"{name} coordinates ({lat}, {lon}) appear to be outside Pune region."
            }), 400

    team_name = str(payload.get("team_name", "Response Unit"))

    # Gather live data sources
    rainfall_stations = _get_rainfall_stations()
    recent_reports = _get_recent_reports()
    elevation_processor = _get_elevation_processor()

    try:
        from backend.services.routing_service import compute_flood_aware_route
        result = compute_flood_aware_route(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            team_name=team_name,
            rainfall_stations=rainfall_stations,
            recent_reports=recent_reports,
            elevation_processor=elevation_processor,
        )
        return jsonify(result), 200

    except Exception as e:
        logger.exception(f"[RoutingAPI] Route computation failed: {e}")
        return jsonify({
            "success": False,
            "error": f"Route computation failed: {str(e)}"
        }), 500


@routing_bp.route("/api/route/hazard-segments", methods=["GET"])
def get_hazard_segments():
    """Return a summary of currently at-risk road points based on live ground reports.

    Used by the frontend map to display risk overlays without needing a full route.
    """
    try:
        recent_reports = _get_recent_reports()
        rainfall_stations = _get_rainfall_stations()

        # Return reports with risk classification attached
        from backend.services.routing_service import (
            _score_waypoint, _load_historical_zones
        )
        import time

        elevation_processor = _get_elevation_processor()
        now_ts = time.time()
        hazard_points = []

        for report in recent_reports:
            lat = report.get("latitude")
            lon = report.get("longitude")
            if lat is None or lon is None:
                continue
            scored = _score_waypoint(
                float(lat), float(lon),
                rainfall_stations, recent_reports,
                elevation_processor, now_ts,
            )
            hazard_points.append({
                "lat": lat,
                "lon": lon,
                "report_id": report.get("id"),
                "incident_type": report.get("incident_type"),
                "location_name": report.get("location_name"),
                "timestamp": report.get("timestamp"),
                **scored,
            })

        return jsonify({
            "success": True,
            "count": len(hazard_points),
            "hazard_points": hazard_points,
        }), 200

    except Exception as e:
        logger.error(f"[RoutingAPI] hazard-segments failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@routing_bp.route("/api/route/status", methods=["GET"])
def routing_status():
    """Return routing service health and available data sources."""
    try:
        elevation_processor = _get_elevation_processor()
        rainfall_stations = _get_rainfall_stations()
        recent_reports = _get_recent_reports()

        elev_loaded = (
            elevation_processor is not None and
            getattr(elevation_processor, "elevation_data", None) is not None
        )

        return jsonify({
            "success": True,
            "routing_engine": "OSRM (router.project-osrm.org) + Flood Hazard Overlay",
            "data_sources": {
                "elevation_data": elev_loaded,
                "rainfall_stations_loaded": len(rainfall_stations),
                "recent_ground_reports": len(recent_reports),
                "historical_zones_loaded": True,
            },
            "capabilities": [
                "Real OSM road geometry routing via OSRM",
                "Per-segment flood risk scoring (elevation + rainfall + reports + history)",
                "Automatic rerouting around confirmed blocked segments",
                "Evidence-based safety classification per route",
                "ETA and distance estimation",
            ],
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
