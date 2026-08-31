import unittest
from backend import create_app, db
from backend.models.exam_models import Candidate, Exam, ExamSession
from backend.services.report_service import ReportService
from werkzeug.security import generate_password_hash


class TestAIValidationSuite(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            self.admin = Candidate(
                name="Admin User Validation",
                email="test_admin_val@gmail.com",
                password_hash=generate_password_hash("admin@123"),
                role="admin"
            )
            self.student = Candidate(
                name="Regular Student Validation",
                email="test_student_val@example.com",
                password_hash=generate_password_hash("password123"),
                role="candidate"
            )

            self.exam = Exam(title="AI Validation Test Exam", duration=60, total_marks=100)
            db.session.add_all([self.admin, self.student, self.exam])
            db.session.commit()

            self.session = ExamSession(candidate_id=self.student.id, exam_id=self.exam.id, status="Completed", integrity_score=92.0)
            db.session.add(self.session)
            db.session.commit()
            self.admin_id = self.admin.id
            self.student_id = self.student.id
            self.session_id = self.session.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_low_risk_session_ai_validation(self):
        with self.app.app_context():
            service = ReportService()
            admin_user = db.session.get(Candidate, self.admin_id)
            report = service.get_ai_session_report(self.session_id, admin_user)

            self.assertEqual(report["recommendation"], "Normal Session")
            self.assertEqual(report["risk_level"], "Low Risk")
            self.assertGreaterEqual(report["integrity_score"], 85.0)

    def test_student_rbac_access_forbidden(self):
        with self.app.app_context():
            service = ReportService()
            student_user = db.session.get(Candidate, self.student_id)
            with self.assertRaises(PermissionError) as ctx:
                service.get_ai_session_report(self.session_id, student_user)
            self.assertIn("Access Denied", str(ctx.exception))



if __name__ == "__main__":
    unittest.main()
