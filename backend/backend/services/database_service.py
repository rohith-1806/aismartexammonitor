from typing import Any

from backend import db
from backend.models.exam_models import Answer, BrowserLog, Candidate, Exam, ExamSession, FaceLog, Question


class DatabaseService:
    def create(self, model: type[db.Model], **kwargs: Any) -> db.Model:
        instance = model(**kwargs)
        db.session.add(instance)
        db.session.commit()
        return instance

    def get_by_id(self, model: type[db.Model], item_id: int) -> db.Model | None:
        return db.session.get(model, item_id)

    def list_all(self, model: type[db.Model]):
        return db.session.query(model).all()

    def update(self, instance: db.Model, **kwargs: Any) -> db.Model:
        for key, value in kwargs.items():
            setattr(instance, key, value)
        db.session.commit()
        return instance

    def delete(self, instance: db.Model) -> None:
        db.session.delete(instance)
        db.session.commit()

    def create_candidate(self, **kwargs: Any) -> Candidate:
        return self.create(Candidate, **kwargs)

    def create_exam(self, **kwargs: Any) -> Exam:
        return self.create(Exam, **kwargs)

    def create_question(self, **kwargs: Any) -> Question:
        return self.create(Question, **kwargs)

    def create_answer(self, **kwargs: Any) -> Answer:
        return self.create(Answer, **kwargs)

    def create_session(self, **kwargs: Any) -> ExamSession:
        return self.create(ExamSession, **kwargs)

    def create_browser_log(self, **kwargs: Any) -> BrowserLog:
        return self.create(BrowserLog, **kwargs)

    def create_face_log(self, **kwargs: Any) -> FaceLog:
        return self.create(FaceLog, **kwargs)
