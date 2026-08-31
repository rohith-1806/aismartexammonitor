from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import check_password_hash, generate_password_hash

from backend import db
from backend.models.exam_models import Candidate, Exam, ExamAssignment
from backend.services.database_service import DatabaseService
from backend.services.face_service import normalize_profile_photo

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
service = DatabaseService()


@auth_bp.teardown_request
def teardown_request(_error):
    db.session.remove()


def _candidate_payload(candidate: Candidate) -> dict[str, Any]:
    user_role = getattr(candidate, "role", "candidate")
    if candidate.email.lower() == "admin@gmail.com":
        user_role = "admin"
    return {
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "role": user_role,
        "photo_path": candidate.photo_path,
        "created_at": candidate.created_at.isoformat(),
    }


def _issue_token(candidate: Candidate) -> str:
    user_role = getattr(candidate, "role", "candidate")
    if candidate.email.lower() == "admin@gmail.com":
        user_role = "admin"
    payload = {
        "sub": candidate.id,
        "email": candidate.email,
        "role": user_role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=current_app.config["JWT_EXPIRATION_HOURS"]),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm=current_app.config["JWT_ALGORITHM"])



def _get_current_candidate() -> Candidate | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=[current_app.config["JWT_ALGORITHM"]])
    except (jwt.ExpiredSignatureError, jwt.DecodeError, jwt.InvalidTokenError):
        return None

    candidate_id = payload.get("sub")
    if not candidate_id:
        return None
    return db.session.get(Candidate, candidate_id)


@auth_bp.post("/register")
def register_candidate():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = (payload.get("password") or "").strip()
    photo_path = (payload.get("photo_path") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400

    if "@" not in email or "." not in email:
        return jsonify({"error": "A valid email is required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    try:
        photo_path = normalize_profile_photo(photo_path)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    existing_candidate = db.session.query(Candidate).filter(func.lower(Candidate.email) == email).first()
    if existing_candidate:
        return jsonify({"error": "Email already registered."}), 409

    try:
        candidate = service.create_candidate(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            photo_path=photo_path or None,
        )
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Registration failed due to a database error."}), 500

    return jsonify({
        "message": "Registration successful.",
        "candidate": _candidate_payload(candidate),
        "token": _issue_token(candidate),
    }), 201


@auth_bp.post("/login")
def login_candidate():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = (payload.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    candidate = db.session.query(Candidate).filter(func.lower(Candidate.email) == email).first()
    if not candidate or not check_password_hash(candidate.password_hash, password):
        return jsonify({"error": "Invalid credentials."}), 401

    token = _issue_token(candidate)
    return jsonify({"message": "Login successful.", "token": token, "candidate": _candidate_payload(candidate)}), 200


@auth_bp.post("/staff-login")
def login_staff():
    payload = request.get_json(silent=True) or {}
    staff_id = str(payload.get("staff_id") or payload.get("email") or "").strip()
    password = (payload.get("password") or "").strip()

    if not staff_id or not password:
        return jsonify({"error": "Staff/Admin ID and password are required."}), 400

    candidate = db.session.query(Candidate).filter_by(email=staff_id.lower()).first()
    if not candidate and staff_id.isdigit():
        candidate = db.session.get(Candidate, int(staff_id))
    is_staff = candidate and (
        getattr(candidate, "role", "candidate") in {"admin", "invigilator"}
        or candidate.email.lower() == "admin@gmail.com"
    )
    if not is_staff or not check_password_hash(candidate.password_hash, password):
        return jsonify({"error": "Invalid staff credentials."}), 401

    token = _issue_token(candidate)
    return jsonify({"message": "Staff login successful.", "token": token, "candidate": _candidate_payload(candidate)}), 200


@auth_bp.post("/logout")
def logout_candidate():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    return jsonify({"message": "Logout successful."}), 200


@auth_bp.get("/profile")
def profile_candidate():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    return jsonify({"candidate": _candidate_payload(candidate)}), 200


@auth_bp.get("/candidates")
def list_candidates():
    requester = _get_current_candidate()
    if not requester or (getattr(requester, "role", "candidate") not in {"admin", "invigilator"}
                         and requester.email.lower() != "admin@gmail.com"):
        return jsonify({"error": "Administrator access required."}), 403

    candidates = db.session.query(Candidate).order_by(Candidate.created_at.asc()).all()
    return jsonify({
        "candidates": [
            {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "photo_registered": bool(candidate.photo_path),
                "registered_at": candidate.created_at.isoformat(),
                "completed_exams": sum(
                    session.status == "Completed" for session in candidate.sessions
                ),
            }
            for candidate in candidates
            if candidate.id != requester.id
        ]
    }), 200


@auth_bp.put("/profile")
def update_profile():
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    if not name or not email or "@" not in email or "." not in email:
        return jsonify({"error": "A valid name and email are required."}), 400
    existing = db.session.query(Candidate).filter(
        Candidate.email == email, Candidate.id != candidate.id
    ).first()
    if existing:
        return jsonify({"error": "Email already registered."}), 409

    candidate.name = name
    candidate.email = email
    if "photo_path" in payload:
        try:
            candidate.photo_path = normalize_profile_photo(payload.get("photo_path"))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
    db.session.commit()
    return jsonify({"candidate": _candidate_payload(candidate)}), 200
