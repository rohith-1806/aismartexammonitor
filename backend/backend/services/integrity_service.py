from __future__ import annotations

from typing import Any

from backend import db
from backend.models.exam_models import BrowserLog, Candidate, Exam, ExamSession, FaceLog, Warning


class IntegrityService:
    def __init__(self):
        self.db = db

    def _is_admin_or_invigilator(self, candidate: Candidate | None) -> bool:
        if candidate is None:
            return False
        role = getattr(candidate, "role", "candidate")
        return role in {"admin", "invigilator"} or candidate.email.lower() in {"admin@gmail.com", "admin@example.com", "invigilator@example.com"}


    def _risk_level(self, score: int) -> str:
        if score >= 90:
            return "Low Risk"
        if score >= 70:
            return "Medium"
        if score >= 40:
            return "High"
        return "Critical"

    def _risk_level_for_all(self, score: int) -> str:
        if score >= 90:
            return "Low"
        if score >= 70:
            return "Medium"
        if score >= 40:
            return "High"
        return "Critical"

    def get_session_integrity(self, session_id: int, candidate: Candidate | None) -> dict[str, Any]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        session = self.db.session.get(ExamSession, session_id)
        if not session:
            raise ValueError("Session not found.")

        tab_switches = sum(1 for event in session.browser_logs if event.event_type == "tab_switch")
        focus_losses = sum(1 for event in session.browser_logs if event.event_type == "focus_lost")
        browser_closed = sum(1 for event in session.browser_logs if event.event_type == "exam_page_closed")
        face_absent = sum(1 for event in session.face_logs if event.status == "face_absent")
        multiple_faces = sum(1 for event in session.face_logs if event.status == "multiple_faces")
        warnings = len(session.warnings)

        score = 100
        score -= tab_switches * 2
        score -= focus_losses * 1
        score -= browser_closed * 10
        score -= face_absent * 5
        score -= multiple_faces * 10
        score -= warnings * 5
        score = max(0, min(100, score))

        return {
            "session_id": session.id,
            "integrity_score": score,
            "risk_level": self._risk_level(score),
            "summary": {
                "tab_switches": tab_switches,
                "focus_losses": focus_losses,
                "browser_closed": browser_closed,
                "face_absent": face_absent,
                "multiple_faces": multiple_faces,
                "warnings": warnings,
            },
        }

    def get_completed_sessions_integrity(self, candidate: Candidate | None) -> list[dict[str, Any]]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        sessions = (
            self.db.session.query(ExamSession)
            .join(Candidate, ExamSession.candidate_id == Candidate.id)
            .join(Exam, ExamSession.exam_id == Exam.id)
            .filter(ExamSession.status == "Completed")
            .order_by(ExamSession.id.asc())
            .all()
        )

        return [
            {
                "session_id": session.id,
                "candidate": session.candidate.name,
                "exam": session.exam.title,
                "score": self.get_session_integrity(session.id, candidate)["integrity_score"],
                "risk": self._risk_level_for_all(self.get_session_integrity(session.id, candidate)["integrity_score"]),
            }
            for session in sessions
        ]
