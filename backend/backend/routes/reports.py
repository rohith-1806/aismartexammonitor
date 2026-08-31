from flask import Blueprint, jsonify

from backend import db
from backend.routes.auth import _get_current_candidate
from backend.services.report_service import ReportService

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")
service = ReportService()


@reports_bp.teardown_request
def teardown_request(_error):
    db.session.remove()


@reports_bp.get("/session/<int:session_id>")
def get_session_report(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_session_report(session_id, candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404


@reports_bp.get("/candidate/<int:candidate_id>")
def get_candidate_report(candidate_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_candidate_report(candidate_id, candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404


@reports_bp.get("/ai-report/<int:session_id>")
def get_ai_session_report(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_ai_session_report(session_id, candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

