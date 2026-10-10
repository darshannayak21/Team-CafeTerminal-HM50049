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
    """Analyze and verify citizen disaster report with AI.

    Reuses stored analysis if report_id has already been analyzed, unless force_reprocess is True.
    """
    from backend.services.db import get_report_by_id, update_report_analysis

    payload = request.get_json(silent=True) or {}
    report_id = payload.get("report_id")
    force_reprocess = bool(payload.get("force_reprocess", False))

    if report_id and not force_reprocess:
        existing = get_report_by_id(report_id)
        if existing and existing.get("analysis_result"):
            return jsonify({
                "success": True,
                "data": existing["analysis_result"],
                "cached": True,
                "processing_status": existing.get("processing_status", "completed"),
            })

    description = payload.get("description", "")
    category = payload.get("category", "flood")
    image_path = payload.get("image_path")

    try:
        result = analyze_citizen_report(
            description=description,
            category=category,
            image_path=image_path,
        )

        if report_id:
            update_report_analysis(report_id, result, processing_status="completed")

        return jsonify({
            "success": True,
            "data": result,
            "cached": False,
            "processing_status": "completed",
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

