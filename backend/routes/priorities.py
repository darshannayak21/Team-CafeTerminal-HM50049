"""Priorities & Human Impact Assessment API Route.

Calculates real-time population exposure, settlement impact, and isolated
population metrics for Pune District disaster command:
    settlement_impact = hazard_score * population
Identifies cut-off communities when access routes are severed.
"""

import json
import math
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List
from shapely.geometry import shape, Point

from flask import Blueprint, jsonify, request

from backend.config import Config
from backend.models.schemas import HazardInput, Location, Settlement
from backend.services.hazard_engine import calculate_hazard_score
from backend.services.settlement_service import load_settlements_from_file
from backend.routes.elevation import processor as elevation_processor
from backend.routes.rainfall import STATIONS

priorities_bp = Blueprint("priorities", __name__)

# Active dispatched missions stored in memory (resilient across requests, starts empty for demo)
ACTIVE_DISPATCHES: List[Dict[str, Any]] = []

# Road network connectivity and status definition (starts empty for clean demo)
ROAD_NETWORK: List[Dict[str, Any]] = []

# Baseline terrain and rainfall susceptibility profiles for Pune talukas
TALUKA_PROFILES: Dict[str, Dict[str, float]] = {
    "Mulshi": {"rainfall_1h": 38.5, "rainfall_24h": 92.4, "rainfall_72h": 184.0, "terrain": 0.88, "historical": 0.90},
    "Bhor": {"rainfall_1h": 28.0, "rainfall_24h": 75.0, "rainfall_72h": 142.0, "terrain": 0.82, "historical": 0.78},
    "Haveli": {"rainfall_1h": 22.4, "rainfall_24h": 58.0, "rainfall_72h": 110.0, "terrain": 0.65, "historical": 0.85},
    "Maval": {"rainfall_1h": 25.0, "rainfall_24h": 62.0, "rainfall_72h": 125.0, "terrain": 0.74, "historical": 0.70},
    "Pune City": {"rainfall_1h": 18.0, "rainfall_24h": 45.0, "rainfall_72h": 90.0, "terrain": 0.55, "historical": 0.80},
    "Velhe": {"rainfall_1h": 32.0, "rainfall_24h": 85.0, "rainfall_72h": 165.0, "terrain": 0.85, "historical": 0.75},
    "Ambegaon": {"rainfall_1h": 14.0, "rainfall_24h": 38.0, "rainfall_72h": 72.0, "terrain": 0.58, "historical": 0.45},
    "Junnar": {"rainfall_1h": 16.0, "rainfall_24h": 40.0, "rainfall_72h": 80.0, "terrain": 0.62, "historical": 0.50},
    "Khed": {"rainfall_1h": 15.0, "rainfall_24h": 36.0, "rainfall_72h": 70.0, "terrain": 0.52, "historical": 0.40},
    "Purandar": {"rainfall_1h": 12.0, "rainfall_24h": 28.0, "rainfall_72h": 55.0, "terrain": 0.48, "historical": 0.35},
    "Shirur": {"rainfall_1h": 8.0, "rainfall_24h": 20.0, "rainfall_72h": 40.0, "terrain": 0.32, "historical": 0.25},
    "Baramati": {"rainfall_1h": 6.0, "rainfall_24h": 16.0, "rainfall_72h": 35.0, "terrain": 0.28, "historical": 0.20},
    "Daund": {"rainfall_1h": 5.0, "rainfall_24h": 14.0, "rainfall_72h": 30.0, "terrain": 0.25, "historical": 0.18},
    "Indapur": {"rainfall_1h": 4.0, "rainfall_24h": 12.0, "rainfall_72h": 25.0, "terrain": 0.22, "historical": 0.15},
}


def _get_settlements_path() -> str:
    """Find settlements JSON file in workspace."""
    candidates = [
        os.path.join(Config.BASE_DIR, "..", "data", "processed", "pune_settlements.json"),
        os.path.join(Config.BASE_DIR, "..", "frontend", "public", "data", "pune_settlements.json"),
        os.path.join("data", "processed", "pune_settlements.json"),
    ]
    for path in candidates:
        norm = os.path.normpath(path)
        if os.path.exists(norm):
            return norm
    raise FileNotFoundError("Could not find pune_settlements.json")


