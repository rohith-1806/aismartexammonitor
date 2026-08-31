from __future__ import annotations

from datetime import datetime
from typing import Any

from backend import db
from backend.models.exam_models import BrowserLog, Candidate, Exam, ExamSession, FaceLog, Warning
from backend.services.integrity_service import IntegrityService


class SessionMonitorService:
    def __init__(self):
        self.db = db
        self.integrity_service = IntegrityService()

    def _is_admin_or_invigilator(self, candidate: Candidate | None) -> bool:
        return candidate is not None and (
            getattr(candidate, "role", "candidate") in {"admin", "invigilator"}
            or candidate.email.lower() in {"admin@gmail.com", "admin@example.com", "invigilator@example.com"}
        )

    def get_all_sessions(self, candidate: Candidate | None) -> list[dict[str, Any]]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        sessions = (
            self.db.session.query(ExamSession)
            .join(Candidate, ExamSession.candidate_id == Candidate.id)
            .join(Exam, ExamSession.exam_id == Exam.id)
            .order_by(ExamSession.id.asc())
            .all()
        )

        result = []
        for session in sessions:
            integrity = self.integrity_service.get_session_integrity(session.id, candidate)
            academic_score = round(
                sum(answer.selected_option == answer.question.correct_option for answer in session.answers)
                / len(session.exam.questions) * 100,
                1,
            ) if session.exam.questions else 0.0
            auto_submitted_for_warning_limit = any(
                "warning limit" in (event.additional_details or "").lower()
                for event in session.browser_logs
            )
            risk_level = "High" if auto_submitted_for_warning_limit else integrity["risk_level"]
            duration_seconds = (
                (session.end_time - session.start_time).total_seconds()
                if session.end_time else None
            )
            session_duration_seconds = duration_seconds or 0
            face_event_count = len(session.face_logs)
            face_present_count = sum(event.status == "face_present" for event in session.face_logs)
            event_timeline = [
                {
                    "timestamp": event.timestamp.isoformat(),
                    "category": "Tab Switches" if event.event_type == "tab_switch" else "Focus Losses",
                }
                for event in session.browser_logs
                if event.event_type in {"tab_switch", "focus_lost"}
            ]
            event_timeline.extend(
                {
                    "timestamp": event.timestamp.isoformat(),
                    "category": "Face Absence" if event.status == "face_absent" else "Multiple Faces",
                }
                for event in session.face_logs
                if event.status in {"face_absent", "multiple_faces"}
            )
            result.append({
                "session_id": session.id,
                "candidate": session.candidate.name,
                "candidate_id": session.candidate.id,
                "exam": session.exam.title,
                "status": session.status,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "duration_minutes": round(duration_seconds / 60, 1) if duration_seconds is not None else None,
                "face_absence_count": sum(event.status == "face_absent" for event in session.face_logs),
                "face_absence_seconds": sum(event.absence_duration_seconds or 0 for event in session.face_logs),
                "multiple_faces_count": sum(event.status == "multiple_faces" for event in session.face_logs),
                "tab_switch_count": sum(event.event_type == "tab_switch" for event in session.browser_logs),
                "focus_loss_count": sum(event.event_type == "focus_lost" for event in session.browser_logs),
                "phone_detected_count": sum(
                    "phone" in (warning.warning_type + " " + warning.message).lower()
                    for warning in session.warnings
                ),
                "face_presence_ratio": round(
                    face_present_count / face_event_count * 100,
                    1,
                ) if face_event_count else 100.0,
                "event_timeline": event_timeline,
                "warnings": len(session.warnings),
                "academic_score": academic_score,
                "integrity_score": integrity["integrity_score"],
                "risk_level": risk_level,
                "auto_submitted_for_warning_limit": auto_submitted_for_warning_limit,
                "warning_details": [warning.message for warning in session.warnings],
                "browser_events": [event.event_type for event in session.browser_logs],
                "face_events": [event.status for event in session.face_logs],
            })
        return result

    def get_session_summary(self, session_id: int, candidate: Candidate | None) -> dict[str, Any]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        session = self.db.session.get(ExamSession, session_id)
        if not session:
            raise ValueError("Session not found.")

        return {
            "session_id": session.id,
            "candidate_name": session.candidate.name,
            "candidate_email": session.candidate.email,
            "exam_name": session.exam.title,
            "start_time": session.start_time.isoformat(),
            "end_time": session.end_time.isoformat() if session.end_time else None,
            "status": session.status,
            "warning_count": len(session.warnings),
            "browser_event_count": len(session.browser_logs),
            "face_event_count": len(session.face_logs),
        }

    def get_session_timeline(self, session_id: int, candidate: Candidate | None) -> list[dict[str, Any]]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        session = self.db.session.get(ExamSession, session_id)
        if not session:
            raise ValueError("Session not found.")

        browser_events = [
            {
                "time": event.timestamp.strftime("%H:%M:%S"),
                "type": "browser",
                "event": event.event_type,
            }
            for event in session.browser_logs
        ]
        face_events = [
            {
                "time": event.timestamp.strftime("%H:%M:%S"),
                "type": "face",
                "event": event.status,
            }
            for event in session.face_logs
        ]

        timeline = browser_events + face_events
        timeline.sort(key=lambda item: item["time"])
        return timeline

    def get_session_warnings(self, session_id: int, candidate: Candidate | None) -> list[dict[str, Any]]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        session = self.db.session.get(ExamSession, session_id)
        if not session:
            raise ValueError("Session not found.")

        return [
            {
                "warning_type": warning.warning_type,
                "severity": warning.severity,
                "timestamp": warning.created_at.isoformat(),
                "details": warning.message,
            }
            for warning in sorted(session.warnings, key=lambda warning: warning.created_at)
        ]
