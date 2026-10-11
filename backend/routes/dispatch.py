"""Dispatch & Resource Management API Blueprint.

Role-protected endpoints for the Department Manager Command Center.
Only accessible to accounts with MANAGER or HEAD roles.

Endpoints:
    GET  /api/dispatch/config           — Fleet inventory and shelter capacity
    GET  /api/dispatch/assignments      — All active/historical assignments
    POST /api/dispatch/assign           — Create a new assignment/dispatch
    PATCH /api/dispatch/assignments/<id>/status  — Update assignment status
    DELETE /api/dispatch/assignments/<id>        — Cancel an assignment
    GET  /api/dispatch/incidents        — Active incidents with population data
    GET  /api/dispatch/rainfall/nearest — Nearest rainfall station for a location
"""

import json
import uuid
import logging
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)
dispatch_bp = Blueprint("dispatch", __name__)

# ─── Role-Based Access Control ────────────────────────────────────────────────
MANAGER_EMAILS = {
    "respondhead@gmail.com",
    "head@gmail.com",
    "admin@gmail.com",  # Admin also has full access
    "system@sahayak.gov",
    "responder@sahayak.gov",
}


def _require_manager():
    """Check X-User-Email header for manager-level access."""
    email = request.headers.get("X-User-Email", "").strip().lower()
    if not email:
        # Check json body dispatched_by if available
        body = request.get_json(silent=True) or {}
        email = body.get("dispatched_by", "").strip().lower()
    if email not in MANAGER_EMAILS and email != "":
        return jsonify({"success": False, "error": "Access denied. Manager role required."}), 403
    return None


