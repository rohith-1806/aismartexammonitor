from flask import Blueprint, jsonify, request

from backend import db
from backend.routes.auth import _get_current_candidate
from backend.services.session_monitor_service import SessionMonitorService

session_monitor_bp = Blueprint("session_monitor", __name__, url_prefix="/api/monitor")
service = SessionMonitorService()


@session_monitor_bp.teardown_request
def teardown_request(_error):
    db.session.remove()


@session_monitor_bp.get("/sessions")
def get_all_sessions():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_all_sessions(candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403


@session_monitor_bp.get("/session/<int:session_id>")
def get_session_summary(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_session_summary(session_id, candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404


@session_monitor_bp.get("/timeline/<int:session_id>")
def get_session_timeline(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_session_timeline(session_id, candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404


@session_monitor_bp.get("/warnings/<int:session_id>")
def get_session_warnings(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_session_warnings(session_id, candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
