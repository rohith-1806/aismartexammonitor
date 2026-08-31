import os
import tempfile
import unittest

from backend import create_app, db
from backend.models.exam_models import Candidate, Exam, ExamSession
from backend.routes.auth import _issue_token


class WarningEngineTestCase(unittest.TestCase):
    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(self.db_fd)
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_path}"
        self.app = create_app()
        self.app.config.update(TESTING=True)
        self.app.config["TAB_SWITCH_LIMIT"] = 3
        self.app.config["FACE_ABSENCE_LIMIT_SECONDS"] = 0
        self.app.config["FOCUS_LOSS_LIMIT"] = 5
        self.app.config["MULTIPLE_FACE_LIMIT"] = 1
        self.client = self.app.test_client()
        with self.app.app_context():
            db.drop_all()
            db.create_all()
            candidate = Candidate(name="Alice", email="alice-warning@example.com", password_hash="hash", photo_path="/tmp/a.jpg")
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

    def test_tab_switch_rule_generates_warning(self):
        for _ in range(4):
            response = self.client.post(
                "/api/events/browser",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"session_id": self.session_id, "event_type": "tab_switch"},
            )
            self.assertEqual(response.status_code, 201)

        response = self.client.get(
            f"/api/events/warnings/{self.session_id}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(response.status_code, 200)
        warnings = response.get_json()["warnings"]
        self.assertTrue(any(item["warning_type"] == "Excessive Tab Switching" for item in warnings))

    def test_face_absence_rule_generates_warning(self):
        self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "status": "face_absent"},
        )
        response = self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "status": "face_present"},
        )
        self.assertEqual(response.status_code, 201)

        warnings_response = self.client.get(
            f"/api/events/warnings/{self.session_id}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(warnings_response.status_code, 200)
        warnings = warnings_response.get_json()["warnings"]
        self.assertTrue(any(item["warning_type"] == "Candidate Absent" for item in warnings))

    def test_multiple_faces_rule_generates_warning(self):
        response = self.client.post(
            "/api/events/face",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "status": "multiple_faces"},
        )
        self.assertEqual(response.status_code, 201)

        warnings_response = self.client.get(
            f"/api/events/warnings/{self.session_id}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        warnings = warnings_response.get_json()["warnings"]
        self.assertTrue(any(item["warning_type"] == "Multiple Faces Detected" for item in warnings))

    def test_focus_loss_rule_generates_warning(self):
        for _ in range(6):
            response = self.client.post(
                "/api/events/browser",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"session_id": self.session_id, "event_type": "focus_lost"},
            )
            self.assertEqual(response.status_code, 201)

        warnings_response = self.client.get(
            f"/api/events/warnings/{self.session_id}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        warnings = warnings_response.get_json()["warnings"]
        self.assertTrue(any(item["warning_type"] == "Frequent Focus Loss" for item in warnings))

    def test_browser_closed_rule_generates_warning(self):
        response = self.client.post(
            "/api/events/browser",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"session_id": self.session_id, "event_type": "exam_page_closed"},
        )
        self.assertEqual(response.status_code, 201)

        warnings_response = self.client.get(
            f"/api/events/warnings/{self.session_id}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        warnings = warnings_response.get_json()["warnings"]
        self.assertTrue(any(item["warning_type"] == "Browser Closed" for item in warnings))

    def test_duplicate_warnings_are_not_created(self):
        for _ in range(4):
            self.client.post(
                "/api/events/browser",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"session_id": self.session_id, "event_type": "tab_switch"},
            )

        warnings_response = self.client.get(
            f"/api/events/warnings/{self.session_id}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        warnings = warnings_response.get_json()["warnings"]
        self.assertEqual(sum(1 for item in warnings if item["warning_type"] == "Excessive Tab Switching"), 1)

    def test_warning_count_endpoint(self):
        for _ in range(4):
            self.client.post(
                "/api/events/browser",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"session_id": self.session_id, "event_type": "tab_switch"},
            )

        count_response = self.client.get(
            f"/api/events/warning-count/{self.session_id}",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        self.assertEqual(count_response.status_code, 200)
        self.assertEqual(count_response.get_json()["count"], 1)

    def test_unauthorized_access_is_rejected(self):
        response = self.client.get(f"/api/events/warnings/{self.session_id}")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