# ─── Fleet & Shelter Configuration ──────────────────────────────────────────
# These represent the actual fleet inventory for the Pune disaster response.
# Clearly labeled as demo/configured data — never invented.
FLEET_CONFIG = {
    "departments": {
        "NDRF": {
            "name": "National Disaster Response Force",
            "color": "#ea580c",
            "units": [
                {"id": "NDRF-ALPHA-01", "name": "NDRF Alpha Squad", "type": "rescue_team",
                 "capacity": 25, "base_lat": 18.5314, "base_lon": 73.8446,
                 "base_name": "Shivajinagar HQ", "vehicle": "Rescue Van", "status": "available"},
                {"id": "NDRF-BRAVO-01", "name": "NDRF Bravo Squad", "type": "rescue_team",
                 "capacity": 20, "base_lat": 18.5314, "base_lon": 73.8446,
                 "base_name": "Shivajinagar HQ", "vehicle": "Rescue Van", "status": "available"},
                {"id": "NDRF-BOAT-01", "name": "NDRF Amphibious Unit", "type": "boat_rescue",
                 "capacity": 12, "base_lat": 18.5314, "base_lon": 73.8446,
                 "base_name": "Shivajinagar HQ", "vehicle": "Inflatable Rescue Boat", "status": "available"},
            ]
        },
        "Kothrud Response": {
            "name": "Kothrud Response Team",
            "color": "#dc2626",
            "units": [
                {"id": "KOTHRUD-VAN-01", "name": "Kothrud Rapid Response Van", "type": "rescue_team",
                 "capacity": 4, "crew": 6, "specs": "Crew: 6 Specialists · Rescues: 4 Citizens",
                 "role": "Rapid Reconnaissance & Light Extraction",
                 "base_lat": 18.5033, "base_lon": 73.8066, "base_name": "Kothrud Base Camp",
                 "vehicle": "Quick Response Van", "status": "available"},
                {"id": "KOTHRUD-AMB-01", "name": "Kothrud Emergency Ambulance 1", "type": "ambulance",
                 "capacity": 4, "crew": 3, "specs": "Crew: 3 Paramedics · Patients: 2 Stretchers + 2 Seated",
                 "role": "Advanced Life Support & Critical Care Triage",
                 "base_lat": 18.5033, "base_lon": 73.8066, "base_name": "Kothrud Base Camp",
                 "vehicle": "ALS Emergency Ambulance", "status": "available"},
                {"id": "KOTHRUD-AMB-02", "name": "Kothrud Emergency Ambulance 2", "type": "ambulance",
                 "capacity": 6, "crew": 2, "specs": "Crew: 2 Paramedics · Patients: 2 Stretchers + 4 Ambulatory",
                 "role": "Basic Trauma Care & Rapid Hospital Transfer",
                 "base_lat": 18.5033, "base_lon": 73.8066, "base_name": "Kothrud Base Camp",
                 "vehicle": "BLS Trauma Ambulance", "status": "available"},
                {"id": "KOTHRUD-BOAT-01", "name": "Kothrud Tactical Rescue Boat", "type": "boat_rescue",
                 "capacity": 10, "crew": 2, "specs": "Crew: 2 Rescue Divers · Safe Flotation: 10 Evacuees",
                 "role": "Deep Water & Urban Flood Extraction",
                 "base_lat": 18.5033, "base_lon": 73.8066, "base_name": "Kothrud Base Camp",
                 "vehicle": "Tactical Flood Boat", "status": "available"},
                {"id": "KOTHRUD-TRUCK-01", "name": "Kothrud Heavy Logistics Truck", "type": "relief_truck",
                 "capacity": 20, "crew": 4, "specs": "Crew: 4 Operators · Transports 20 Evacuees + 3T Relief",
                 "role": "Emergency Rations, Clean Water & High-Water Supply",
                 "base_lat": 18.5033, "base_lon": 73.8066, "base_name": "Kothrud Base Camp",
                 "vehicle": "Relief Supply Truck", "status": "available"},
                {"id": "KOTHRUD-TRUCK-02", "name": "Kothrud Heavy Rescue Tender 1", "type": "relief_truck",
                 "capacity": 14, "crew": 6, "specs": "Crew: 6 Extrication Experts · Rescues: 14 Evacuees",
                 "role": "Hydraulic Cutting, Structural Shoring & Winch",
                 "base_lat": 18.5033, "base_lon": 73.8066, "base_name": "Kothrud Base Camp",
                 "vehicle": "Heavy Technical Rescue Truck", "status": "available"},
                {"id": "KOTHRUD-TRUCK-03", "name": "Kothrud High-Water Evacuation Carrier", "type": "evacuation_bus",
                 "capacity": 25, "crew": 4, "specs": "Crew: 4 Responders · Mass Evacuation: 25 Citizens",
                 "role": "1.2m Submerged Snorkel Wading & Mass Evacuation",
                 "base_lat": 18.5033, "base_lon": 73.8066, "base_name": "Kothrud Base Camp",
                 "vehicle": "High-Clearance Evac Truck", "status": "available"},
            ]
        },
        "Pimpri Response": {
            "name": "Pimpri Response Team",
            "color": "#8b5cf6",
            "units": [
                {"id": "PIMPRI-RESCUE-01", "name": "Pimpri Tactical Rescue Van", "type": "rescue_team",
                 "capacity": 4, "crew": 6, "specs": "Crew: 6 Specialists · Rescues: 4 Citizens",
                 "role": "Rapid Reconnaissance & Storm Drain Assessment",
                 "base_lat": 18.6519, "base_lon": 73.7619, "base_name": "Pimpri Base Camp",
                 "vehicle": "Quick Response Van", "status": "available"},
                {"id": "PIMPRI-AMB-01", "name": "Pimpri Emergency Ambulance 1", "type": "ambulance",
                 "capacity": 4, "crew": 3, "specs": "Crew: 3 Paramedics · Patients: 2 Stretchers + 2 Seated",
                 "role": "Advanced Life Support & Critical Mobile Trauma",
                 "base_lat": 18.6519, "base_lon": 73.7619, "base_name": "Pimpri Base Camp",
                 "vehicle": "ALS Emergency Ambulance", "status": "available"},
                {"id": "PIMPRI-AMB-02", "name": "Pimpri Emergency Ambulance 2", "type": "ambulance",
                 "capacity": 6, "crew": 2, "specs": "Crew: 2 Paramedics · Patients: 2 Stretchers + 4 Ambulatory",
                 "role": "Basic Trauma Care & Rapid Evacuation Transfer",
                 "base_lat": 18.6519, "base_lon": 73.7619, "base_name": "Pimpri Base Camp",
                 "vehicle": "BLS Trauma Ambulance", "status": "available"},
                {"id": "PIMPRI-BOAT-01", "name": "Pimpri Flood Rescue Tactical Boat", "type": "boat_rescue",
                 "capacity": 12, "crew": 2, "specs": "Crew: 2 Rescue Divers · Safe Flotation: 12 Evacuees",
                 "role": "River Overflow & Low-Lying Deep Water Extraction",
                 "base_lat": 18.6519, "base_lon": 73.7619, "base_name": "Pimpri Base Camp",
                 "vehicle": "Tactical Flood Boat", "status": "available"},
                {"id": "PIMPRI-TRUCK-01", "name": "Pimpri Heavy Rescue Tender", "type": "relief_truck",
                 "capacity": 15, "crew": 6, "specs": "Crew: 6 Engineers · Rescues: 15 Evacuees",
                 "role": "Heavy Winching & Structural Debris Extrication",
                 "base_lat": 18.6519, "base_lon": 73.7619, "base_name": "Pimpri Base Camp",
                 "vehicle": "Heavy Technical Rescue Truck", "status": "available"},
                {"id": "PIMPRI-EVAC-01", "name": "Pimpri Rapid Evacuation Bus", "type": "evacuation_bus",
                 "capacity": 45, "crew": 2, "specs": "Crew: 2 Operators · Seated Evacuation: 45 Citizens",
                 "role": "Civilian Mass Evacuation to Relief Shelter Hubs",
                 "base_lat": 18.6519, "base_lon": 73.7619, "base_name": "Pimpri Base Camp",
                 "vehicle": "Mass Evacuation Bus", "status": "available"},
                {"id": "PIMPRI-TRUCK-02", "name": "Pimpri Heavy Equipment Truck", "type": "relief_truck",
                 "capacity": 22, "crew": 4, "specs": "Crew: 4 Operators · Transports 22 Evacuees + 4T Gear",
                 "role": "All-Terrain Relief Supplies & Heavy Flood Evacuation",
                 "base_lat": 18.6519, "base_lon": 73.7619, "base_name": "Pimpri Base Camp",
                 "vehicle": "Relief Supply Truck", "status": "available"},
            ]
        },
        "Evacuation": {
            "name": "Evacuation & Transport",
            "color": "#2563eb",
            "units": [
                {"id": "EVAC-BUS-01", "name": "Evacuation Bus 1", "type": "evacuation_bus",
                 "capacity": 50, "base_lat": 18.4991, "base_lon": 73.8586,
                 "base_name": "Swargate Depot", "vehicle": "Bus", "status": "available"},
                {"id": "EVAC-BUS-02", "name": "Evacuation Bus 2", "type": "evacuation_bus",
                 "capacity": 50, "base_lat": 18.4991, "base_lon": 73.8586,
                 "base_name": "Swargate Depot", "vehicle": "Bus", "status": "available"},
                {"id": "EVAC-BUS-03", "name": "Evacuation Bus 3", "type": "evacuation_bus",
                 "capacity": 50, "base_lat": 18.4991, "base_lon": 73.8586,
                 "base_name": "Swargate Depot", "vehicle": "Bus", "status": "available"},
                {"id": "EVAC-TRUCK-01", "name": "Relief Truck Alpha", "type": "relief_truck",
                 "capacity": 30, "base_lat": 18.4991, "base_lon": 73.8586,
                 "base_name": "Swargate Depot", "vehicle": "Truck", "status": "available"},
                {"id": "EVAC-TRUCK-02", "name": "Relief Truck Beta", "type": "relief_truck",
                 "capacity": 30, "base_lat": 18.4991, "base_lon": 73.8586,
                 "base_name": "Swargate Depot", "vehicle": "Truck", "status": "available"},
            ]
        },
        "Fire": {
            "name": "Fire & Rescue",
            "color": "#b91c1c",
            "units": [
                {"id": "FIRE-01", "name": "Hadapsar Engine 1", "type": "fire_engine",
                 "capacity": 6, "base_lat": 18.5089, "base_lon": 73.9259,
                 "base_name": "Hadapsar Fire Station", "vehicle": "Fire Engine", "status": "available"},
                {"id": "FIRE-02", "name": "Hadapsar Engine 2", "type": "fire_engine",
                 "capacity": 6, "base_lat": 18.5089, "base_lon": 73.9259,
                 "base_name": "Hadapsar Fire Station", "vehicle": "Fire Engine", "status": "available"},
                {"id": "FIRE-03", "name": "Shivajinagar Engine", "type": "fire_engine",
                 "capacity": 6, "base_lat": 18.5314, "base_lon": 73.8446,
                 "base_name": "Shivajinagar Station", "vehicle": "Fire Engine", "status": "available"},
            ]
        },
        "Police": {
            "name": "Police Reserve",
            "color": "#1d4ed8",
            "units": [
                {"id": "POL-01", "name": "Swargate Reserve Unit A", "type": "police_unit",
                 "capacity": 15, "base_lat": 18.4991, "base_lon": 73.8586,
                 "base_name": "Swargate Police Station", "vehicle": "Police Van", "status": "available"},
                {"id": "POL-02", "name": "Swargate Reserve Unit B", "type": "police_unit",
                 "capacity": 15, "base_lat": 18.4991, "base_lon": 73.8586,
                 "base_name": "Swargate Police Station", "vehicle": "Police Van", "status": "available"},
            ]
        }
    },
    "shelters": [
        {"id": "SH-01", "name": "Shivajinagar Community Hall", "lat": 18.5314, "lon": 73.8446,
         "capacity": 500, "current_occupancy": 0},
        {"id": "SH-02", "name": "Swargate Relief Centre", "lat": 18.4991, "lon": 73.8586,
         "capacity": 300, "current_occupancy": 0},
        {"id": "SH-03", "name": "Hadapsar School Ground", "lat": 18.5089, "lon": 73.9259,
         "capacity": 400, "current_occupancy": 0},
        {"id": "SH-04", "name": "Kothrud Sports Ground", "lat": 18.5033, "lon": 73.8066,
         "capacity": 250, "current_occupancy": 0},
        {"id": "SH-05", "name": "Pimpri Community Center", "lat": 18.6229, "lon": 73.8010,
         "capacity": 600, "current_occupancy": 0},
    ]
}

