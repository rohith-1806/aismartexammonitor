import os
import tempfile
import unittest

from backend import create_app, db
from backend.models.exam_models import BrowserLog, Candidate, Exam, ExamSession, FaceLog, Warning
from backend.routes.auth import _issue_token


class ReportEndpointsTestCase(unittest.TestCase):
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

            admin = Candidate(name="Admin User", email="admin@example.com", password_hash="hash", photo_path="/tmp/admin.jpg")
            regular = Candidate(name="Regular User", email="user@example.com", password_hash="hash", photo_path="/tmp/user.jpg")
            exam = Exam(title="Python Test", description="Sample", duration=60, total_marks=100)
            db.session.add_all([admin, regular, exam])
            db.session.flush()

            session = ExamSession(candidate_id=admin.id, exam_id=exam.id, status="Completed")
            db.session.add(session)
            db.session.flush()

            db.session.add_all([
                BrowserLog(session_id=session.id, candidate_id=admin.id, event_type="tab_switch"),
                FaceLog(session_id=session.id, candidate_id=admin.id, status="face_absent"),
                Warning(session_id=session.id, candidate_id=admin.id, warning_type="Excessive Tab Switching", message="Warn", severity="Medium"),
            ])
            db.session.commit()

            self.session_id = session.id
            self.admin_token = _issue_token(admin)
            self.regular_token = _issue_token(regular)

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        os.remove(self.db_path)

    def test_session_report(self):
        response = self.client.get(
            f"/api/reports/session/{self.session_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["session"]["id"], self.session_id)
        self.assertEqual(payload["candidate"]["name"], "Admin User")
        self.assertEqual(payload["exam"]["title"], "Python Test")
        self.assertEqual(len(payload["browser_events"]), 1)
        self.assertEqual(len(payload["face_events"]), 1)
        self.assertEqual(len(payload["warnings"]), 1)

    def test_candidate_report_and_authorization(self):
        response = self.client.get(
            "/api/reports/candidate/1",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["candidate"]["name"], "Admin User")
        self.assertEqual(payload["average_integrity_score"], 88.0)

        unauthorized_response = self.client.get("/api/reports/session/1")
        self.assertEqual(unauthorized_response.status_code, 401)

        regular_response = self.client.get(
            "/api/reports/session/1",
            headers={"Authorization": f"Bearer {self.regular_token}"},
        )
        self.assertEqual(regular_response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
