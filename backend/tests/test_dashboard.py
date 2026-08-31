import os
import tempfile
import unittest

from backend import create_app, db
from backend.models.exam_models import BrowserLog, Candidate, Exam, ExamSession, FaceLog, Warning
from backend.routes.auth import _issue_token


class DashboardEndpointsTestCase(unittest.TestCase):
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

            completed_session = ExamSession(candidate_id=admin.id, exam_id=exam.id, status="Completed")
            active_session = ExamSession(candidate_id=admin.id, exam_id=exam.id, status="In Progress")
            db.session.add_all([completed_session, active_session])
            db.session.flush()

            db.session.add_all([
                BrowserLog(session_id=completed_session.id, candidate_id=admin.id, event_type="tab_switch"),
                FaceLog(session_id=completed_session.id, candidate_id=admin.id, status="face_absent"),
                Warning(session_id=completed_session.id, candidate_id=admin.id, warning_type="Excessive Tab Switching", message="Warn", severity="Medium"),
            ])
            db.session.commit()

            self.admin_token = _issue_token(admin)
            self.regular_token = _issue_token(regular)

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        os.remove(self.db_path)

    def test_dashboard_summary(self):
        response = self.client.get(
            "/api/dashboard/summary",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["total_candidates"], 2)
        self.assertEqual(payload["total_exams"], 1)
        self.assertEqual(payload["total_sessions"], 2)
        self.assertEqual(payload["completed_sessions"], 1)
        self.assertEqual(payload["active_sessions"], 1)
        self.assertEqual(payload["browser_events"], 1)
        self.assertEqual(payload["face_events"], 1)
        self.assertEqual(payload["warnings"], 1)

    def test_recent_sessions_and_high_risk_sessions(self):
        recent_response = self.client.get(
            "/api/dashboard/recent-sessions",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(recent_response.status_code, 200)
        recent_payload = recent_response.get_json()
        self.assertEqual(len(recent_payload), 2)
        self.assertEqual(recent_payload[0]["status"], "In Progress")

        high_risk_response = self.client.get(
            "/api/dashboard/high-risk",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(high_risk_response.status_code, 200)
        high_risk_payload = high_risk_response.get_json()
        self.assertTrue(isinstance(high_risk_payload, list))

    def test_candidate_analytics(self):
        response = self.client.get(
            "/api/dashboard/candidate/1",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["candidate"]["name"], "Admin User")
        self.assertEqual(payload["browser_event_count"], 1)
        self.assertEqual(payload["face_event_count"], 1)

    def test_unauthorized_access_is_rejected(self):
        no_auth_response = self.client.get("/api/dashboard/summary")
        self.assertEqual(no_auth_response.status_code, 401)

        regular_response = self.client.get(
            "/api/dashboard/summary",
            headers={"Authorization": f"Bearer {self.regular_token}"},
        )
        self.assertEqual(regular_response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