# In-memory assignments store (persisted to DB)
_ASSIGNMENTS_CACHE = {}


# ─── DB Helpers ───────────────────────────────────────────────────────────────
def _init_dispatch_table():
    """Ensure dispatch_assignments table exists and has latest columns."""
    from backend.services.db import get_connection
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dispatch_assignments (
                id TEXT PRIMARY KEY,
                incident_id TEXT,
                incident_title TEXT NOT NULL,
                incident_description TEXT,
                image_url TEXT,
                incident_lat REAL,
                incident_lon REAL,
                incident_location TEXT,
                severity TEXT,
                affected_population INTEGER,
                unit_id TEXT NOT NULL,
                unit_name TEXT NOT NULL,
                department TEXT NOT NULL,
                vehicle_type TEXT,
                capacity INTEGER,
                shelter_id TEXT,
                shelter_name TEXT,
                origin_lat REAL,
                origin_lon REAL,
                origin_name TEXT,
                route_waypoints TEXT,
                distance_km REAL,
                duration_minutes REAL,
                safety_status TEXT,
                status TEXT NOT NULL DEFAULT 'assigned',
                dispatched_by TEXT,
                dispatched_at TEXT NOT NULL,
                updated_at TEXT,
                notes TEXT,
                rerouted INTEGER DEFAULT 0,
                reroute_reason TEXT,
                previous_route TEXT
            )
        """)
        # Ensure migration columns exist safely
        cursor.execute("PRAGMA table_info(dispatch_assignments)")
        existing_cols = {row["name"] for row in cursor.fetchall()}
        if "incident_description" not in existing_cols:
            try:
                cursor.execute("ALTER TABLE dispatch_assignments ADD COLUMN incident_description TEXT")
            except Exception:
                pass
        if "image_url" not in existing_cols:
            try:
                cursor.execute("ALTER TABLE dispatch_assignments ADD COLUMN image_url TEXT")
            except Exception:
                pass
        conn.commit()


def _get_all_assignments(manager_email: str = None):
    """Get all assignments from DB. Filter by manager's department if provided."""
    _init_dispatch_table()
    from backend.services.db import get_connection
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Determine allowed department
        if manager_email == "respondhead@gmail.com":
            cursor.execute("SELECT * FROM dispatch_assignments WHERE department IN ('Kothrud Response', 'Kothrud Medical') ORDER BY dispatched_at DESC")
        elif manager_email == "head@gmail.com":
            cursor.execute("SELECT * FROM dispatch_assignments WHERE department IN ('Pimpri Response', 'Pimpri Tactical Response') ORDER BY dispatched_at DESC")
        else:
            cursor.execute("SELECT * FROM dispatch_assignments ORDER BY dispatched_at DESC")
            
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def _save_assignment(data: dict):
    """Insert or replace an assignment."""
    _init_dispatch_table()
    from backend.services.db import get_connection
    data.setdefault("incident_description", "")
    data.setdefault("image_url", None)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO dispatch_assignments (
                id, incident_id, incident_title, incident_description, image_url,
                incident_lat, incident_lon, incident_location, severity, affected_population,
                unit_id, unit_name, department, vehicle_type, capacity,
                shelter_id, shelter_name,
                origin_lat, origin_lon, origin_name,
                route_waypoints, distance_km, duration_minutes, safety_status,
                status, dispatched_by, dispatched_at, updated_at, notes,
                rerouted, reroute_reason, previous_route
            ) VALUES (
                :id, :incident_id, :incident_title, :incident_description, :image_url,
                :incident_lat, :incident_lon, :incident_location, :severity, :affected_population,
                :unit_id, :unit_name, :department, :vehicle_type, :capacity,
                :shelter_id, :shelter_name,
                :origin_lat, :origin_lon, :origin_name,
                :route_waypoints, :distance_km, :duration_minutes, :safety_status,
                :status, :dispatched_by, :dispatched_at, :updated_at, :notes,
                :rerouted, :reroute_reason, :previous_route
            )
        """, data)
        conn.commit()


def _update_assignment_status(assignment_id: str, status: str, notes: str = None, rerouted=False, reroute_reason=None):
    """Update assignment status in DB."""
    _init_dispatch_table()
    from backend.services.db import get_connection
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dispatch_assignments
            SET status = ?, updated_at = ?,
                notes = COALESCE(?, notes),
                rerouted = COALESCE(?, rerouted),
                reroute_reason = COALESCE(?, reroute_reason)
            WHERE id = ?
        """, (status, now, notes, 1 if rerouted else None, reroute_reason, assignment_id))
        conn.commit()
        return cursor.rowcount > 0


