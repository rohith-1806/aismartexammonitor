import os
import tempfile
import unittest

from backend import create_app, db
from backend.models.exam_models import Candidate, Exam, Question


class ExamEndpointsTestCase(unittest.TestCase):
    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(self.db_fd)
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path}"
        self.app = create_app()
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.drop_all()
            db.create_all()
            candidate = Candidate(name="Alice", email="alice@example.com", password_hash="hash", photo_path="/tmp/a.jpg")
            exam = Exam(title="Math Exam", description="Sample", duration=60, total_marks=100)
            db.session.add(candidate)
            db.session.add(exam)
            db.session.flush()
            question = Question(exam_id=exam.id, question_text="2+2?", option_a="3", option_b="4", option_c="5", option_d="6", correct_option="B")
            db.session.add(question)
            db.session.commit()
            self.candidate_id = candidate.id
            self.exam_id = exam.id
            self.question_id = question.id

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        os.remove(self.db_path)

    def _token(self):
        with self.app.app_context():
            from backend.routes.auth import _issue_token
            candidate = db.session.get(Candidate, self.candidate_id)
            return _issue_token(candidate)

    def test_get_exams(self):
        response = self.client.get("/api/exams", headers={"Authorization": f"Bearer {self._token()}"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("exams", response.get_json())

    def test_all_candidates_can_view_deployed_exam(self):
        with self.app.app_context():
            from backend.routes.auth import _issue_token
            candidate = Candidate(name="Jane", email="jane@example.com", password_hash="hash", photo_path="/tmp/j.jpg")
            db.session.add(candidate)
            db.session.commit()
            candidate_token = _issue_token(candidate)

        response = self.client.get("/api/exams", headers={"Authorization": f"Bearer {candidate_token}"})
        self.assertEqual(response.status_code, 200)
        exam_ids = {item["exam_id"] for item in response.get_json()["exams"]}
        self.assertIn(self.exam_id, exam_ids)

    def test_start_and_submit_exam(self):
        start_response = self.client.post(
            "/api/exams/start",
            headers={"Authorization": f"Bearer {self._token()}"},
            json={"candidate_id": self.candidate_id, "exam_id": self.exam_id},
        )
        self.assertEqual(start_response.status_code, 201)
        session_id = start_response.get_json()["session_id"]

        submit_response = self.client.post(
            "/api/exams/submit",
            headers={"Authorization": f"Bearer {self._token()}"},
            json={"session_id": session_id, "answers": [{"question_id": self.question_id, "selected_option": "B"}]},
        )
        self.assertEqual(submit_response.status_code, 200)

        exams_response = self.client.get(
            "/api/exams",
            headers={"Authorization": f"Bearer {self._token()}"},
        )
        self.assertEqual(exams_response.get_json()["exams"][0]["status"], "completed")

        sessions_response = self.client.get(
            "/api/exams/sessions",
            headers={"Authorization": f"Bearer {self._token()}"},
        )
        self.assertEqual(sessions_response.get_json()["sessions"][0]["score"], 100)

    def test_invalid_exam(self):
        response = self.client.get("/api/exams/999999", headers={"Authorization": f"Bearer {self._token()}"})
        self.assertEqual(response.status_code, 404)

    def test_invalid_session(self):
        response = self.client.post(
            "/api/exams/submit",
            headers={"Authorization": f"Bearer {self._token()}"},
            json={"session_id": 999999, "answers": []},
        )
        self.assertEqual(response.status_code, 400)

    def test_unauthorized_access(self):
        response = self.client.get("/api/exams")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
