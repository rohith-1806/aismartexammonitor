import os
import tempfile
import unittest

from backend import create_app, db
from backend.models.exam_models import Candidate, Exam, ExamSession
from backend.routes.auth import _issue_token


class EventEndpointsTestCase(unittest.TestCase):
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
            session = ExamSession(candidate_id=candidate.id, exam_id=exam.id, status="In Progress")
            db.session.add(session)
            db.session.commit()
            self.session_id = session.id
            self.token = _issue_token(candidate)

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        os.remove(self.db_path)

    def test_browser_event_logging_and_retrieval(self):
        response = self.client.post(
            "/api/events/browser",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "event_type": "tab_switch", "additional_details": "switched tab"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["event"]["event_type"], "tab_switch")

        list_response = self.client.get(
            f"/api/events/session/{self.session_id}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.get_json()["events"]), 1)

    def test_invalid_event_type(self):
        response = self.client.post(
            "/api/events/browser",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "event_type": "unsupported_event"},
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_payloads(self):
        response = self.client.post(
            "/api/events/browser",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": "abc", "event_type": "tab_switch"},
        )
        self.assertEqual(response.status_code, 400)

    def test_unauthorized_requests(self):
        response = self.client.post(
            "/api/events/browser",
            json={"session_id": self.session_id, "event_type": "tab_switch"},
        )
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