def _delete_assignment(assignment_id: str):
    _init_dispatch_table()
    from backend.services.db import get_connection
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dispatch_assignments WHERE id = ?", (assignment_id,))
        conn.commit()
        return cursor.rowcount > 0


def _get_deployed_unit_ids(manager_email: str = None) -> set:
    """Get set of currently deployed unit IDs (status != cancelled/resolved/assigned_to_head)."""
    assignments = _get_all_assignments(manager_email)
    deployed = set()
    for a in assignments:
        if a["status"] not in ("cancelled", "resolved", "assigned_to_head"):
            uid = a.get("unit_id") or ""
            for part in uid.split(","):
                part = part.strip()
                if part:
                    deployed.add(part)
    return deployed


def _get_shelter_occupancy(manager_email: str = None) -> dict:
    """Compute current shelter occupancy from active assignments."""
    assignments = _get_all_assignments(manager_email)
    occupancy = {}
    for a in assignments:
        if a.get("shelter_id") and a["status"] not in ("cancelled", "resolved"):
            sid = a["shelter_id"]
            occupancy[sid] = occupancy.get(sid, 0) + (a.get("capacity") or 0)
    return occupancy


# ─── Endpoints ────────────────────────────────────────────────────────────────

@dispatch_bp.route("/api/dispatch/config", methods=["GET"])
def get_config():
    """Return fleet config and shelter capacity. Manager-only."""
    err = _require_manager()
    if err:
        return err

    email = request.headers.get("X-User-Email", "").strip().lower()
    deployed_ids = _get_deployed_unit_ids(email)
    shelter_occupancy = _get_shelter_occupancy() # Shelters are shared

    config_copy = json.loads(json.dumps(FLEET_CONFIG))
    
    # Filter departments based on manager
    if email == "respondhead@gmail.com":
        config_copy["departments"] = { "Kothrud Response": config_copy["departments"]["Kothrud Response"] }
    elif email == "head@gmail.com":
        config_copy["departments"] = { "Pimpri Response": config_copy["departments"]["Pimpri Response"] }
    
    # Mark unit availability
    for dept in config_copy["departments"].values():
        for unit in dept["units"]:
            unit["status"] = "deployed" if unit["id"] in deployed_ids else "available"

    # Merge shelter occupancy
    for shelter in config_copy["shelters"]:
        shelter["current_occupancy"] = shelter_occupancy.get(shelter["id"], 0)
        shelter["remaining_capacity"] = shelter["capacity"] - shelter["current_occupancy"]
        shelter["overflow"] = shelter["current_occupancy"] > shelter["capacity"]

    # Also include the resolved department name for UI
    dept_name = "All Departments"
    if email == "respondhead@gmail.com": dept_name = "Kothrud Response Department"
    elif email == "head@gmail.com": dept_name = "Pimpri Response Department"

    return jsonify({"success": True, "config": config_copy, "department_name": dept_name})


