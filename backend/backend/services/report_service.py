from __future__ import annotations

from typing import Any

from backend import db
from backend.models.exam_models import BrowserLog, Candidate, ExamSession, FaceLog, Warning
from backend.services.integrity_service import IntegrityService


from backend.services.ai_report_agent import LangChainReportAgent


class ReportService:
    def __init__(self):
        self.db = db
        self.integrity_service = IntegrityService()
        self.ai_report_agent = LangChainReportAgent()

    def _is_admin_or_invigilator(self, candidate: Candidate | None) -> bool:
        if candidate is None:
            return False
        role = getattr(candidate, "role", "candidate")
        return role in {"admin", "invigilator"} or candidate.email.lower() in {"admin@gmail.com", "admin@example.com", "invigilator@example.com"}

    def get_ai_session_report(self, session_id: int, candidate: Candidate | None) -> dict[str, Any]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Access Denied: Students are not authorized to view proctoring AI integrity reports.")

        session_report = self.get_session_report(session_id, candidate)
        session = self.db.session.get(ExamSession, session_id)
        if not session:
            raise ValueError("Session not found.")
        candidate_data = session_report.get("candidate", {})
        exam_data = session_report.get("exam", {})

        report = self.ai_report_agent.generate_ai_report(
            candidate_name=candidate_data.get("name", "Candidate"),
            exam_title=exam_data.get("title", "Exam"),
            session_duration=exam_data.get("duration", 60),
            integrity_score=session_report.get("integrity_score", 100.0),
            browser_logs=session_report.get("browser_events", []),
            face_logs=session_report.get("face_events", []),
            warnings=session_report.get("warnings", [])
        )
        report["session_id"] = session.id
        report["academic_score"] = round(
            sum(answer.selected_option == answer.question.correct_option for answer in session.answers)
            / len(session.exam.questions) * 100,
            1,
        ) if session.exam.questions else 0.0
        report["auto_submitted_for_warning_limit"] = any(
            "warning limit" in (event.get("additional_details") or "").lower()
            for event in session_report.get("browser_events", [])
        )
        if report["auto_submitted_for_warning_limit"]:
            report["submission_reason"] = "Automatically submitted because the warning limit was exceeded."
        return report


    def get_session_report(self, session_id: int, candidate: Candidate | None) -> dict[str, Any]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        session = self.db.session.get(ExamSession, session_id)
        if not session:
            raise ValueError("Session not found.")

        integrity = self.integrity_service.get_session_integrity(session.id, candidate)

        return {
            "session": {
                "id": session.id,
                "status": session.status,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
            },
            "candidate": {
                "id": session.candidate.id,
                "name": session.candidate.name,
                "email": session.candidate.email,
            },
            "exam": {
                "id": session.exam.id,
                "title": session.exam.title,
                "description": session.exam.description,
                "duration": session.exam.duration,
                "total_marks": session.exam.total_marks,
            },
            "integrity_score": integrity["integrity_score"],
            "risk_level": integrity["risk_level"],
            "browser_events": [
                {
                    "id": event.id,
                    "event_type": event.event_type,
                    "timestamp": event.timestamp.isoformat(),
                    "additional_details": event.additional_details,
                }
                for event in session.browser_logs
            ],
            "face_events": [
                {
                    "id": event.id,
                    "status": event.status,
                    "timestamp": event.timestamp.isoformat(),
                    "absence_duration_seconds": event.absence_duration_seconds,
                    "additional_details": event.additional_details,
                }
                for event in session.face_logs
            ],
            "warnings": [
                {
                    "id": warning.id,
                    "warning_type": warning.warning_type,
                    "severity": warning.severity,
                    "timestamp": warning.created_at.isoformat(),
                    "details": warning.message,
                }
                for warning in session.warnings
            ],
        }

    def get_candidate_report(self, candidate_id: int, requester: Candidate | None) -> dict[str, Any]:
        if not self._is_admin_or_invigilator(requester):
            raise PermissionError("Admin or invigilator access required.")

        candidate = self.db.session.get(Candidate, candidate_id)
        if not candidate:
            raise ValueError("Candidate not found.")

        sessions = (
            self.db.session.query(ExamSession)
            .filter(ExamSession.candidate_id == candidate_id)
            .order_by(ExamSession.id.asc())
            .all()
        )

        integrity_scores = [self.integrity_service.get_session_integrity(session.id, requester)["integrity_score"] for session in sessions]
        average_integrity_score = round(sum(integrity_scores) / len(integrity_scores), 1) if integrity_scores else 0.0
        warning_history = [
            {
                "session_id": session.id,
                "warning_type": warning.warning_type,
                "severity": warning.severity,
                "timestamp": warning.created_at.isoformat(),
                "details": warning.message,
            }
            for session in sessions
            for warning in session.warnings
        ]

        return {
            "candidate": {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "photo_path": candidate.photo_path,
            },
            "completed_exams": [session.exam.title for session in sessions if session.status == "Completed"],
            "average_integrity_score": average_integrity_score,
            "warning_history": warning_history,
        }
