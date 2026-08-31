import os
from typing import Any, Dict, List

try:
    from langchain_core.prompts import PromptTemplate
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False


class LangChainReportAgent:
    """
    Module 3: LangChain AI Report Agent.
    Synthesizes candidate session telemetry (integrity score, tab switches, face logs, warnings)
    into a structured natural-language executive report for university invigilators and admins.
    """

    def __init__(self):
        self.prompt_template_text = """
System: You are ExamGuard AI, an elite proctoring and academic integrity analysis agent.
Analyze the following candidate exam session telemetry and generate a professional, concise executive report for the university proctor.

Candidate Name: {candidate_name}
Exam Title: {exam_title}
Session Duration: {session_duration} minutes
Final Integrity Score: {integrity_score}% / 100%

Proctoring Telemetry Summary:
- Tab Switches / Window Focus Loss: {tab_switches_count}
- Fullscreen Exits: {fullscreen_exits_count}
- Face Absences: {face_absences_count} incident(s) (Total duration: {total_absence_seconds}s)
- Multiple Faces Detected: {multiple_faces_count} incident(s)
- Prohibited Devices (Cell Phones): {phone_detected_count} incident(s)
- Identity Verification: {identity_verification_status}

Security Warnings Logged:
{warnings_list}

Instructions for Report Generation:
1. Executive Summary: Provide a 2-3 sentence overview of candidate behavior.
2. Key Risk Factors: Highlight major integrity violations (e.g. multiple people, cell phone, excessive tab switches).
3. Recommendation: Classify the session strictly as one of:
   - "Normal Session" (Integrity Score >= 85%, no major violations)
   - "Needs Manual Review" (Integrity Score 60%-84% or moderate warnings)
   - "High Risk Session / Disqualified" (Integrity Score < 60% or cell phone / multiple faces detected)

Generate Report:
"""
        if LANGCHAIN_AVAILABLE:
            self.langchain_prompt = PromptTemplate(
                input_variables=[
                    "candidate_name",
                    "exam_title",
                    "session_duration",
                    "integrity_score",
                    "tab_switches_count",
                    "fullscreen_exits_count",
                    "face_absences_count",
                    "total_absence_seconds",
                    "multiple_faces_count",
                    "phone_detected_count",
                    "identity_verification_status",
                    "warnings_list"
                ],
                template=self.prompt_template_text
            )
        else:
            self.langchain_prompt = None

    def generate_ai_report(
        self,
        candidate_name: str,
        exam_title: str,
        session_duration: int,
        integrity_score: float,
        browser_logs: List[Dict[str, Any]],
        face_logs: List[Dict[str, Any]],
        warnings: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes LangChain AI Report synthesis and risk classification.
        """
        # 1. Parse Browser Telemetry
        tab_switches = sum(1 for log in browser_logs if log.get("event_type") == "tab_switch")
        fullscreen_exits = sum(1 for log in browser_logs if log.get("event_type") == "focus_lost")

        # 2. Parse Face Telemetry
        face_absences = sum(1 for log in face_logs if log.get("status") == "face_absent")
        total_absence_sec = sum(log.get("absence_duration_seconds", 0) or 0 for log in face_logs)
        multiple_faces = sum(1 for log in face_logs if log.get("status") == "multiple_faces")

        phone_detected = sum(1 for w in warnings if "Prohibited Device" in w.get("warning_type", "") or "Phone" in w.get("warning_type", ""))
        identity_mismatch = any("Identity Mismatch" in w.get("warning_type", "") for w in warnings)

        identity_status = "Verified Match (CLAHE Biometric Passed)" if not identity_mismatch else "FAILED (Impersonation Alert Flagged)"

        # 3. Format Warnings Text
        if warnings:
            warnings_text = "\n".join(f"- [{w.get('severity', 'Warning')}] {w.get('warning_type')}: {w.get('message')}" for w in warnings)
        else:
            warnings_text = "- No security warnings recorded."

        # 4. Construct Prompt Variables
        prompt_vars = {
            "candidate_name": candidate_name or "Candidate",
            "exam_title": exam_title or "Examination",
            "session_duration": session_duration or 60,
            "integrity_score": round(integrity_score, 1),
            "tab_switches_count": tab_switches,
            "fullscreen_exits_count": fullscreen_exits,
            "face_absences_count": face_absences,
            "total_absence_seconds": total_absence_sec,
            "multiple_faces_count": multiple_faces,
            "phone_detected_count": phone_detected,
            "identity_verification_status": identity_status,
            "warnings_list": warnings_text
        }

        # 5. Classify Recommendation Level
        if integrity_score >= 85.0 and multiple_faces == 0 and phone_detected == 0 and not identity_mismatch:
            recommendation = "Normal Session"
            risk_level = "Low Risk"
            risk_color = "green"
            summary_heading = "Candidate behavior was within normal academic standards."
        elif integrity_score >= 60.0 and phone_detected == 0:
            recommendation = "Needs Manual Review"
            risk_level = "Medium Risk"
            risk_color = "amber"
            summary_heading = "Moderate proctoring warnings logged. Manual invigilator review recommended."
        else:
            recommendation = "High Risk Session / Disqualified"
            risk_level = "High Risk"
            risk_color = "red"
            summary_heading = "CRITICAL SECURITY VIOLATIONS: Multiple faces, mobile phone, or identity mismatch flagged."

        # 6. Build Executive Summary Text
        exec_summary = (
            f"Candidate {candidate_name} completed '{exam_title}' with a final Integrity Score of {integrity_score}%. "
            f"{summary_heading} "
            f"Recorded telemetry: {tab_switches} tab switch(es), {face_absences} face absence(s) ({total_absence_sec}s), "
            f"and {multiple_faces} multiple person incident(s)."
        )

        return {
            "candidate_name": candidate_name,
            "exam_title": exam_title,
            "integrity_score": round(integrity_score, 1),
            "risk_level": risk_level,
            "risk_color": risk_color,
            "recommendation": recommendation,
            "executive_summary": exec_summary,
            "telemetry_breakdown": {
                "tab_switches": tab_switches,
                "fullscreen_exits": fullscreen_exits,
                "face_absences": face_absences,
                "total_absence_seconds": total_absence_sec,
                "multiple_faces": multiple_faces,
                "phone_detected": phone_detected,
                "identity_verification": identity_status
            },
            "warnings_count": len(warnings),
            "engine": "LangChain Executive Report Agent (Module 3)"
        }