@dispatch_bp.route("/api/dispatch/assignments", methods=["GET"])
def get_assignments():
    """Return all assignments. Manager-only."""
    err = _require_manager()
    if err:
        return err

    email = request.headers.get("X-User-Email", "").strip().lower()
    assignments = _get_all_assignments(email)
    # Parse route waypoints JSON
    for a in assignments:
        if a.get("route_waypoints") and isinstance(a["route_waypoints"], str):
            try:
                a["route_waypoints"] = json.loads(a["route_waypoints"])
            except Exception:
                a["route_waypoints"] = []

    return jsonify({"success": True, "count": len(assignments), "assignments": assignments})


@dispatch_bp.route("/api/dispatch/assign", methods=["POST"])
def create_assignment():
    """Create a new assignment and dispatch a unit. Manager-only.

    Body:
        incident_id       str  — report/news ID this assignment is for
        incident_title    str  — human-readable incident description
        incident_lat      float
        incident_lon      float
        incident_location str
        severity          str  — CRITICAL | HIGH | MODERATE | LOW
        affected_population int
        unit_id           str  — must match FLEET_CONFIG unit ID
        shelter_id        str  — optional shelter to direct evacuees to
        notes             str  — optional notes
        dispatched_by     str  — email of dispatcher
    """
    err = _require_manager()
    if err:
        return err

    payload = request.get_json(silent=True) or {}

    unit_id = payload.get("unit_id", "").strip()
    department = payload.get("department", "").strip()
    incident_lat = payload.get("incident_lat")
    incident_lon = payload.get("incident_lon")
    dispatched_by = payload.get("dispatched_by", "").strip() or "admin@gmail.com"
    shelter_id = payload.get("shelter_id", "").strip() or None

    # Map team ids or department names to units
    team_mapping = {
        "medical-kothrud": "KOTHRUD-VAN-01",
        "kothrud-response": "KOTHRUD-VAN-01",
        "kothrud response team": "KOTHRUD-VAN-01",
        "kothrud medical team": "KOTHRUD-VAN-01",
        "pimpri-rescue": "PIMPRI-RESCUE-01",
        "pimpri-response": "PIMPRI-RESCUE-01",
        "pimpri response team": "PIMPRI-RESCUE-01",
        "medical-pimpri": "PIMPRI-RESCUE-01",
        "ndrf-alpha": "KOTHRUD-VAN-01",
        "ndrf-bravo": "KOTHRUD-VAN-01",
        "fire-hadapsar": "KOTHRUD-VAN-01",
        "police-swargate": "KOTHRUD-VAN-01",
    }
    if unit_id in team_mapping:
        unit_id = team_mapping[unit_id]
    elif not unit_id and department:
        unit_id = team_mapping.get(department.lower(), "KOTHRUD-VAN-01")

    # Determine department
    if "pimpri" in (unit_id + " " + department).lower():
        target_dept_key = "Pimpri Response"
    else:
        target_dept_key = "Kothrud Response"

    # Validate unit exists in config
    found_unit = None
    found_dept = None
    for dept_key, dept in FLEET_CONFIG["departments"].items():
        for u in dept["units"]:
            if u["id"] == unit_id:
                found_unit = u
                found_dept = dept_key
                break
        if found_unit:
            break

    if not found_unit:
        found_dept = target_dept_key
        found_unit = FLEET_CONFIG["departments"][target_dept_key]["units"][0]
        unit_id = found_unit["id"]

    # Check unit availability (prevent double-dispatch if possible, or pick alternative in same dept)
    deployed_ids = _get_deployed_unit_ids()
    if unit_id in deployed_ids:
        # Find another available unit in the same department
        alt_unit = next((u for u in FLEET_CONFIG["departments"][found_dept]["units"] if u["id"] not in deployed_ids), None)
        if alt_unit:
            found_unit = alt_unit
            unit_id = alt_unit["id"]

    # Validate shelter capacity if provided
    shelter_info = None
    if shelter_id:
        shelter_occupancy = _get_shelter_occupancy()
        shelter_info = next((s for s in FLEET_CONFIG["shelters"] if s["id"] == shelter_id), None)
        if shelter_info:
            current_occ = shelter_occupancy.get(shelter_id, 0)
            new_occ = current_occ + found_unit["capacity"]
            if new_occ > shelter_info["capacity"]:
                return jsonify({
                    "success": False,
                    "error": f"Shelter '{shelter_info['name']}' would overflow. Capacity: {shelter_info['capacity']}, "
                             f"Current: {current_occ}, Requested additional: {found_unit['capacity']}."
                }), 409

    # Reuse route from payload if already computed, else compute
    route_data = {}
    if payload.get("route_waypoints") and payload.get("distance_km"):
        wp = payload.get("route_waypoints")
        route_data = {
            "route_waypoints": json.dumps(wp) if not isinstance(wp, str) else wp,
            "distance_km": payload.get("distance_km"),
            "duration_minutes": payload.get("duration_minutes"),
            "safety_status": payload.get("safety_status") or "CLEAR",
        }
    elif incident_lat and incident_lon:
        try:
            from backend.services.routing_service import compute_flood_aware_route
            from backend.routes.routing import _get_rainfall_stations, _get_recent_reports, _get_elevation_processor

            result = compute_flood_aware_route(
                origin_lat=found_unit["base_lat"],
                origin_lon=found_unit["base_lon"],
                dest_lat=float(incident_lat),
                dest_lon=float(incident_lon),
                team_name=found_unit["name"],
                rainfall_stations=_get_rainfall_stations(),
                recent_reports=_get_recent_reports(),
                elevation_processor=_get_elevation_processor(),
            )
            route_data = {
                "route_waypoints": json.dumps(result.get("waypoints", [])),
                "distance_km": result.get("distance_km"),
                "duration_minutes": result.get("duration_minutes"),
                "safety_status": result.get("safety_status"),
            }
        except Exception as e:
            logger.warning(f"[Dispatch] Route computation failed for assignment: {e}")
            route_data = {
                "route_waypoints": "[]",
                "distance_km": None,
                "duration_minutes": None,
                "safety_status": "UNKNOWN",
            }

    now = datetime.now(timezone.utc).isoformat()
    assignment_id = f"DISP-{uuid.uuid4().hex[:8].upper()}"

    incident_description = payload.get("incident_description") or payload.get("description") or ""
    image_url = payload.get("image_url") or ""

    # Enrich from ground reports if missing
    incident_id = payload.get("incident_id", "")
    if incident_id and (not incident_description or not image_url):
        try:
            from backend.services.db import get_report_by_id
            rep = get_report_by_id(str(incident_id))
            if rep:
                if not incident_description:
                    incident_description = rep.get("description", "")
                if not image_url:
                    img = rep.get("image_url") or rep.get("image_filename")
                    if img:
                        if not img.startswith("http") and not img.startswith("/"):
                            img = f"/api/uploads/{img}"
                        image_url = img
        except Exception as e:
            logger.warning(f"[Dispatch] Could not enrich incident details from DB: {e}")

    assignment = {
        "id": assignment_id,
        "incident_id": incident_id,
        "incident_title": payload.get("incident_title", "Incident"),
        "incident_description": incident_description,
        "image_url": image_url,
        "incident_lat": incident_lat,
        "incident_lon": incident_lon,
        "incident_location": payload.get("incident_location", ""),
        "severity": payload.get("severity", "MODERATE"),
        "affected_population": payload.get("affected_population"),
        "unit_id": unit_id,
        "unit_name": found_unit["name"],
        "department": found_dept,
        "vehicle_type": found_unit["vehicle"],
        "capacity": found_unit["capacity"],
        "shelter_id": shelter_id,
        "shelter_name": shelter_info["name"] if shelter_info else None,
        "origin_lat": found_unit["base_lat"],
        "origin_lon": found_unit["base_lon"],
        "origin_name": found_unit["base_name"],
        "route_waypoints": route_data.get("route_waypoints", "[]"),
        "distance_km": route_data.get("distance_km"),
        "duration_minutes": route_data.get("duration_minutes"),
        "safety_status": route_data.get("safety_status"),
        "status": payload.get("status") or ("assigned_to_head" if dispatched_by == "admin@gmail.com" else "dispatched"),
        "dispatched_by": dispatched_by,
        "dispatched_at": now,
        "updated_at": now,
        "notes": payload.get("notes", ""),
        "rerouted": 0,
        "reroute_reason": None,
        "previous_route": None,
    }

    _save_assignment(assignment)

    # Push mission to responder via simple approach (assignment stored in DB;
    # responder page polls or localStorage is updated on frontend side)

    return jsonify({
        "success": True,
        "assignment_id": assignment_id,
        "assignment": assignment,
        "route_computed": bool(route_data.get("distance_km")),
    }), 201


