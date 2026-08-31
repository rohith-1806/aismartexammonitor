from flask import Blueprint, jsonify, request

from backend import db
from backend.routes.auth import _get_current_candidate
from backend.services.event_service import EventService
from backend.services.face_service import FaceService

events_bp = Blueprint("events", __name__, url_prefix="/api/events")
service = EventService()
face_service = FaceService()


@events_bp.teardown_request
def teardown_request(_error):
    db.session.remove()


@events_bp.post("/browser")
def log_browser_event():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    event_type = (payload.get("event_type") or "").strip()
    additional_details = payload.get("additional_details")

    if not isinstance(session_id, int):
        return jsonify({"error": "session_id must be an integer."}), 400
    if not event_type:
        return jsonify({"error": "event_type is required."}), 400

    try:
        event = service.save_browser_event(session_id, candidate.id, event_type, additional_details)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    return jsonify({"message": "Browser event logged.", "event": event}), 201


@events_bp.post("/face")
def log_face_event():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    status = payload.get("status")
    additional_details = payload.get("additional_details")

    if not isinstance(session_id, int):
        return jsonify({"error": "session_id must be an integer."}), 400
    if not isinstance(status, str) or not status.strip():
        return jsonify({"error": "status is required."}), 400

    try:
        event = face_service.save_face_event(session_id, candidate.id, status, additional_details)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    return jsonify({"message": "Face event logged.", "event": event}), 201


@events_bp.get("/face/<int:session_id>")
def get_face_events(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        events = face_service.get_face_history(session_id, candidate.id)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    return jsonify({"events": events}), 200


@events_bp.get("/warnings/<int:session_id>")
def get_session_warnings(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        warnings = face_service.warning_service.get_session_warnings(session_id, candidate.id)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    return jsonify({"warnings": warnings}), 200


@events_bp.get("/warning-count/<int:session_id>")
def get_warning_count(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        warnings = face_service.warning_service.get_session_warnings(session_id, candidate.id)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    return jsonify({"count": len(warnings)}), 200


@events_bp.get("/session/<int:session_id>")
def get_session_events(session_id: int):
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    try:
        events = service.get_session_events(session_id, candidate.id)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    return jsonify({"events": events}), 200


@events_bp.post("/detect-frame")
def analyze_camera_frame():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    payload = request.get_json(silent=True) or {}
    image_data = payload.get("image")
    if not image_data or not isinstance(image_data, str):
        return jsonify({"error": "image payload required."}), 400

    try:
        import base64
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]
        img_bytes = base64.b64decode(image_data)
        res = face_service.analyze_frame_bytes(img_bytes)
        return jsonify(res), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@events_bp.post("/verify-identity")
def verify_candidate_identity():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    payload = request.get_json(silent=True) or {}
    image_data = payload.get("image")
    reg_photo = candidate.photo_path

    if not image_data or not isinstance(image_data, str):
        return jsonify({"error": "image payload required."}), 400

    try:
        import base64
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]
        img_bytes = base64.b64decode(image_data)
        res = face_service.verify_candidate_face_identity(img_bytes, reg_photo)
        return jsonify(res), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500



