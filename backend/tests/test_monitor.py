import os
import tempfile
import unittest

from backend import create_app, db
from backend.models.exam_models import BrowserLog, Candidate, Exam, ExamSession, FaceLog, Warning
from backend.routes.auth import _issue_token


class SessionMonitoringEndpointsTestCase(unittest.TestCase):
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
                BrowserLog(session_id=session.id, candidate_id=admin.id, event_type="focus_lost"),
                FaceLog(session_id=session.id, candidate_id=admin.id, status="multiple_faces"),
                Warning(session_id=session.id, candidate_id=admin.id, warning_type="Excessive Tab Switching", message="Tab switch warning", severity="Medium"),
                Warning(session_id=session.id, candidate_id=admin.id, warning_type="Multiple Faces Detected", message="Multiple faces warning", severity="High"),
            ])
            db.session.commit()

            self.session_id = session.id
            self.admin_token = _issue_token(admin)
            self.regular_token = _issue_token(regular)

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        os.remove(self.db_path)

    def test_authorized_access_and_monitoring_payloads(self):
        sessions_response = self.client.get(
            "/api/monitor/sessions",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(sessions_response.status_code, 200)
        sessions = sessions_response.get_json()
        self.assertTrue(isinstance(sessions, list))
        self.assertGreaterEqual(len(sessions), 1)

        summary_response = self.client.get(
            f"/api/monitor/session/{self.session_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(summary_response.status_code, 200)
        summary = summary_response.get_json()
        self.assertEqual(summary["session_id"], self.session_id)
        self.assertEqual(summary["candidate_name"], "Admin User")
        self.assertEqual(summary["exam_name"], "Python Test")
        self.assertEqual(summary["warning_count"], 2)
        self.assertEqual(summary["browser_event_count"], 2)
        self.assertEqual(summary["face_event_count"], 1)

        timeline_response = self.client.get(
            f"/api/monitor/timeline/{self.session_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(timeline_response.status_code, 200)
        timeline = timeline_response.get_json()
        self.assertTrue(len(timeline) >= 3)
        self.assertEqual(timeline[0]["type"], "browser")
        self.assertEqual(timeline[-1]["type"], "face")

        warnings_response = self.client.get(
            f"/api/monitor/warnings/{self.session_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(warnings_response.status_code, 200)
        warnings = warnings_response.get_json()
        self.assertTrue(isinstance(warnings, list))
        self.assertEqual(len(warnings), 2)
        self.assertEqual(warnings[0]["warning_type"], "Excessive Tab Switching")

    def test_unauthorized_access_is_rejected(self):
        no_auth_response = self.client.get("/api/monitor/sessions")
        self.assertEqual(no_auth_response.status_code, 401)

        regular_user_response = self.client.get(
            "/api/monitor/sessions",
            headers={"Authorization": f"Bearer {self.regular_token}"},
        )
        self.assertEqual(regular_user_response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