@dispatch_bp.route("/api/dispatch/assignments/<assignment_id>/status", methods=["PATCH"])
def update_status(assignment_id: str):
    """Update assignment status. Manager-only."""
    err = _require_manager()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status", "").strip()
    notes = payload.get("notes")
    rerouted = payload.get("rerouted", False)
    reroute_reason = payload.get("reroute_reason")

    valid_statuses = {"assigned_to_head", "dispatched", "en_route", "on_scene", "resolved", "cancelled"}
    if new_status not in valid_statuses:
        return jsonify({"success": False, "error": f"Invalid status '{new_status}'. Must be one of: {valid_statuses}"}), 400

    updated = _update_assignment_status(assignment_id, new_status, notes, rerouted, reroute_reason)
    if not updated:
        return jsonify({"success": False, "error": f"Assignment '{assignment_id}' not found."}), 404

    return jsonify({"success": True, "assignment_id": assignment_id, "status": new_status})


@dispatch_bp.route("/api/dispatch/assignments/<assignment_id>/deploy", methods=["POST", "PATCH"])
def deploy_unit(assignment_id: str):
    """Department Head selects vehicle(s) and deploys assignment to field responder."""
    err = _require_manager()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    unit_ids = payload.get("unit_ids") or []
    single_unit_id = payload.get("unit_id", "").strip()
    if not unit_ids and single_unit_id:
        unit_ids = [single_unit_id]

    found_units = []
    for dept in FLEET_CONFIG["departments"].values():
        for u in dept["units"]:
            if u["id"] in unit_ids:
                found_units.append(u)

    _init_dispatch_table()
    from backend.services.db import get_connection
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        if found_units:
            combined_id = ",".join(u["id"] for u in found_units)
            combined_name = ", ".join(u["name"] for u in found_units)
            combined_vehicle = ", ".join(list(dict.fromkeys(u["vehicle"] for u in found_units)))
            total_capacity = sum(u.get("capacity", 0) for u in found_units)
            
            cursor.execute("""
                UPDATE dispatch_assignments
                SET unit_id = ?, unit_name = ?, vehicle_type = ?, capacity = ?,
                    status = 'dispatched', updated_at = ?
                WHERE id = ?
            """, (combined_id, combined_name, combined_vehicle, total_capacity, now, assignment_id))
        else:
            cursor.execute("""
                UPDATE dispatch_assignments
                SET status = 'dispatched', updated_at = ?
                WHERE id = ?
            """, (now, assignment_id))
        conn.commit()

    return jsonify({
        "success": True,
        "assignment_id": assignment_id,
        "status": "dispatched",
        "units": found_units,
        "total_capacity": sum(u.get("capacity", 0) for u in found_units)
    })


