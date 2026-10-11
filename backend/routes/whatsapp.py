import os
import uuid
import requests
from datetime import datetime, timezone
from flask import Blueprint, request, current_app
from werkzeug.utils import secure_filename
from twilio.twiml.messaging_response import MessagingResponse
from twilio.request_validator import RequestValidator

from backend.config import get_config
from backend.services.ai_service import analyze_citizen_report, extract_news_location_and_hazard
from backend.services.geocoding_service import geocode_location
from backend.services.db import save_report, get_report_by_id
from backend.services.population_service import estimate_population_in_radius

whatsapp_bp = Blueprint("whatsapp", __name__)

def get_upload_dir() -> str:
    config = get_config()
    upload_dir = getattr(config, "UPLOAD_FOLDER", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

def generate_report_id(message_sid: str) -> str:
    """Use the Twilio MessageSid as the unique identifier for deduplication."""
    return f"WA-{message_sid}"

@whatsapp_bp.route("/api/whatsapp", methods=["POST"])
def twilio_webhook():
    """Handle incoming WhatsApp messages from Twilio Sandbox."""
    
    # 1. Validate Twilio Signature
    validator = RequestValidator(os.environ.get("TWILIO_AUTH_TOKEN", "test_token"))
    signature = request.headers.get("X-Twilio-Signature", "")
    
    # Reconstruct original URL if behind proxy (e.g. Ngrok)
    url = request.url
    forwarded_host = request.headers.get("X-Forwarded-Host")
    forwarded_proto = request.headers.get("X-Forwarded-Proto")
    if forwarded_host and forwarded_proto:
        url = f"{forwarded_proto}://{forwarded_host}{request.path}"
        if request.query_string:
            url += f"?{request.query_string.decode('utf-8')}"
            
    post_vars = request.form.to_dict()
    
    # In production, we should enforce this. For testing/demo without a token, we might allow it if configured.
    # But for secure setup, we validate if token is provided.
    if os.environ.get("TWILIO_AUTH_TOKEN") and not app_is_testing():
        if not validator.validate(url, post_vars, signature):
            return "Invalid Twilio Signature", 403

    message_sid = post_vars.get("MessageSid", "")
    from_number = post_vars.get("From", "")
    body = post_vars.get("Body", "").strip()
    num_media = int(post_vars.get("NumMedia", 0))
    lat_raw = post_vars.get("Latitude")
    lon_raw = post_vars.get("Longitude")

    if not message_sid:
        return "Missing MessageSid", 400

    report_id = generate_report_id(message_sid)

    # 2. Deduplication check
    existing = get_report_by_id(report_id)
    if existing:
        return respond_with_twiml("We already received this report. Thank you!")

    # 3. Media Download
    local_image_path = None
    image_filename = None
    image_url = None
    
    if num_media > 0:
        media_url = post_vars.get("MediaUrl0")
        content_type = post_vars.get("MediaContentType0", "")
        
        if media_url and content_type.startswith("image/"):
            try:
                # Download media securely (Twilio media URLs require HTTP Basic Auth with Account Sid and Auth Token)
                auth = None
                account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
                auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
                if account_sid and auth_token:
                    auth = (account_sid, auth_token)
                else:
                    current_app.logger.warning("[Media Pipeline] WARNING: No Twilio credentials found in environment. Auth will be omitted.")
                
                # Twilio redirects to AWS S3. We must NOT send Basic Auth to S3, or it returns 400 Bad Request.
                current_app.logger.info(f"[Media Pipeline] Requesting media from Twilio: {media_url}")
                resp = requests.get(media_url, auth=auth, allow_redirects=False, timeout=10)
                current_app.logger.info(f"[Media Pipeline] Initial HTTP Status: {resp.status_code}")
                
                if resp.status_code in (301, 302, 303, 307, 308):
                    s3_url = resp.headers.get("Location")
                    current_app.logger.info(f"[Media Pipeline] Redirected to S3 URL: {s3_url.split('?')[0]}... (params hidden)")
                    resp = requests.get(s3_url, timeout=10)
                    current_app.logger.info(f"[Media Pipeline] Final S3 HTTP Status: {resp.status_code}")
                    
                if resp.status_code == 200:
                    ext = content_type.split("/")[-1]
                    if ext == "jpeg": ext = "jpg"
                    image_filename = f"{uuid.uuid4().hex}.{ext}"
                    local_image_path = os.path.join(get_upload_dir(), image_filename)
                    with open(local_image_path, "wb") as f:
                        f.write(resp.content)
                    image_url = f"/api/uploads/{image_filename}"
                    current_app.logger.info(f"[Media Pipeline] Successfully saved image to {local_image_path} ({len(resp.content)} bytes). DB image_url: {image_url}")
                else:
                    current_app.logger.error(f"[Media Pipeline] Failed to download Twilio media. Final Status: {resp.status_code}, Body snippet: {resp.text[:100]}")
            except Exception as e:
                current_app.logger.error(f"[Media Pipeline] Exception during download: {e}")


    # 4. Geocoding / Location Extraction
    latitude = None
    longitude = None
    location_name = "Unknown Location"
    
    if lat_raw and lon_raw:
        try:
            latitude = float(lat_raw)
            longitude = float(lon_raw)
            location_name = "WhatsApp Location Pin"
        except ValueError:
            pass

    if latitude is None or longitude is None:
        # Extract location from text using existing LLM pipeline
        extracted = extract_news_location_and_hazard(body[:200], body, "whatsapp")
        loc_name = extracted.get("exact_location_name")
        if loc_name:
            location_name = loc_name
            geo_res = geocode_location(loc_name)
            latitude = geo_res.get("latitude")
            longitude = geo_res.get("longitude")
        
        # Fallback to Pune center if all else fails so the report can be saved
        if latitude is None or longitude is None:
            latitude = 18.5204
            longitude = 73.8567
            location_name = loc_name or "Pune (Default Fallback)"

    # 5. AI Analysis (Severity, validity, hazards)
    # Re-using the exact pipeline that the web frontend uses
    initial_analysis = analyze_citizen_report(
        description=body,
        category="WhatsApp Report",
        image_path=image_url if image_url else None,
    )

    is_relevant = initial_analysis.get("is_relevant", True)
    if not is_relevant:
        return respond_with_twiml("Thank you, but this report doesn't appear to be related to a disaster.")

    # 5b. Population Estimation
    estimated_pop = None
    impact_radius = initial_analysis.get("impact_radius_km", 0.1)
    if latitude is not None and longitude is not None:
        estimated_pop = estimate_population_in_radius(latitude, longitude, radius_km=impact_radius)

    # 6. Persistence
    now_iso = datetime.now(timezone.utc).isoformat()
    
    report_data = {
        "id": report_id,
        "incident_type": "WhatsApp Report",
        "description": body,
        "image_url": image_url,
        "image_filename": image_filename,
        "latitude": latitude,
        "longitude": longitude,
        "accuracy": None,
        "location_name": location_name,
        "timestamp": now_iso,
        "source": "whatsapp",
        "status": "pending",
        "created_at": now_iso,
        "processing_status": "processed",
        "analysis_result": initial_analysis,
        "content_hash": None,
        "estimated_population_1km": estimated_pop,
        "impact_radius_km": impact_radius,
    }
    
    try:
        save_report(report_data)
    except Exception as e:
        current_app.logger.error(f"Failed to save WhatsApp report: {e}")
        return respond_with_twiml("Error saving report. Please try again.")

    # 7. Response
    reply_msg = f"Thank you. Your report has been verified by RainGuard AI and plotted on the dashboard. Severity: {initial_analysis.get('verified_severity', 'Unknown')}."
    return respond_with_twiml(reply_msg)


def respond_with_twiml(message_text: str):
    """Format a Twilio MessagingResponse."""
    resp = MessagingResponse()
    resp.message(message_text)
    return str(resp), 200, {'Content-Type': 'application/xml'}


def app_is_testing() -> bool:
    try:
        from flask import current_app
        return current_app.config.get("TESTING", False)
    except Exception:
        return False
