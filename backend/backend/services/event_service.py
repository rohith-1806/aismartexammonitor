from __future__ import annotations

from typing import Any

from backend import db
from backend.models.exam_models import BrowserLog, ExamSession
from backend.services.warning_service import WarningService


class EventService:
    def __init__(self):
        self.db = db
        self.warning_service = WarningService()

    def save_browser_event(self, session_id: int, candidate_id: int, event_type: str, additional_details: str | None = None) -> dict[str, Any]:
        session = self.db.session.get(ExamSession, session_id)
        if not session:
            raise ValueError("Invalid session ID.")

        if session.candidate_id != candidate_id:
            raise PermissionError("Session does not belong to the authenticated candidate.")

        normalized_event_type = (event_type or "").strip().lower()
        allowed_event_types = {
            "exam_started",
            "exam_page_opened",
            "exam_page_closed",
            "focus_lost",
            "focus_regained",
            "tab_switch",
            "exam_submitted",
        }
        if normalized_event_type not in allowed_event_types:
            raise ValueError("Invalid event type.")

        event = BrowserLog(
            session_id=session_id,
            candidate_id=candidate_id,
            event_type=normalized_event_type,
            additional_details=additional_details,
        )
        self.db.session.add(event)
        self.db.session.commit()
        self.warning_service.evaluate_browser_event(session_id, candidate_id, normalized_event_type, additional_details)
        return {
            "id": event.id,
            "session_id": event.session_id,
            "candidate_id": event.candidate_id,
            "event_type": event.event_type,
            "timestamp": event.timestamp.isoformat(),
            "additional_details": event.additional_details,
        }

    def get_session_events(self, session_id: int, candidate_id: int) -> list[dict[str, Any]]:
        session = self.db.session.get(ExamSession, session_id)
        if not session or session.candidate_id != candidate_id:
            raise PermissionError("Session does not belong to the authenticated candidate.")

        return [
            {
                "id": event.id,
                "session_id": event.session_id,
                "candidate_id": event.candidate_id,
                "event_type": event.event_type,
                "timestamp": event.timestamp.isoformat(),
                "additional_details": event.additional_details,
            }
            for event in self.db.session.query(BrowserLog)
            .filter_by(session_id=session_id)
            .order_by(BrowserLog.timestamp.asc())
            .all()
        ]
