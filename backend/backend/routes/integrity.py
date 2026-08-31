from flask import Blueprint, jsonify

from backend import db
from backend.routes.auth import _get_current_candidate
from backend.services.integrity_service import IntegrityService

integrity_bp = Blueprint("integrity", __name__, url_prefix="/api/integrity")
service = IntegrityService()


@integrity_bp.teardown_request
def teardown_request(_error):
    db.session.remove()


@integrity_bp.get("/session/<int:session_id>")
def get_session_integrity(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_session_integrity(session_id, candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404


@integrity_bp.get("/all")
def get_all_integrity_scores():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        return jsonify(service.get_completed_sessions_integrity(candidate)), 200
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
