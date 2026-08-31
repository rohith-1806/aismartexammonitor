from __future__ import annotations

from typing import Any

from backend import db
from backend.models.exam_models import BrowserLog, Candidate, Exam, ExamSession, FaceLog, Warning
from backend.services.integrity_service import IntegrityService


class DashboardService:
    def __init__(self):
        self.db = db
        self.integrity_service = IntegrityService()

    def _is_admin_or_invigilator(self, candidate: Candidate | None) -> bool:
        return candidate is not None and (
            getattr(candidate, "role", "candidate") in {"admin", "invigilator"}
            or candidate.email.lower() in {"admin@gmail.com", "admin@example.com", "invigilator@example.com"}
        )

    def get_summary(self, candidate: Candidate | None) -> dict[str, Any]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        total_candidates = self.db.session.query(Candidate).filter(Candidate.role != "admin").count()
        total_exams = self.db.session.query(Exam).count()
        total_sessions = self.db.session.query(ExamSession).count()
        completed_sessions = self.db.session.query(ExamSession).filter(ExamSession.status == "Completed").count()
        active_sessions = self.db.session.query(ExamSession).filter(ExamSession.status != "Completed").count()
        browser_events = self.db.session.query(BrowserLog).count()
        face_events = self.db.session.query(FaceLog).count()
        warnings = self.db.session.query(Warning).count()

        all_sessions = self.db.session.query(ExamSession).all()
        integrity_scores = [
            self.integrity_service.get_session_integrity(session.id, candidate)["integrity_score"]
            for session in all_sessions
        ]
        average_integrity_score = round(sum(integrity_scores) / len(integrity_scores), 1) if integrity_scores else 0.0
        completed_candidate_ids = {
            session.candidate_id for session in all_sessions if session.status == "Completed"
        }
        attendance_percentage = round(
            len(completed_candidate_ids) / total_candidates * 100, 1
        ) if total_candidates else 0.0
        performance_scores = []
        for session in all_sessions:
            if session.status != "Completed" or not session.exam.questions:
                continue
            performance_scores.append(round(
                sum(answer.selected_option == answer.question.correct_option for answer in session.answers)
                / len(session.exam.questions) * 100,
                1,
            ))
        average_score = round(sum(performance_scores) / len(performance_scores), 1) if performance_scores else 0.0

        high_risk_sessions = 0
        critical_sessions = 0
        for session, score in zip(all_sessions, integrity_scores):
            warning_limit_exceeded = len(session.warnings) > 4 or any(
                "warning limit" in (event.additional_details or "").lower()
                for event in session.browser_logs
            )
            if warning_limit_exceeded:
                high_risk_sessions += 1
            elif score <= 39:
                critical_sessions += 1

        return {
            "total_candidates": total_candidates,
            "total_exams": total_exams,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "active_sessions": active_sessions,
            "browser_events": browser_events,
            "face_events": face_events,
            "warnings": warnings,
            "average_integrity_score": average_integrity_score,
            "attendance_percentage": attendance_percentage,
            "average_score": average_score,
            "high_risk_sessions": high_risk_sessions,
            "critical_sessions": critical_sessions,
        }

    def get_recent_sessions(self, candidate: Candidate | None) -> list[dict[str, Any]]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        sessions = (
            self.db.session.query(ExamSession)
            .order_by(ExamSession.id.desc())
            .limit(10)
            .all()
        )

        result = []
        for session in sessions:
            integrity = self.integrity_service.get_session_integrity(session.id, candidate)
            result.append({
                "session_id": session.id,
                "candidate_name": session.candidate.name,
                "exam_name": session.exam.title,
                "status": session.status,
                "integrity_score": integrity["integrity_score"],
                "risk_level": integrity["risk_level"],
                "warning_count": len(session.warnings),
            })
        return result

    def get_high_risk_sessions(self, candidate: Candidate | None) -> list[dict[str, Any]]:
        if not self._is_admin_or_invigilator(candidate):
            raise PermissionError("Admin or invigilator access required.")

        sessions = (
            self.db.session.query(ExamSession)
            .order_by(ExamSession.id.asc())
            .all()
        )

        result = []
        for session in sessions:
            integrity = self.integrity_service.get_session_integrity(session.id, candidate)
            risk = integrity["risk_level"]
            if risk in {"High", "Critical"}:
                result.append({
                    "session_id": session.id,
                    "candidate_name": session.candidate.name,
                    "exam_name": session.exam.title,
                    "status": session.status,
                    "integrity_score": integrity["integrity_score"],
                    "risk_level": risk,
                    "warning_count": len(session.warnings),
                })
        return result

    def get_candidate_analytics(self, candidate_id: int, requester: Candidate | None) -> dict[str, Any]:
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

        completed_exams = [session.exam.title for session in sessions if session.status == "Completed"]
        integrity_scores = [
            self.integrity_service.get_session_integrity(session.id, requester)["integrity_score"]
            for session in sessions
        ]

        return {
            "candidate": {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "photo_path": candidate.photo_path,
            },
            "completed_exams": completed_exams,
            "integrity_scores": integrity_scores,
            "warnings": [
                {
                    "session_id": session.id,
                    "warning_type": warning.warning_type,
                    "severity": warning.severity,
                    "timestamp": warning.created_at.isoformat(),
                    "details": warning.message,
                }
                for session in sessions
                for warning in session.warnings
            ],
            "browser_event_count": sum(len(session.browser_logs) for session in sessions),
            "face_event_count": sum(len(session.face_logs) for session in sessions),
        }
