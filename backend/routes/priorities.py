"""Priorities & Human Impact Assessment API Route.

Calculates real-time population exposure, settlement impact, and isolated
population metrics for Pune District disaster command:
    settlement_impact = hazard_score * population
Identifies cut-off communities when access routes are severed.
"""

import json
import math
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from flask import Blueprint, jsonify, request

from backend.config import Config
from backend.models.schemas import HazardInput, Location, Settlement
from backend.services.hazard_engine import calculate_hazard_score
from backend.services.settlement_service import load_settlements_from_file

priorities_bp = Blueprint("priorities", __name__)

# Active dispatched missions stored in memory (resilient across requests)
ACTIVE_DISPATCHES: List[Dict[str, Any]] = [
    {
        "dispatch_id": "DISP-001",
        "settlement_id": "pune-mulshi",
        "settlement_name": "Mulshi (Paud Settlement)",
        "taluka": "Mulshi",
        "unit_id": "SDRF-04",
        "unit_name": "SDRF Unit 04 — Alpha Squad",
        "affected_population": 18400,
        "status": "EN_ROUTE",
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "notes": "Amphibious gear deployed. Main highway impassable; taking northern ridge detour.",
    }
]

# Road network connectivity and status definition
ROAD_NETWORK: List[Dict[str, Any]] = [
    {
        "id": "RD-PUNE-01",
        "name": "Mundhwa–Kharadi Riverside Road",
        "taluka": "Haveli",
        "settlement_id": "pune-haveli",
        "status": "AT_RISK",
        "severity": "HIGH",
        "risk_reason": "Riverbank elevation matching projected backwater inundation level.",
        "coordinates": [[18.528, 73.896], [18.536, 73.908], [18.545, 73.915]],
    },
    {
        "id": "RD-PUNE-02",
        "name": "Yerawada Access Causeway",
        "taluka": "Haveli",
        "settlement_id": "pune-haveli",
        "status": "CONFIRMED_BLOCKED",
        "severity": "CRITICAL",
        "risk_reason": "Causeway deck submerged under 0.7m overflow; barrier placed.",
        "coordinates": [[18.521, 73.875], [18.515, 73.882]],
    },
    {
        "id": "RD-PUNE-03",
        "name": "Sinhagad Lower Valley Route",
        "taluka": "Haveli",
        "settlement_id": "pune-haveli",
        "status": "AT_RISK",
        "severity": "HIGH",
        "risk_reason": "Adjacent to dam spillway discharge channel.",
        "coordinates": [[18.450, 73.762], [18.442, 73.775], [18.432, 73.785]],
    },
    {
        "id": "RD-PUNE-04",
        "name": "Paud–Mulshi Valley Road (SH-114)",
        "taluka": "Mulshi",
        "settlement_id": "pune-mulshi",
        "status": "CONFIRMED_BLOCKED",
        "severity": "CRITICAL",
        "risk_reason": "Culvert washed out at km 4.2; roadway impassable for civilian vehicles.",
        "coordinates": [[18.540, 73.510], [18.528, 73.520], [18.518, 73.528]],
    },
    {
        "id": "RD-PUNE-05",
        "name": "Tamhini Ghat Spur Road",
        "taluka": "Mulshi",
        "settlement_id": "pune-mulshi",
        "status": "CONFIRMED_BLOCKED",
        "severity": "CRITICAL",
        "risk_reason": "Escarpment debris flow triggered by 95mm/24h orographic precipitation.",
        "coordinates": [[18.493, 73.508], [18.488, 73.516]],
    },
    {
        "id": "RD-PUNE-06",
        "name": "Talegaon–Maval Connector",
        "taluka": "Maval",
        "settlement_id": "pune-maval",
        "status": "MONITORING",
        "severity": "MODERATE",
        "risk_reason": "Intermittent waterlogging; operating below disruption threshold.",
        "coordinates": [[18.710, 73.718], [18.700, 73.732], [18.690, 73.748]],
    },
    {
        "id": "RD-PUNE-07",
        "name": "Bhor–Kapurhol Link Road",
        "taluka": "Bhor",
        "settlement_id": "pune-bhor",
        "status": "CONFIRMED_BLOCKED",
        "severity": "CRITICAL",
        "risk_reason": "Neera river bridge approach overflowed by 0.5m water.",
        "coordinates": [[18.150, 73.850], [18.140, 73.860]],
    },
]

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
    """Compute live multi-factor hazard scores, affected population, and road isolation status."""
    settlements_file = _get_settlements_path()
    settlements = load_settlements_from_file(settlements_file)

    # Road blockages by settlement
    settlement_road_status: Dict[str, List[Dict[str, Any]]] = {}
    for r in ROAD_NETWORK:
        sid = r.get("settlement_id", "")
        settlement_road_status.setdefault(sid, []).append(r)

    processed_list = []
    total_district_pop = 0
    total_exposed_pop = 0
    isolated_pop = 0
    isolated_settlements = []

    for s in settlements:
        total_district_pop += int(s.population)
        taluka_name = s.taluka or s.name
        profile = TALUKA_PROFILES.get(
            taluka_name,
            {"rainfall_1h": 12.0, "rainfall_24h": 35.0, "rainfall_72h": 70.0, "terrain": 0.50, "historical": 0.50},
        )

        hazard_input = HazardInput(
            location=Location(lat=s.latitude, lon=s.longitude),
            rainfall_1h=profile["rainfall_1h"],
            rainfall_24h=profile["rainfall_24h"],
            rainfall_72h=profile["rainfall_72h"],
            terrain_susceptibility=profile["terrain"],
            historical_flood_proximity=profile["historical"],
        )
        hazard_out = calculate_hazard_score(hazard_input)
        h_score = hazard_out.hazard_score

        # Population impact: affected population is scaled by hazard score
        affected_people = int(round(h_score * s.population))
        affected_hh = int(round(affected_people / 4.5))

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

        if h_score >= 0.30:  # Moderate, High, or Critical threshold
            total_exposed_pop += affected_people

        # Priority calculation: settlement impact + isolation penalty + high risk boost
        base_priority = h_score * (math.log10(max(s.population, 10)) / 7.0)
        if is_isolated:
            base_priority += 0.35  # High operational urgency for isolated humans
        if hazard_out.risk_level == "CRITICAL":
            base_priority += 0.20
        elif hazard_out.risk_level == "HIGH":
            base_priority += 0.10

        priority_score = min(round(base_priority, 3), 1.0)

        # Check if already dispatched
        active_mission = next((m for m in ACTIVE_DISPATCHES if m.get("settlement_id") == s.settlement_id), None)

        processed_list.append({
            "settlement_id": s.settlement_id,
            "name": s.name,
            "taluka": s.taluka or s.name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "population": int(s.population),
            "affected_population": affected_people,
            "affected_households": affected_hh,
            "hazard_score": round(h_score, 3),
            "risk_level": hazard_out.risk_level,
            "priority_score": priority_score,
            "is_isolated": is_isolated,
            "isolation_reason": isolation_reason,
            "evidence": hazard_out.evidence,
            "component_scores": {k: round(v, 3) for k, v in hazard_out.component_scores.items()},
            "rainfall_summary": {
                "rainfall_1h_mm": profile["rainfall_1h"],
                "rainfall_24h_mm": profile["rainfall_24h"],
                "rainfall_72h_mm": profile["rainfall_72h"],
            },
            "roads_count": len(roads),
            "blocked_roads_count": len(blocked_roads),
            "active_mission": active_mission,
        })

    # Sort descending by priority_score
    processed_list.sort(key=lambda x: (-x["priority_score"], -x["affected_population"]))
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
