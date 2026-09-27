"""Ground reports API blueprint for incident submissions and retrievals."""

import base64
import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

from backend.config import get_config
from backend.services.db import get_all_reports, get_report_by_id, save_report

reports_bp = Blueprint("reports", __name__)


def get_upload_dir() -> str:
    """Retrieve uploads directory path from config and ensure existence."""
    config = get_config()
    upload_dir = getattr(config, "UPLOAD_FOLDER", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    config = get_config()
    allowed_exts = getattr(config, "ALLOWED_IMAGE_EXTENSIONS", {"jpg", "jpeg", "png", "webp", "heic", "gif"})
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed_exts


def generate_report_id() -> str:
    """Generate standardized tracking ID for report (e.g. RG-YYYYMMDD-XXXX)."""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"RG-{date_str}-{suffix}"


@reports_bp.route("/api/reports", methods=["POST"])
def create_report():
    """Submit a ground report with optional image attachment.

    Accepts both multipart/form-data and application/json.
    """
    # 1. Parse Fields from either form data or JSON
    if request.is_json:
        data = request.get_json() or {}
        incident_type = data.get("incident_type") or data.get("type")
        description = data.get("description", "")
        lat_raw = data.get("latitude")
        lon_raw = data.get("longitude")
        accuracy_raw = data.get("accuracy")
        location_name = data.get("location_name") or data.get("locationName")
        timestamp_raw = data.get("timestamp")
        image_base64 = data.get("image_base64") or data.get("image_data")
        image_url = data.get("image_url") or data.get("imageUri")
        image_file = None
    else:
        incident_type = request.form.get("incident_type") or request.form.get("type")
        description = request.form.get("description", "")
        lat_raw = request.form.get("latitude")
        lon_raw = request.form.get("longitude")
        accuracy_raw = request.form.get("accuracy")
        location_name = request.form.get("location_name") or request.form.get("locationName")
        timestamp_raw = request.form.get("timestamp")
        image_base64 = request.form.get("image_base64")
        image_url = request.form.get("image_url")
        image_file = request.files.get("image") or request.files.get("photo") or request.files.get("file")

    # 2. Validation
    if not incident_type or not str(incident_type).strip():
        return jsonify({
            "success": False,
            "error": "Validation Error: 'incident_type' is required."
        }), 400

    incident_type = str(incident_type).strip()

    if lat_raw is None or lon_raw is None:
        return jsonify({
            "success": False,
            "error": "Validation Error: 'latitude' and 'longitude' coordinates are required."
        }), 400

    try:
        latitude = float(lat_raw)
        longitude = float(lon_raw)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "Validation Error: 'latitude' and 'longitude' must be valid numeric values."
        }), 400

    if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
        return jsonify({
            "success": False,
            "error": f"Validation Error: Coordinates out of bounds ({latitude}, {longitude})."
        }), 400

    accuracy = None
    if accuracy_raw is not None and str(accuracy_raw).strip() != "":
        try:
            accuracy = float(accuracy_raw)
        except (ValueError, TypeError):
            accuracy = None

    timestamp = timestamp_raw if timestamp_raw else datetime.now(timezone.utc).isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()
    report_id = generate_report_id()
    saved_filename = None

    # 3. Handle Image Storage
    upload_dir = get_upload_dir()

    if image_file and image_file.filename:
        orig_filename = secure_filename(image_file.filename)
        if not is_allowed_file(orig_filename):
            return jsonify({
                "success": False,
                "error": f"Invalid image format: '{orig_filename}'. Allowed: JPG, PNG, WEBP, HEIC, GIF."
            }), 400

        ext = orig_filename.rsplit(".", 1)[1].lower() if "." in orig_filename else "jpg"
        saved_filename = f"{report_id}_{uuid.uuid4().hex[:6]}.{ext}"
        target_path = os.path.join(upload_dir, saved_filename)
        image_file.save(target_path)
        image_url = f"/api/uploads/{saved_filename}"

    elif image_base64 and isinstance(image_base64, str):
        try:
            # Strip data url prefix if present (e.g. data:image/jpeg;base64,...)
            if "," in image_base64:
                header, encoded = image_base64.split(",", 1)
                ext = "png" if "png" in header else "jpg"
            else:
                encoded = image_base64
                ext = "jpg"

            decoded_bytes = base64.b64decode(encoded)
            saved_filename = f"{report_id}_{uuid.uuid4().hex[:6]}.{ext}"
            target_path = os.path.join(upload_dir, saved_filename)
            with open(target_path, "wb") as f:
                f.write(decoded_bytes)
            image_url = f"/api/uploads/{saved_filename}"
        except Exception as e:
            current_app.logger.error(f"Failed to decode base64 image: {e}")

    # 4. Save to Database
    report_record = {
        "id": report_id,
        "incident_type": incident_type,
        "description": str(description).strip() if description else "",
        "image_url": image_url,
        "image_filename": saved_filename,
        "latitude": latitude,
        "longitude": longitude,
        "accuracy": accuracy,
        "location_name": str(location_name).strip() if location_name else None,
        "timestamp": timestamp,
        "source": "ground_report",
        "status": "pending",
        "created_at": now_iso,
    }

    saved = save_report(report_record)

    return jsonify({
        "success": True,
        "message": "Ground report captured successfully.",
        "report": saved,
        "data": saved,
    }), 201


@reports_bp.route("/api/reports", methods=["GET"])
def list_reports():
    """Retrieve all ground reports."""
    reports = get_all_reports()
    return jsonify({
        "success": True,
        "count": len(reports),
        "reports": reports,
        "data": reports,
    }), 200


@reports_bp.route("/api/reports/<report_id>", methods=["GET"])
def get_report(report_id: str):
    """Retrieve a single ground report by ID."""
    report = get_report_by_id(report_id)
    if not report:
        return jsonify({
            "success": False,
            "error": f"Report '{report_id}' not found."
        }), 404

    return jsonify({
        "success": True,
        "report": report,
        "data": report,
    }), 200


@reports_bp.route("/api/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename: str):
    """Safely serve an uploaded incident image."""
    upload_dir = get_upload_dir()
    return send_from_directory(upload_dir, filename)