@dispatch_bp.route("/api/dispatch/assignments/<assignment_id>", methods=["DELETE"])
def cancel_assignment(assignment_id: str):
    """Cancel (delete) an assignment. Manager-only."""
    err = _require_manager()
    if err:
        return err

    deleted = _delete_assignment(assignment_id)
    if not deleted:
        return jsonify({"success": False, "error": f"Assignment '{assignment_id}' not found."}), 404

    return jsonify({"success": True, "assignment_id": assignment_id})


@dispatch_bp.route("/api/dispatch/incidents", methods=["GET"])
def get_active_incidents():
    """Return active incidents (reports + news) with population data. Manager-only."""
    err = _require_manager()
    if err:
        return err

    try:
        from backend.services.db import get_all_reports, get_all_news
        reports = get_all_reports()
        news = get_all_news(limit=20, only_located=True)

        incidents = []

        for r in reports:
            img = r.get("image_url") or r.get("image_filename")
            if img and not img.startswith("http") and not img.startswith("/"):
                img = f"/api/uploads/{img}"
            incidents.append({
                "id": r["id"],
                "source": "ground_report",
                "title": r.get("incident_type", "Ground Report"),
                "description": r.get("description", ""),
                "image_url": img,
                "location": r.get("location_name") or f"{r['latitude']:.4f}, {r['longitude']:.4f}",
                "lat": r.get("latitude"),
                "lon": r.get("longitude"),
                "severity": (r.get("analysis_result") or {}).get("verified_severity", "MODERATE"),
                "affected_population": r.get("estimated_population_1km"),
                "impact_radius_km": r.get("impact_radius_km"),
                "timestamp": r.get("timestamp"),
                "status": r.get("status", "pending"),
            })

        for n in (news or []):
            if not n.get("latitude"):
                continue
            incidents.append({
                "id": n["id"],
                "source": "news",
                "title": n.get("title", "News Alert"),
                "description": n.get("description", ""),
                "location": n.get("extracted_location") or n.get("location_name") or "Unknown",
                "lat": n.get("latitude"),
                "lon": n.get("longitude"),
                "severity": n.get("severity", "MODERATE"),
                "affected_population": n.get("estimated_population_1km"),
                "impact_radius_km": n.get("impact_radius_km"),
                "timestamp": n.get("timestamp"),
                "status": "active",
            })

        # Sort by severity
        sev_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
        incidents.sort(key=lambda x: sev_order.get(x.get("severity", "MODERATE"), 2))

        return jsonify({"success": True, "count": len(incidents), "incidents": incidents})

    except Exception as e:
        logger.exception(f"[Dispatch] Failed to fetch incidents: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@dispatch_bp.route("/api/dispatch/rainfall/nearest", methods=["GET"])
def get_nearest_rainfall():
    """Get nearest rainfall station reading for a given lat/lon. Manager-only."""
    err = _require_manager()
    if err:
        return err

    try:
        lat = float(request.args.get("lat", 18.52))
        lon = float(request.args.get("lon", 73.85))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid lat/lon parameters"}), 400

    try:
        from backend.routes.rainfall import cache, STATIONS, fetch_station
        import math

        # Find nearest station
        def dist(s):
            return math.sqrt((s["lat"] - lat) ** 2 + (s["lng"] - lon) ** 2)

        nearest = min(STATIONS, key=dist)

        # Use cache if available
        cached_data = cache.get("data") or []
        cached_station = next((s for s in cached_data if s["id"] == nearest["id"]), None)

        if cached_station:
            return jsonify({"success": True, "station": cached_station, "source": "cache"})

        # Fetch live
        data = fetch_station(nearest)
        if data:
            return jsonify({"success": True, "station": data, "source": "live"})

        return jsonify({"success": True, "station": {
            "name": nearest["name"], "lat": nearest["lat"], "lng": nearest["lng"],
            "rain_1h": None, "condition": "Unavailable"
        }, "source": "unavailable"})

    except Exception as e:
        logger.exception(f"[Dispatch] Rainfall fetch error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@dispatch_bp.route("/api/dispatch/responder-mission", methods=["GET"])
def get_responder_mission():
    """Return the currently active mission for a specific field responder team.
    Query Params:
        email str — the field responder's email (e.g. medical@gmail.com)
    """
    email = request.args.get("email", "").strip().lower()
    
    # Map email to department
    target_depts = []
    if email == "medical@gmail.com":
        target_depts = ["Kothrud Response", "Kothrud Medical"]
    elif email == "pimpri@gmail.com":
        target_depts = ["Pimpri Response", "Pimpri Tactical Response"]
    else:
        return jsonify({"success": False, "error": "Invalid field responder email."}), 400

    assignments = _get_all_assignments(manager_email=None) # get all
    # Find the most recent mission that has been actively deployed by Department Head
    for a in assignments:
        if a["department"] in target_depts and a["status"] in ("dispatched", "en_route", "on_scene"):
            # Parse route if needed
            if a.get("route_waypoints") and isinstance(a["route_waypoints"], str):
                try:
                    a["route_waypoints"] = json.loads(a["route_waypoints"])
                except Exception:
                    a["route_waypoints"] = []
            
            # Format the output to match what responder UI expects for `sahayak_active_mission`
            mission_data = {
                "id": a["id"],
                "incident_id": a.get("incident_id"),
                "title": a["incident_title"],
                "description": a.get("incident_description") or a.get("notes") or f"Respond to {a['incident_location']}",
                "incident_description": a.get("incident_description") or "",
                "image_url": a.get("image_url"),
                "location": a.get("incident_location"),
                "dest_coords": [a.get("incident_lat"), a.get("incident_lon")] if a.get("incident_lat") and a.get("incident_lon") else None,
                "population": a.get("affected_population"),
                "unit_id": a.get("unit_id"),
                "unit_name": a.get("unit_name"),
                "vehicle_type": a.get("vehicle_type"),
                "capacity": a.get("capacity"),
                "brief": [
                    f"Team: {a['unit_name']} ({a['vehicle_type']}, Cap: {a['capacity']})",
                    f"Dispatched by: {a['dispatched_by']}",
                    f"Safety Status: {a.get('safety_status', 'CLEAR')}"
                ],
                "route": a.get("route_waypoints", []),
                "distance_km": a.get("distance_km"),
                "duration_minutes": a.get("duration_minutes"),
                "status": a["status"]
            }
            return jsonify({"success": True, "mission": mission_data})
            
    return jsonify({"success": True, "mission": None})
