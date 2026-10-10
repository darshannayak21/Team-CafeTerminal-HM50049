"""AI Explainability & Analysis Route.

Exposes endpoints for Gemini AI hazard reasoning, human impact briefings,
and citizen report verification.
"""

from flask import Blueprint, jsonify, request

from backend.services.ai_service import explain_hazard, analyze_citizen_report

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/api/ai/explain-hazard", methods=["POST"])
def api_explain_hazard():
    """Generate AI explanation, human impact brief, and action plan for a hazard alert."""
    payload = request.get_json(silent=True) or {}
    settlement_name = payload.get("settlement_name", "Mulshi")
    taluka = payload.get("taluka", "Mulshi")
    population = int(payload.get("population", 18400))
    affected_population = int(payload.get("affected_population", 12500))
    hazard_score = float(payload.get("hazard_score", 0.85))
    risk_level = payload.get("risk_level", "HIGH")
    
    rainfall_1h = float(payload.get("rainfall_1h", 35.0))
    rainfall_24h = float(payload.get("rainfall_24h", 90.0))
    rainfall_72h = float(payload.get("rainfall_72h", 180.0))
    
    is_isolated = bool(payload.get("is_isolated", False))
    isolation_reason = payload.get("isolation_reason")
    evidence = payload.get("evidence", [])

    try:
        result = explain_hazard(
            settlement_name=settlement_name,
            taluka=taluka,
            population=population,
            affected_population=affected_population,
            hazard_score=hazard_score,
            risk_level=risk_level,
            rainfall_1h=rainfall_1h,
            rainfall_24h=rainfall_24h,
            rainfall_72h=rainfall_72h,
            is_isolated=is_isolated,
            isolation_reason=isolation_reason,
            evidence=evidence,
        )
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@ai_bp.route("/api/ai/analyze-report", methods=["POST"])
def api_analyze_report():
    """Analyze and verify citizen disaster report with AI."""
    payload = request.get_json(silent=True) or {}
    description = payload.get("description", "")
    category = payload.get("category", "flood")
    image_path = payload.get("image_path")

    try:
        result = analyze_citizen_report(
            description=description,
            category=category,
            image_path=image_path,
        )
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
