from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flask import current_app

from backend import db
from backend.models.exam_models import BrowserLog, ExamSession, FaceLog, Warning


class WarningService:
    def __init__(self):
        self.db = db

    def _severity_for(self, warning_type: str) -> str:
        severity_map = {
            "Excessive Tab Switching": "Medium",
            "Candidate Absent": "High",
            "Multiple Faces Detected": "High",
            "Browser Closed": "High",
            "Frequent Focus Loss": "Medium",
        }
        return severity_map.get(warning_type, "Low")

    def _existing_warning(self, session_id: int, warning_type: str) -> Warning | None:
        return (
            self.db.session.query(Warning)
            .filter(Warning.session_id == session_id, Warning.warning_type == warning_type)
            .order_by(Warning.created_at.desc())
            .first()
        )

    def create_warning(self, session_id: int, candidate_id: int, warning_type: str, message: str) -> dict[str, Any] | None:
        session = self.db.session.get(ExamSession, session_id)
        if not session or session.candidate_id != candidate_id:
            return None

        if self._existing_warning(session_id, warning_type):
            return None

        warning = Warning(
            session_id=session_id,
            candidate_id=candidate_id,
            warning_type=warning_type,
            message=message,
            severity=self._severity_for(warning_type),
            created_at=datetime.now(timezone.utc),
        )
        self.db.session.add(warning)
        self.db.session.commit()
        return {
            "id": warning.id,
            "session_id": warning.session_id,
            "candidate_id": warning.candidate_id,
            "warning_type": warning.warning_type,
            "message": warning.message,
            "severity": warning.severity,
            "created_at": warning.created_at.isoformat(),
        }

    def evaluate_browser_event(self, session_id: int, candidate_id: int, event_type: str, additional_details: str | None = None) -> dict[str, Any] | None:
        if event_type == "tab_switch":
            count = (
                self.db.session.query(BrowserLog)
                .filter(BrowserLog.session_id == session_id, BrowserLog.event_type == "tab_switch")
                .count()
            )
            if count > current_app.config.get("TAB_SWITCH_LIMIT", 3):
                return self.create_warning(
                    session_id,
                    candidate_id,
                    "Excessive Tab Switching",
                    "The candidate switched tabs excessively during the exam.",
                )

        if event_type == "focus_lost":
            count = (
                self.db.session.query(BrowserLog)
                .filter(BrowserLog.session_id == session_id, BrowserLog.event_type == "focus_lost")
                .count()
            )
            if count > current_app.config.get("FOCUS_LOSS_LIMIT", 5):
                return self.create_warning(
                    session_id,
                    candidate_id,
                    "Frequent Focus Loss",
                    "The candidate lost focus repeatedly during the exam.",
                )

        if event_type == "exam_page_closed":
            return self.create_warning(
                session_id,
                candidate_id,
                "Browser Closed",
                "The browser window was closed while the exam was in progress.",
            )

        return None

    def evaluate_face_event(self, session_id: int, candidate_id: int, status: str, additional_details: str | None = None) -> dict[str, Any] | None:
        if status == "multiple_faces":
            count = (
                self.db.session.query(FaceLog)
                .filter(FaceLog.session_id == session_id, FaceLog.status == "multiple_faces")
                .count()
            )
            if count >= current_app.config.get("MULTIPLE_FACE_LIMIT", 1):
                return self.create_warning(
                    session_id,
                    candidate_id,
                    "Multiple Faces Detected",
                    "More than one face was detected during the exam.",
                )

        if status == "face_absent":
            latest_absence = (
                self.db.session.query(FaceLog)
                .filter(FaceLog.session_id == session_id, FaceLog.status == "face_absent")
                .order_by(FaceLog.timestamp.desc())
                .first()
            )
            if latest_absence:
                latest_absence_timestamp = latest_absence.timestamp
                if latest_absence_timestamp.tzinfo is None:
                    latest_absence_timestamp = latest_absence_timestamp.replace(tzinfo=timezone.utc)
                else:
                    latest_absence_timestamp = latest_absence_timestamp.astimezone(timezone.utc)
                duration = (datetime.now(timezone.utc) - latest_absence_timestamp).total_seconds()
                if duration > current_app.config.get("FACE_ABSENCE_LIMIT_SECONDS", 120):
                    return self.create_warning(
                        session_id,
                        candidate_id,
                        "Candidate Absent",
                        "The candidate was absent from the exam view for too long.",
                    )

        return None

    def get_session_warnings(self, session_id: int, candidate_id: int) -> list[dict[str, Any]]:
        session = self.db.session.get(ExamSession, session_id)
        if not session or session.candidate_id != candidate_id:
            raise PermissionError("Session does not belong to the authenticated candidate.")

        warnings = (
            self.db.session.query(Warning)
            .filter(Warning.session_id == session_id)
            .order_by(Warning.created_at.asc())
            .all()
        )
        return [
            {
                "id": warning.id,
                "session_id": warning.session_id,
                "candidate_id": warning.candidate_id,
                "warning_type": warning.warning_type,
                "message": warning.message,
                "severity": warning.severity,
                "created_at": warning.created_at.isoformat(),
            }
            for warning in warnings
        ]