def compute_live_settlements_priorities() -> Dict[str, Any]:
    """Compute live multi-factor hazard scores, affected population, and road isolation status from real data."""
    settlements_file = _get_settlements_path()
    with open(settlements_file, "r", encoding="utf-8") as f:
        raw_settlements_data = json.load(f).get("settlements", [])

    settlements = load_settlements_from_file(settlements_file)

    # Road blockages by settlement
    settlement_road_status: Dict[str, List[Dict[str, Any]]] = {}
    for r in ROAD_NETWORK:
        sid = r.get("settlement_id", "")
        settlement_road_status.setdefault(sid, []).append(r)

    # 1. Ingest actual ground reports from SQLite DB
    db_path = os.path.normpath(os.path.join(Config.BASE_DIR, "data", "rainguard.db"))
    reports: List[Any] = []
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute("SELECT id, incident_type, location_name, latitude, longitude, estimated_population_1km, analysis_result FROM reports")
            reports = c.fetchall()
            conn.close()
        except Exception as e:
            print(f"Error querying rainguard.db: {e}")

    # 2. Build spatial polygons for all 14 talukas
    taluka_shapes: Dict[str, Any] = {}
    for raw_s in raw_settlements_data:
        sid = raw_s.get("settlement_id", "")
        geom = raw_s.get("geometry")
        if sid and geom:
            try:
                taluka_shapes[sid] = shape(geom)
            except Exception:
                pass

    # 3. Spatially assign incidents to talukas
    taluka_reports: Dict[str, List[Any]] = {s.settlement_id: [] for s in settlements}
    for rep in reports:
        rep_lat = rep[3]
        rep_lng = rep[4]
        if rep_lat is not None and rep_lng is not None:
            pt = Point(rep_lng, rep_lat)
            matched_sid = None
            for sid, poly in taluka_shapes.items():
                if poly.contains(pt):
                    matched_sid = sid
                    break
            if not matched_sid and taluka_shapes:
                matched_sid = min(taluka_shapes.keys(), key=lambda k: pt.distance(taluka_shapes[k]))
            if matched_sid and matched_sid in taluka_reports:
                taluka_reports[matched_sid].append(rep)

    processed_list = []
    total_district_pop = 0
    total_exposed_pop = 0
    isolated_pop = 0
    isolated_settlements = []

    for s in settlements:
        total_district_pop += int(s.population)
        taluka_name = s.taluka or s.name

        # Real incident reports count & genuine localized WorldPop population
        incs = taluka_reports.get(s.settlement_id, [])
        inc_count = len(incs)
        at_risk_pop = sum(r[5] or 0.0 for r in incs)
        has_critical = any(
            "collapse" in (r[1] or "").lower() or "flood" in (r[1] or "").lower() or "block" in (r[1] or "").lower()
            for r in incs
        )

        # Real SRTM NASA elevation and terrain slope
        elev = 550
        slope = 2.0
        try:
            e_val = elevation_processor.get_elevation_at_coord(s.latitude, s.longitude)
            if e_val is not None:
                elev = e_val
            s_val = elevation_processor.calculate_slope(s.latitude, s.longitude)
            if s_val is not None:
                slope = s_val
        except Exception:
            pass

        # Real nearest AWS rainfall sensor from live cache
        nearest_station = None
        min_d = float("inf")
        live_data = None
        try:
            from backend.routes.rainfall import cache as r_cache
            live_data = r_cache.get("data")
        except Exception:
            pass

        station_pool = live_data if (live_data and isinstance(live_data, list)) else STATIONS
        for st in station_pool:
            st_lat = st.get("lat") or s.latitude
            st_lng = st.get("lng") or s.longitude
            d = math.hypot(st_lat - s.latitude, st_lng - s.longitude)
            if d < min_d:
                min_d = d
                nearest_station = st

        rain_1h = float(nearest_station.get("rain_1h", 0.0) or 0.0) if nearest_station else 0.0
        rain_24h = float(nearest_station.get("rain_24h", 0.0) or 0.0) if nearest_station else 0.0

        # Physical rainfall factor [0.0 - 1.0]:
        # Requires genuine intense precipitation to reach high hazard
        rain_factor = min(rain_1h / 40.0 + rain_24h / 120.0, 1.0)

        # Topographical vulnerability from NASA SRTM
        topo_vulnerability = 0.15
        if elev < 580 and slope < 3.0:
            topo_vulnerability = 0.35  # low-elevation alluvial pooling basin
        elif slope > 6.0:
            topo_vulnerability = 0.40  # steep mountain escarpment runoff
        elif elev > 700:
            topo_vulnerability = 0.25

        # Incident report activity
        inc_factor = min(inc_count * 0.10, 0.35)
        if has_critical:
            inc_factor += 0.08

        # Hydro proximity (dams/confluence)
        hydro_factor = 0.30 if taluka_name in ["Mulshi", "Pune City", "Haveli", "Bhor", "Maval"] else 0.10

        # Deterministic composite hazard score:
        # In the absence of actual precipitation (rain ~ 0), flood hazard CANNOT be HIGH.
        # It remains strictly in LOW (<0.32) or at most mild MODERATE watch if multiple reports exist.
        if rain_factor >= 0.20:
            # Active meteorological storm event: rainfall drives the alert
            raw_h = 0.50 * rain_factor + 0.25 * topo_vulnerability + 0.15 * inc_factor + 0.10 * hydro_factor
        else:
            # Dry / trace weather: reports are localized or uncorroborated, hazard remains low
            base_dry = 0.08 + (0.15 * topo_vulnerability) + (0.10 * hydro_factor) + (0.06 * min(inc_count, 3))
            raw_h = min(base_dry, 0.32)

        h_score = round(max(0.08, min(0.95, raw_h)), 2)

        # Categorical risk level:
        # HIGH requires h_score >= 0.50 (which requires actual rainfall)
        if h_score >= 0.70:
            risk_level = "CRITICAL"
        elif h_score >= 0.50:
            risk_level = "HIGH"
        elif h_score >= 0.30:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        # Genuine affected population (from real localized WorldPop impact buffers)
        affected_people = int(round(at_risk_pop))
        affected_hh = int(round(affected_people / 4.5)) if affected_people > 0 else 0

        # Check road isolation
        roads = settlement_road_status.get(s.settlement_id, [])
        blocked_roads = [r for r in roads if r["status"] == "CONFIRMED_BLOCKED"]

        is_isolated = False
        isolation_reason = None
        if len(roads) > 0 and len(blocked_roads) == len(roads):
            is_isolated = True
            isolation_reason = f"All {len(roads)} access roads confirmed blocked ({', '.join([r['name'] for r in blocked_roads])}). Requires boat/aerial extraction."
        elif len(blocked_roads) >= 1 and s.settlement_id in ("pune-mulshi", "pune-bhor"):
            is_isolated = True
            isolation_reason = f"Key arterial routes ({blocked_roads[0]['name']}) submerged. Road access impassable."

        if is_isolated:
            isolated_pop += affected_people
            isolated_settlements.append(s.name)

        total_exposed_pop += affected_people

        # Priority calculation
        base_priority = h_score * 0.6 + (0.35 if inc_count > 0 else 0.0)
        if is_isolated:
            base_priority += 0.25
        if risk_level in ("HIGH", "CRITICAL"):
            base_priority += 0.15

        priority_score = min(round(base_priority, 3), 1.0)

        # Check if already dispatched
        active_mission = next((m for m in ACTIVE_DISPATCHES if m.get("settlement_id") == s.settlement_id), None)

        evidence_list = []
        if inc_count > 0:
            evidence_list.append(f"{inc_count} active ground incident report{'s' if inc_count > 1 else ''} filed")
        if elev < 580 and slope < 3.0:
            evidence_list.append(f"Low-elevation riverine basin ({elev}m, slope {slope:.1f}°)")
        if hydro_factor >= 0.25:
            evidence_list.append("Proximate to major dam spillway / river confluence")

        processed_list.append({
            "settlement_id": s.settlement_id,
            "name": s.name,
            "taluka": s.taluka or s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "population": int(s.population),
            "total_population": int(s.population),
            "affected_population": affected_people,
            "affected_households": affected_hh,
            "incident_count": inc_count,
            "elevation_m": elev,
            "slope_deg": round(slope, 1),
            "hazard_score": round(h_score, 2),
            "risk_level": risk_level,
            "priority_score": priority_score,
            "is_isolated": is_isolated,
            "isolation_reason": isolation_reason,
            "evidence": evidence_list,
            "component_scores": {
                "incident_score": round(inc_factor, 3),
                "terrain_susceptibility": round(topo_vulnerability, 3),
                "hydro_proximity": round(hydro_factor, 3),
                "rainfall_1h": round(rain_factor, 3),
            },
            "rainfall_summary": {
                "rainfall_1h_mm": rain_1h,
                "rainfall_24h_mm": rain_24h,
                "rainfall_72h_mm": 0.0,
            },
            "roads_count": len(roads),
            "blocked_roads_count": len(blocked_roads),
            "active_mission": active_mission,
        })

    # Sort descending by priority_score, then incident count
    processed_list.sort(key=lambda x: (-x["priority_score"], -x["incident_count"], -x["hazard_score"]))
    for idx, item in enumerate(processed_list, start=1):
        item["rank"] = idx

    high_risk_count = sum(1 for item in processed_list if item["risk_level"] in ("HIGH", "CRITICAL"))

    summary = {
        "total_district_population": total_district_pop,
        "total_exposed_population": total_exposed_pop,
        "isolated_population": isolated_pop,
        "isolated_settlements": isolated_settlements,
        "isolated_settlements_count": len(isolated_settlements),
        "high_risk_settlements_count": high_risk_count,
        "active_dispatches_count": len(ACTIVE_DISPATCHES),
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }

    return {"summary": summary, "priorities": processed_list}


