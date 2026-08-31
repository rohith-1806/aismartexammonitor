import os
import tempfile
import unittest

from backend import create_app, db
from backend.models.exam_models import BrowserLog, Candidate, Exam, ExamSession, FaceLog, Warning
from backend.routes.auth import _issue_token


class IntegrityEndpointsTestCase(unittest.TestCase):
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
            in_progress_session = ExamSession(candidate_id=admin.id, exam_id=exam.id, status="In Progress")
            db.session.add_all([completed_session, in_progress_session])
            db.session.flush()

            db.session.add_all([
                BrowserLog(session_id=completed_session.id, candidate_id=admin.id, event_type="tab_switch"),
                BrowserLog(session_id=completed_session.id, candidate_id=admin.id, event_type="focus_lost"),
                BrowserLog(session_id=completed_session.id, candidate_id=admin.id, event_type="exam_page_closed"),
                FaceLog(session_id=completed_session.id, candidate_id=admin.id, status="face_absent"),
                FaceLog(session_id=completed_session.id, candidate_id=admin.id, status="multiple_faces"),
                Warning(session_id=completed_session.id, candidate_id=admin.id, warning_type="Excessive Tab Switching", message="Warn", severity="Medium"),
            ])
            db.session.commit()

            self.completed_session_id = completed_session.id
            self.admin_token = _issue_token(admin)
            self.regular_token = _issue_token(regular)

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()
        os.remove(self.db_path)

    def test_score_calculation_and_risk_level_mapping(self):
        response = self.client.get(
            f"/api/integrity/session/{self.completed_session_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["session_id"], self.completed_session_id)
        self.assertEqual(payload["integrity_score"], 67)
        self.assertEqual(payload["risk_level"], "High")
        self.assertEqual(payload["summary"]["tab_switches"], 1)
        self.assertEqual(payload["summary"]["focus_losses"], 1)
        self.assertEqual(payload["summary"]["browser_closed"], 1)
        self.assertEqual(payload["summary"]["face_absent"], 1)
        self.assertEqual(payload["summary"]["multiple_faces"], 1)
        self.assertEqual(payload["summary"]["warnings"], 1)

    def test_minimum_and_maximum_scores(self):
        with self.app.app_context():
            candidate = db.session.query(Candidate).filter_by(email="admin@example.com").first()
            exam = db.session.query(Exam).filter_by(title="Python Test").first()

            max_session = ExamSession(candidate_id=candidate.id, exam_id=exam.id, status="Completed")
            db.session.add(max_session)
            db.session.flush()
            max_session_id = max_session.id
            db.session.commit()

            min_session = ExamSession(candidate_id=candidate.id, exam_id=exam.id, status="Completed")
            db.session.add(min_session)
            db.session.flush()
            min_session_id = min_session.id
            for _ in range(60):
                db.session.add(BrowserLog(session_id=min_session.id, candidate_id=candidate.id, event_type="tab_switch"))
            db.session.commit()

            max_response = self.client.get(
                f"/api/integrity/session/{max_session_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
            )
            self.assertEqual(max_response.status_code, 200)
            self.assertEqual(max_response.get_json()["integrity_score"], 100)
            self.assertEqual(max_response.get_json()["risk_level"], "Low Risk")

            min_response = self.client.get(
                f"/api/integrity/session/{min_session_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
            )
            self.assertEqual(min_response.status_code, 200)
            self.assertEqual(min_response.get_json()["integrity_score"], 0)
            self.assertEqual(min_response.get_json()["risk_level"], "Critical")

    def test_completed_sessions_list(self):
        response = self.client.get(
            "/api/integrity/all",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(isinstance(payload, list))
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["session_id"], self.completed_session_id)
        self.assertEqual(payload[0]["score"], 67)
        self.assertEqual(payload[0]["risk"], "High")

    def test_unauthorized_access_is_rejected(self):
        no_auth_response = self.client.get("/api/integrity/all")
        self.assertEqual(no_auth_response.status_code, 401)

        regular_response = self.client.get(
            "/api/integrity/all",
            headers={"Authorization": f"Bearer {self.regular_token}"},
        )
        self.assertEqual(regular_response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
