import unittest
from backend.services.ai_report_agent import LangChainReportAgent


class TestLangChainReportAgent(unittest.TestCase):
    def setUp(self):
        self.agent = LangChainReportAgent()

    def test_low_risk_session_report(self):
        report = self.agent.generate_ai_report(
            candidate_name="Alice Johnson",
            exam_title="Python Fundamentals",
            session_duration=60,
            integrity_score=95.0,
            browser_logs=[],
            face_logs=[],
            warnings=[]
        )

        self.assertEqual(report["recommendation"], "Normal Session")
        self.assertEqual(report["risk_level"], "Low Risk")
        self.assertEqual(report["integrity_score"], 95.0)
        self.assertIn("Alice Johnson", report["executive_summary"])

    def test_medium_risk_session_report(self):
        warnings = [
            {"severity": "Warning", "warning_type": "Excessive Tab Switching", "message": "Candidate switched tabs 3 times."}
        ]
        browser_logs = [{"event_type": "tab_switch"}, {"event_type": "tab_switch"}]

        report = self.agent.generate_ai_report(
            candidate_name="Bob Smith",
            exam_title="Data Structures",
            session_duration=60,
            integrity_score=75.0,
            browser_logs=browser_logs,
            face_logs=[],
            warnings=warnings
        )

        self.assertEqual(report["recommendation"], "Needs Manual Review")
        self.assertEqual(report["risk_level"], "Medium Risk")
        self.assertEqual(report["telemetry_breakdown"]["tab_switches"], 2)

    def test_high_risk_session_report(self):
        warnings = [
            {"severity": "Critical", "warning_type": "Prohibited Device Detected", "message": "Mobile phone in frame."}
        ]
        face_logs = [{"status": "multiple_faces"}]

        report = self.agent.generate_ai_report(
            candidate_name="Impersonator User",
            exam_title="Mathematics",
            session_duration=60,
            integrity_score=45.0,
            browser_logs=[],
            face_logs=face_logs,
            warnings=warnings
        )

        self.assertEqual(report["recommendation"], "High Risk Session / Disqualified")
        self.assertEqual(report["risk_level"], "High Risk")
        self.assertEqual(report["telemetry_breakdown"]["multiple_faces"], 1)


if __name__ == "__main__":
    unittest.main()
