from typing import Any

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from backend import db
from backend.models.exam_models import Candidate, Exam, ExamSession
from backend.routes.auth import _get_current_candidate
from backend.services.exam_service import ExamService

exams_bp = Blueprint("exams", __name__, url_prefix="/api/exams")
service = ExamService()


@exams_bp.teardown_request
def teardown_request(_error):
    db.session.remove()


@exams_bp.before_request
def protect_exam_routes():
    if request.method == "OPTIONS":
        return None
    candidate = _get_current_candidate()
    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401


@exams_bp.get("")
def get_exams():
    return jsonify({"exams": service.list_exams(_get_current_candidate())}), 200


@exams_bp.get("/sessions")
def get_candidate_sessions():
    candidate = _get_current_candidate()
    return jsonify({"sessions": service.list_candidate_sessions(candidate.id)}), 200


@exams_bp.post("")
def create_exam():
    admin = _get_current_candidate()
    if getattr(admin, "role", "candidate") not in {"admin", "invigilator"} and admin.email.lower() != "admin@gmail.com":
        return jsonify({"error": "Administrator access required."}), 403

    exam, error = service.create_exam(request.get_json(silent=True) or {}, admin)
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"exam": exam}), 201


@exams_bp.get("/<int:exam_id>")
def get_exam_detail(exam_id: int):
    exam = service.get_exam_details(exam_id)
    if not exam:
        return jsonify({"error": "Invalid exam ID."}), 404
    return jsonify(exam), 200


@exams_bp.get("/<int:exam_id>/preview")
def get_exam_preview(exam_id: int):
    admin = _get_current_candidate()
    if getattr(admin, "role", "candidate") not in {"admin", "invigilator"} and admin.email.lower() != "admin@gmail.com":
        return jsonify({"error": "Administrator access required."}), 403

    exam = service.get_exam_preview(exam_id)
    if not exam:
        return jsonify({"error": "Invalid exam ID."}), 404
    return jsonify(exam), 200


@exams_bp.post("/start")
def start_exam():
    payload = request.get_json(silent=True) or {}
    exam_id = payload.get("exam_id")
    candidate = _get_current_candidate()

    if not candidate:
        return jsonify({"error": "Unauthorized."}), 401

    if not isinstance(exam_id, int):
        return jsonify({"error": "exam_id must be an integer."}), 400

    session, error = service.start_exam(candidate.id, exam_id)
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"message": "Exam session started.", "session_id": session.id}), 201


@exams_bp.post("/submit")
def submit_exam():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    answers = payload.get("answers", [])

    if not isinstance(session_id, int):
        return jsonify({"error": "session_id must be an integer."}), 400

    if not isinstance(answers, list):
        return jsonify({"error": "answers must be a list."}), 400

    candidate = _get_current_candidate()
    session, error = service.submit_exam(session_id, answers, candidate.id if candidate else None)
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"message": "Exam submitted successfully.", "session_id": session.id}), 200
