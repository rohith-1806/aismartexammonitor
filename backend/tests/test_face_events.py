import os
import tempfile
import unittest
from time import sleep

from backend import create_app, db
from backend.models.exam_models import Candidate, Exam, ExamSession
from backend.routes.auth import _issue_token


class FaceEventEndpointsTestCase(unittest.TestCase):
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

    def test_face_present_event_is_logged(self):
        response = self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "status": "face_present"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["event"]["status"], "face_present")

    def test_face_absent_event_tracks_duration_when_face_returns(self):
        first_response = self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "status": "face_absent"},
        )
        self.assertEqual(first_response.status_code, 201)

        sleep(0.02)

        second_response = self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "status": "face_present"},
        )
        self.assertEqual(second_response.status_code, 201)
        self.assertGreaterEqual(second_response.get_json()["event"]["absence_duration_seconds"], 0)

    def test_multiple_faces_event_is_logged(self):
        response = self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "status": "multiple_faces"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["event"]["status"], "multiple_faces")

    def test_invalid_status_is_rejected(self):
        response = self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "status": "unknown_status"},
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_session_is_rejected(self):
        response = self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": 99999, "status": "face_present"},
        )
        self.assertEqual(response.status_code, 400)

    def test_unauthorized_requests_are_rejected(self):
        response = self.client.post(
            "/api/events/face",
            json={"session_id": self.session_id, "status": "face_present"},
        )
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