@priorities_bp.route("/api/impact/summary", methods=["GET"])
def get_impact_summary():
    """Retrieve district-level human impact KPIs and exposed population."""
    try:
        data = compute_live_settlements_priorities()
        return jsonify({"success": True, "data": data["summary"]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@priorities_bp.route("/api/priorities/live", methods=["GET"])
def get_live_priorities():
    """Retrieve prioritized settlement list with affected population and road access."""
    try:
        data = compute_live_settlements_priorities()
        return jsonify({
            "success": True,
            "summary": data["summary"],
            "data": data["priorities"],
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@priorities_bp.route("/api/roads/status", methods=["GET"])
def get_roads_status():
    """Retrieve live road accessibility and disruption status across Pune."""
    return jsonify({
        "success": True,
        "count": len(ROAD_NETWORK),
        "data": ROAD_NETWORK,
    })


@priorities_bp.route("/api/priorities/dispatch", methods=["POST"])
def dispatch_unit():
    """Dispatch a response unit to an affected settlement."""
    payload = request.get_json(silent=True) or {}
    settlement_id = payload.get("settlement_id")
    unit_id = payload.get("unit_id", "SDRF-02")
    unit_name = payload.get("unit_name", f"Rescue Unit {unit_id}")

    if not settlement_id:
        return jsonify({"success": False, "error": "settlement_id is required"}), 400

    # Check if already active
    existing = next((m for m in ACTIVE_DISPATCHES if m["settlement_id"] == settlement_id), None)
    if existing:
        return jsonify({"success": True, "message": "Mission already in progress", "dispatch": existing})

    new_dispatch = {
        "dispatch_id": f"DISP-{len(ACTIVE_DISPATCHES) + 1:03d}",
        "settlement_id": settlement_id,
        "settlement_name": payload.get("settlement_name", settlement_id),
        "taluka": payload.get("taluka", "Pune"),
        "unit_id": unit_id,
        "unit_name": unit_name,
        "affected_population": payload.get("affected_population", 0),
        "status": "DISPATCHED",
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "notes": payload.get("notes", "Dispatched from Pune Central Command"),
    }
    ACTIVE_DISPATCHES.append(new_dispatch)
    return jsonify({"success": True, "dispatch": new_dispatch})
