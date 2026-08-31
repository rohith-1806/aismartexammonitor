import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { getAiSessionReport, getMonitorSessions } from '../services/eventApi';

export function SessionLogs() {
  const { user, token } = useAuth();
  const [sessionLogs, setSessionLogs] = useState([]);

  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReportId, setLoadingReportId] = useState(null);
  const [reportError, setReportError] = useState('');

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@gmail.com';

  useEffect(() => {
    if (!token || !isAdmin) return;
    getMonitorSessions(token)
      .then((sessions) => setSessionLogs(sessions.map((session) => ({
        id: session.session_id,
        date: session.end_time || session.start_time,
        exam: session.exam,
        candidateName: session.candidate,
        candidateId: String(session.candidate_id),
        duration: session.duration_minutes !== null ? `${session.duration_minutes} min` : 'In progress',
        status: session.status,
        score: session.academic_score,
        integrityScore: session.integrity_score,
        riskLabel: session.risk_level === 'Critical' ? 'Critical Risk' : session.risk_level === 'High' ? 'High Risk' : session.risk_level,
      }))))
      .catch((error) => setReportError(error.message || 'Unable to load real session records.'));
  }, [isAdmin, token]);

  const formatDate = (date) => new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));

  const handleGenerateAiReport = async (log) => {
    setLoadingReportId(log.id);
    setReportError('');
    try {
      const data = await getAiSessionReport(log.id, token);
      setSelectedReport(data);
    } catch (error) {
      console.warn('Unable to generate real session report:', error);
      setReportError(error.message || 'Unable to generate the real session report.');
    } finally {
      setLoadingReportId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {reportError && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {reportError}
          </div>
        )}
        <div className="mb-stack-lg flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Session Logs & AI Integrity Reports</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Review completed exam sessions, proctoring telemetry, and automated AI Executive Integrity Reports.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant flex gap-6 shadow-sm">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Total Sessions</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{sessionLogs.length}</p>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Completed</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{sessionLogs.filter((log) => log.status === 'Completed').length}</p>
            </div>
          </div>
        </div>

        {sessionLogs.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">history_edu</span>
            <p className="font-body-md text-body-md text-on-surface-variant">No session logs are available yet. Complete an exam to generate your first log.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="px-6 py-4 text-left font-label-md text-label-md text-on-surface uppercase">Date</th>
                    <th className="px-6 py-4 text-left font-label-md text-label-md text-on-surface uppercase">Candidate</th>
                    <th className="px-6 py-4 text-left font-label-md text-label-md text-on-surface uppercase">Assessment</th>
                    <th className="px-6 py-4 text-left font-label-md text-label-md text-on-surface uppercase">Duration</th>
                    <th className="px-6 py-4 text-left font-label-md text-label-md text-on-surface uppercase">Status</th>
                    <th className="px-6 py-4 text-right font-label-md text-label-md text-on-surface uppercase">Score</th>
                    {isAdmin && (
                      <th className="px-6 py-4 text-center font-label-md text-label-md text-on-surface uppercase">AI Report</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sessionLogs.map((log) => (
                    <tr key={log.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 font-body-md text-body-md text-on-surface-variant font-medium">{formatDate(log.date)}</td>
                      <td className="px-6 py-4 font-body-md text-body-md text-on-surface font-semibold">{log.candidateName}</td>
                      <td className="px-6 py-4 font-body-md text-body-md text-on-surface font-medium">{log.exam}</td>
                      <td className="px-6 py-4 font-body-md text-body-md text-on-surface-variant font-mono">{log.duration}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-label-sm font-bold ${
                          log.status === 'Completed'
                            ? 'bg-success/15 text-on-surface border border-success/30'
                            : 'bg-primary/10 text-on-surface border border-primary/30'
                        }`}>
                          {log.status === 'Completed' ? (
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {log.score !== null ? (
                          <span className="font-headline-md text-headline-md text-on-surface font-bold">{log.score}%</span>
                        ) : (
                          <span className="font-body-md text-body-md text-on-surface-variant">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleGenerateAiReport(log)}
                            disabled={loadingReportId === log.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow hover:brightness-110 transition"
                          >
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            {loadingReportId === log.id ? "Analyzing..." : "Generate AI Report"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* LangChain AI Executive Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl bg-surface-container-lowest border border-outline-variant p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-2xl">smart_toy</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">LangChain AI Executive Report</h2>
                  <p className="text-xs text-on-surface-variant">Automated Proctoring Telemetry Analysis</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high transition"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Recommendation Badge */}
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-surface-container-low p-4 border border-outline-variant">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">AI RECOMMENDATION</span>
                <h3 className="text-lg font-bold text-on-surface mt-0.5">{selectedReport.recommendation}</h3>
              </div>
              <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${
                selectedReport.recommendation === "Normal Session"
                  ? "bg-success/15 text-on-surface border border-success/30"
                  : selectedReport.recommendation === "Needs Manual Review"
                  ? "bg-warning/15 text-on-surface border border-warning/30"
                  : "bg-danger/15 text-on-surface border border-danger/30"
              }`}>
                {selectedReport.risk_level} ({selectedReport.integrity_score}%)
              </span>
            </div>

            {/* Executive Summary */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">EXECUTIVE BEHAVIOR SUMMARY</h4>
              <div className="rounded-2xl bg-surface-bright p-4 border border-outline-variant text-sm leading-relaxed text-on-surface">
                {selectedReport.executive_summary}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <span className="text-[11px] text-on-surface-variant font-medium">Academic Score</span>
                  <p className="text-lg font-bold text-on-surface mt-0.5">{selectedReport.academic_score ?? 0}%</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <span className="text-[11px] text-on-surface-variant font-medium">Submission Status</span>
                  <p className={`text-sm font-bold mt-1 ${selectedReport.auto_submitted_for_warning_limit ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedReport.submission_reason || 'Submitted normally'}
                  </p>
                </div>
              </div>
            </div>

            {/* Telemetry Breakdown Grid */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">TELEMETRY BREAKDOWN</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <span className="text-[11px] text-on-surface-variant font-medium">Tab Switches</span>
                  <p className="text-lg font-bold text-on-surface mt-0.5">{selectedReport.telemetry_breakdown?.tab_switches || 0}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <span className="text-[11px] text-on-surface-variant font-medium">Fullscreen Exits</span>
                  <p className="text-lg font-bold text-on-surface mt-0.5">{selectedReport.telemetry_breakdown?.fullscreen_exits || 0}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <span className="text-[11px] text-on-surface-variant font-medium">Face Absences</span>
                  <p className="text-lg font-bold text-on-surface mt-0.5">{selectedReport.telemetry_breakdown?.face_absences || 0}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <span className="text-[11px] text-on-surface-variant font-medium">Multiple Persons</span>
                  <p className="text-lg font-bold text-on-surface mt-0.5">{selectedReport.telemetry_breakdown?.multiple_faces || 0}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <span className="text-[11px] text-on-surface-variant font-medium">Cell Phones</span>
                  <p className="text-lg font-bold text-on-surface mt-0.5">{selectedReport.telemetry_breakdown?.phone_detected || 0}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                  <span className="text-[11px] text-on-surface-variant font-medium">Biometric Gate</span>
                  <p className="text-xs font-bold text-green-600 mt-1 truncate">{selectedReport.telemetry_breakdown?.identity_verification || "Passed"}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default SessionLogs;
