from typing import Any

from sqlalchemy.exc import SQLAlchemyError

from backend import db
from backend.models.exam_models import Answer, Candidate, Exam, ExamAssignment, ExamSession, Question
from backend.services.database_service import DatabaseService


class ExamService:
    def __init__(self, database_service: DatabaseService | None = None):
        self.database_service = database_service or DatabaseService()

    def list_exams(self, candidate: Candidate | None = None) -> list[dict[str, Any]]:
        exams = db.session.query(Exam).all()
        completed_exam_ids = set()
        if candidate:
            completed_exam_ids = {
                session.exam_id
                for session in candidate.sessions
                if session.status == "Completed"
            }
        return [
            {
                "exam_id": exam.id,
                "title": exam.title,
                "description": exam.description,
                "duration": exam.duration,
                "total_marks": exam.total_marks,
                "total_questions": len(exam.questions),
                "difficulty": self._difficulty_for_exam(exam),
                "status": "completed" if exam.id in completed_exam_ids else (
                    "assigned" if candidate and any(
                        assignment.candidate_id == candidate.id and assignment.status == "assigned"
                        for assignment in exam.assignments
                    ) else "available"
                ),
            }
            for exam in exams
        ]

    def _difficulty_for_exam(self, exam: Exam) -> str:
        if not exam.questions:
            return "Assigned"

        question_lengths = [
            len(question.question_text) + sum(
                len(getattr(question, option))
                for option in ("option_a", "option_b", "option_c", "option_d")
            )
            for question in exam.questions
        ]
        average_length = sum(question_lengths) / len(question_lengths)
        advanced_terms = ("complexity", "optimize", "architecture", "concurrency", "recursion", "normalization")
        advanced_count = sum(
            any(term in question.question_text.lower() for term in advanced_terms)
            for question in exam.questions
        )
        if advanced_count >= max(2, len(exam.questions) // 3) or average_length >= 260:
            return "Advanced"
        if average_length >= 150 or advanced_count:
            return "Intermediate"
        return "Beginner"

    def create_exam(self, payload: dict[str, Any], admin: Candidate) -> tuple[dict[str, Any] | None, str | None]:
        title = str(payload.get("title") or "").strip()
        description = str(payload.get("description") or "").strip()
        duration = payload.get("duration")
        total_marks = payload.get("total_marks", 100)
        questions = payload.get("questions") or []
        candidate_ids = payload.get("candidate_ids")

        if not title or not isinstance(duration, int) or not 30 <= duration <= 45:
            return None, "title and a duration between 30 and 45 minutes are required."
        if not isinstance(questions, list) or not 10 <= len(questions) <= 20:
            return None, "between 10 and 20 questions are required."
        if not isinstance(total_marks, int) or total_marks <= 0:
            return None, "total_marks must be a positive integer."

        candidates = db.session.query(Candidate).filter(Candidate.role != "admin").all()
        if candidate_ids is not None:
            if not isinstance(candidate_ids, list) or not all(isinstance(item, int) for item in candidate_ids):
                return None, "candidate_ids must be a list of integers."
            candidates = [candidate for candidate in candidates if candidate.id in candidate_ids]
        if not candidates:
            candidates = [admin]

        exam = Exam(title=title, description=description or None, duration=duration, total_marks=total_marks)
        db.session.add(exam)
        db.session.flush()
        for item in questions:
            if not all(str(item.get(field) or "").strip() for field in ("question_text", "option_a", "option_b", "option_c", "option_d", "correct_option")):
                db.session.rollback()
                return None, "Every question must include text, four options, and a correct option."
            db.session.add(Question(exam_id=exam.id, **{field: str(item[field]).strip() for field in ("question_text", "option_a", "option_b", "option_c", "option_d", "correct_option")}))
        for candidate in candidates:
            db.session.add(ExamAssignment(exam_id=exam.id, candidate_id=candidate.id, assigned_by=admin.id))
        db.session.commit()
        return self._exam_summary(exam), None

    def _exam_summary(self, exam: Exam) -> dict[str, Any]:
        return {
            "exam_id": exam.id,
            "title": exam.title,
            "description": exam.description,
            "duration": exam.duration,
            "total_marks": exam.total_marks,
            "total_questions": len(exam.questions),
            "difficulty": self._difficulty_for_exam(exam),
            "assignment_count": len(exam.assignments),
        }

    def get_exam_details(self, exam_id: int) -> dict[str, Any] | None:
        exam = db.session.get(Exam, exam_id)
        if not exam:
            return None

        return {
            "exam_id": exam.id,
            "title": exam.title,
            "description": exam.description,
            "duration": exam.duration,
            "total_marks": exam.total_marks,
            "difficulty": self._difficulty_for_exam(exam),
            "questions": [
                {
                    "question_id": question.id,
                    "question_text": question.question_text,
                    "option_a": question.option_a,
                    "option_b": question.option_b,
                    "option_c": question.option_c,
                    "option_d": question.option_d,
                }
                for question in exam.questions
            ],
        }

    def get_exam_preview(self, exam_id: int) -> dict[str, Any] | None:
        preview = self.get_exam_details(exam_id)
        if not preview:
            return None

        exam = db.session.get(Exam, exam_id)
        preview["questions"] = [
            {
                "question_id": question.id,
                "question_text": question.question_text,
                "option_a": question.option_a,
                "option_b": question.option_b,
                "option_c": question.option_c,
                "option_d": question.option_d,
                "correct_option": question.correct_option,
            }
            for question in exam.questions
        ]
        return preview

    def list_candidate_sessions(self, candidate_id: int) -> list[dict[str, Any]]:
        sessions = (
            db.session.query(ExamSession)
            .filter_by(candidate_id=candidate_id)
            .order_by(ExamSession.id.desc())
            .all()
        )
        return [
            {
                "session_id": session.id,
                "exam_id": session.exam_id,
                "exam": session.exam.title,
                "status": session.status,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "answered_questions": len(session.answers),
                "score": round(
                    sum(answer.selected_option == answer.question.correct_option for answer in session.answers)
                    / len(session.exam.questions) * 100
                ) if session.exam.questions else 0,
            }
            for session in sessions
        ]

    def start_exam(self, candidate_id: int, exam_id: int) -> tuple[ExamSession | None, str | None]:
        candidate = db.session.get(Candidate, candidate_id)
        if not candidate:
            return None, "Invalid candidate ID."

        exam = db.session.get(Exam, exam_id)
        if not exam:
            return None, "Invalid exam ID."

        assignment = (
            db.session.query(ExamAssignment)
            .filter_by(exam_id=exam_id, candidate_id=candidate_id)
            .first()
        )

        if getattr(candidate, "role", "candidate") not in {"admin", "invigilator"}:
            if assignment is None:
                assignment = ExamAssignment(
                    exam_id=exam_id,
                    candidate_id=candidate_id,
                    assigned_by=candidate_id,
                    status="assigned",
                )
                db.session.add(assignment)
            elif assignment.status not in {"assigned", "available"}:
                return None, "This exam is not assigned to the candidate."

        existing_session = (
            db.session.query(ExamSession)
            .filter_by(candidate_id=candidate_id, exam_id=exam_id)
            .filter(ExamSession.status != "Completed")
            .first()
        )
        if existing_session:
            return None, "A session for this candidate and exam is already in progress."

        try:
            if assignment:
                assignment.status = "started"
            session = self.database_service.create_session(
                candidate_id=candidate_id,
                exam_id=exam_id,
                status="In Progress",
            )
            return session, None
        except SQLAlchemyError:
            db.session.rollback()
            db.session.remove()
            return None, "Unable to start exam session."

    def submit_exam(self, session_id: int, answers: list[dict[str, Any]], candidate_id: int | None = None) -> tuple[ExamSession | None, str | None]:
        session = db.session.get(ExamSession, session_id)
        if not session:
            return None, "Invalid session ID."

        if candidate_id is None or session.candidate_id != candidate_id:
            return None, "Session does not belong to the authenticated candidate."

        if session.status == "Completed":
            return None, "Session already completed."

        exam_id = session.exam_id
        valid_question_ids = {question.id for question in db.session.query(Question).filter_by(exam_id=exam_id).all()}

        for answer_payload in answers:
            question_id = answer_payload.get("question_id")
            selected_option = answer_payload.get("selected_option")
            if question_id not in valid_question_ids:
                return None, "One or more question IDs are invalid for this exam."
            if not isinstance(selected_option, str) or not selected_option.strip():
                return None, "Selected option is required."

            existing_answer = (
                db.session.query(Answer)
                .filter_by(session_id=session_id, question_id=question_id)
                .first()
            )
            if existing_answer:
                return None, "Duplicate answer submission detected."

        try:
            for answer_payload in answers:
                self.database_service.create_answer(
                    session_id=session_id,
                    question_id=answer_payload.get("question_id"),
                    selected_option=answer_payload.get("selected_option"),
                )

            session.end_time = db.func.current_timestamp() if hasattr(db.func, "current_timestamp") else None
            session.status = "Completed"
            assignment = (
                db.session.query(ExamAssignment)
                .filter_by(exam_id=session.exam_id, candidate_id=session.candidate_id)
                .first()
            )
            if assignment:
                assignment.status = "completed"
            db.session.commit()
            return session, None
        except SQLAlchemyError:
            db.session.rollback()
            db.session.remove()
            return None, "Unable to submit exam answers."
