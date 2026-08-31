from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Integer, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend import db


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Candidate(db.Model):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="candidate", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)


    sessions: Mapped[list["ExamSession"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Candidate {self.name}>"


class Exam(db.Model):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False)

    questions: Mapped[list["Question"]] = relationship(back_populates="exam", cascade="all, delete-orphan")
    sessions: Mapped[list["ExamSession"]] = relationship(back_populates="exam", cascade="all, delete-orphan")
    assignments: Mapped[list["ExamAssignment"]] = relationship(back_populates="exam", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Exam {self.title}>"


class ExamAssignment(db.Model):
    __tablename__ = "exam_assignments"
    __table_args__ = (UniqueConstraint("exam_id", "candidate_id", name="uq_exam_candidate_assignment"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False, index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False, index=True)
    assigned_by: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="assigned", nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)

    exam: Mapped["Exam"] = relationship(back_populates="assignments", foreign_keys=[exam_id])
    candidate: Mapped["Candidate"] = relationship(foreign_keys=[candidate_id])
    assigner: Mapped["Candidate"] = relationship(foreign_keys=[assigned_by])


class Question(db.Model):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    option_a: Mapped[str] = mapped_column(String(255), nullable=False)
    option_b: Mapped[str] = mapped_column(String(255), nullable=False)
    option_c: Mapped[str] = mapped_column(String(255), nullable=False)
    option_d: Mapped[str] = mapped_column(String(255), nullable=False)
    correct_option: Mapped[str] = mapped_column(String(10), nullable=False)

    exam: Mapped["Exam"] = relationship(back_populates="questions")
    answers: Mapped[list["Answer"]] = relationship(back_populates="question", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Question {self.id}>"


class Answer(db.Model):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("exam_sessions.id"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False, index=True)
    selected_option: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    answered_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)

    session: Mapped["ExamSession"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")

    def __repr__(self) -> str:
        return f"<Answer {self.id}>"


class ExamSession(db.Model):
    __tablename__ = "exam_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False, index=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="started", nullable=False)
    integrity_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    candidate: Mapped["Candidate"] = relationship(back_populates="sessions")
    exam: Mapped["Exam"] = relationship(back_populates="sessions")
    answers: Mapped[list["Answer"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    browser_logs: Mapped[list["BrowserLog"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    face_logs: Mapped[list["FaceLog"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    warnings: Mapped[list["Warning"]] = relationship(back_populates="session", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ExamSession {self.id}>"


class BrowserLog(db.Model):
    __tablename__ = "browser_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("exam_sessions.id"), nullable=False, index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)
    additional_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    session: Mapped["ExamSession"] = relationship(back_populates="browser_logs")

    def __repr__(self) -> str:
        return f"<BrowserLog {self.event_type}>"


class FaceLog(db.Model):
    __tablename__ = "face_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("exam_sessions.id"), nullable=False, index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="face_present")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)
    additional_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    absence_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    face_present: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    multiple_faces: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    session: Mapped["ExamSession"] = relationship(back_populates="face_logs")


class Warning(db.Model):
    __tablename__ = "warnings"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("exam_sessions.id"), nullable=False, index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False, index=True)
    warning_type: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)

    session: Mapped["ExamSession"] = relationship(back_populates="warnings")

    def __repr__(self) -> str:
        return f"<FaceLog {self.id}>"
