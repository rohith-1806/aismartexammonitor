from flask import Blueprint, jsonify

from backend import db
from backend.routes.auth import _get_current_candidate
from backend.services.dashboard_service import DashboardService

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")
service = DashboardService()


@dashboard_bp.teardown_request
def teardown_request(_error):
    db.session.remove()


@dashboard_bp.get("/summary")
def get_dashboard_summary():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_summary(candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403


@dashboard_bp.get("/recent-sessions")
def get_recent_sessions():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_recent_sessions(candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403


@dashboard_bp.get("/high-risk")
def get_high_risk_sessions():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_high_risk_sessions(candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403


@dashboard_bp.get("/candidate/<int:candidate_id>")
def get_candidate_analytics(candidate_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_candidate_analytics(candidate_id, candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
