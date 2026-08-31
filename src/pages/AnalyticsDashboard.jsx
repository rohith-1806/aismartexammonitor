import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { StatsCard } from '../components/StatsCard';
import { useAuth } from '../hooks/useAuth';
import { runKMeans } from '../utils/integrityEngine';
import { getMonitorSessions } from '../services/eventApi';

export function AnalyticsDashboard() {
  const { user, token } = useAuth();
  const [backendSessions, setBackendSessions] = useState([]);
  const [tab, setTab] = useState('analytics');
  const [selectedSession, setSelectedSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [expandedRiskLevels, setExpandedRiskLevels] = useState({});

  useEffect(() => {
    if (!token) return;
    getMonitorSessions(token)
      .then((sessions) => setBackendSessions(sessions))
      .catch((error) => console.error('Unable to load real monitored sessions:', error));
  }, [token]);

  const realSessionLogs = useMemo(() => backendSessions.map((item) => ({
    id: item.session_id,
    date: item.end_time || item.start_time,
    startTime: item.start_time,
    exam: item.exam,
    candidateName: item.candidate,
    candidateId: String(item.candidate_id),
    status: item.status === 'Completed' ? 'Completed' : 'In Progress',
    score: item.academic_score,
    integrityScore: item.integrity_score,
    riskLabel: item.risk_level === 'Critical' ? 'Critical Risk' : item.risk_level === 'High' ? 'High Risk' : item.risk_level,
    tabSwitchCount: item.tab_switch_count,
    focusLossCount: item.focus_loss_count,
    faceAbsentCount: item.face_absence_count,
    faceAbsentDuration: item.face_absence_seconds,
    facePresenceRatio: item.face_presence_ratio,
    multipleFacesCount: item.multiple_faces_count,
    prohibitedItemsCount: item.phone_detected_count,
    eventTimeline: item.event_timeline,
  })), [backendSessions]);

  const displayedSessionLogs = realSessionLogs;

  const completedLogs = useMemo(() => {
    return displayedSessionLogs.filter((log) => log.status === 'Completed');
  }, [displayedSessionLogs]);

  const filteredLogs = useMemo(() => {
    return completedLogs.filter((log) => {
      const candidateName = log.candidateName || 'Unknown Candidate';
      const exam = log.exam || 'General Exam';
      const riskLabel = log.riskLabel || 'Low Risk';
      return (
        (candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exam.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (log.candidateId && log.candidateId.toLowerCase().includes(searchQuery.toLowerCase()))) &&
        (riskFilter === 'All' || riskLabel === riskFilter)
      );
    });
  }, [completedLogs, searchQuery, riskFilter]);

  const stats = useMemo(() => {
    const total = completedLogs.length;
    if (total === 0) return { total: 0, avgScore: 0, avgFpr: 0, flaggedCount: 0 };
    const scoreSum = completedLogs.reduce((sum, item) => sum + (item.integrityScore ?? 100), 0);
    const fprSum = completedLogs.reduce((sum, item) => sum + (item.facePresenceRatio ?? 100), 0);
    const flaggedCount = completedLogs.filter(
      (item) => item.riskLabel === 'High Risk' || item.riskLabel === 'Critical Risk'
    ).length;
    return {
      total,
      avgScore: Math.round((scoreSum / total) * 10) / 10,
      avgFpr: Math.round((fprSum / total) * 10) / 10,
      flaggedCount
    };
  }, [completedLogs]);

  const scoreDistribution = useMemo(() => {
    const dist = {
      '90-100': { label: '90-100', count: 0, color: 'fill-success' },
      '80-89': { label: '80-89', count: 0, color: 'fill-success/70' },
      '70-79': { label: '70-79', count: 0, color: 'fill-warning/70' },
      '50-69': { label: '50-69', count: 0, color: 'fill-warning' },
      '<50': { label: '<50', count: 0, color: 'fill-danger' }
    };
    completedLogs.forEach((item) => {
      const score = item.integrityScore ?? 100;
      if (score >= 90) dist['90-100'].count += 1;
      else if (score >= 80) dist['80-89'].count += 1;
      else if (score >= 70) dist['70-79'].count += 1;
      else if (score >= 50) dist['50-69'].count += 1;
      else dist['<50'].count += 1;
    });
    return Object.values(dist);
  }, [completedLogs]);

  const infractionFrequency = useMemo(() => {
    const counts = {
      'Tab Switches': 0,
      'Focus Losses': 0,
      'Face Absence': 0,
      'Multiple Faces': 0,
      'Prohibited Items': 0
    };
    completedLogs.forEach((item) => {
      counts['Tab Switches'] += item.tabSwitchCount ?? 0;
      counts['Focus Losses'] += item.focusLossCount ?? 0;
      counts['Face Absence'] += item.faceAbsentCount ?? 0;
      counts['Multiple Faces'] += item.multipleFacesCount ?? 0;
      counts['Prohibited Items'] += item.prohibitedItemsCount ?? 0;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [completedLogs]);

  const heatmap = useMemo(() => {
    const rows = ['Tab Switches', 'Focus Losses', 'Face Absence', 'Prohibited Items'];
    const cols = ['Start Phase (0-15m)', 'Middle Phase (15-30m)', 'End Phase (30-45m)'];
    const grid = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    completedLogs.forEach((item) => {
      const tabs = item.tabSwitchCount ?? 0;
      const focus = item.focusLossCount ?? 0;
      item.eventTimeline?.forEach((event) => {
        const eventTime = new Date(event.timestamp).getTime();
        const startTime = new Date(item.startTime).getTime();
        const phase = eventTime - startTime < 15 * 60 * 1000 ? 0 : eventTime - startTime < 30 * 60 * 1000 ? 1 : 2;
        const row = rows.indexOf(event.category);
        if (row >= 0) grid[row][phase] += 1;
      });
    });
    return { rows, cols, grid };
  }, [completedLogs]);

  const clustering = useMemo(() => {
    return completedLogs.length === 0 ? { clusters: [], centroids: [] } : runKMeans(completedLogs, 3);
  }, [completedLogs]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pt-4 md:pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant pb-6">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              AI Engineer Analytics Dashboard
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Data science portal: unsupervised K-Means clustering, violation heatmaps, risk profiling, and full session auditing.
            </p>
          </div>
        </div>

        <div className="flex border-b border-outline-variant">
          <button
            onClick={() => setTab('analytics')}
            className={`px-6 py-3 font-label-md text-label-md font-bold transition-all border-b-2 ${
              tab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Data Science Analytics
          </button>
          <button
            onClick={() => setTab('queue')}
            className={`px-6 py-3 font-label-md text-label-md font-bold transition-all border-b-2 ${
              tab === 'queue' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Live Proctor Queue ({filteredLogs.length})
          </button>
        </div>

        {tab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Sessions Monitored"
                value={stats.total}
                hint="Exam sessions logged"
                icon="assessment"
                tone="primary"
                titleClass="text-on-surface"
              />
              <StatsCard
                title="Avg Integrity Score"
                value={stats.total > 0 ? `${stats.avgScore}%` : '—'}
                hint="Overall portal average"
                icon="verified_user"
                tone={stats.avgScore >= 85 ? 'success' : stats.avgScore >= 70 ? 'warning' : 'danger'}
                titleClass="text-on-surface"
              />
              <StatsCard
                title="Avg Face Presence Ratio"
                value={stats.total > 0 ? `${stats.avgFpr}%` : '—'}
                hint="Percentage face detected"
                icon="face"
                tone="info"
                titleClass="text-on-surface"
              />
              <StatsCard
                title="Flagged Queue Size"
                value={stats.flaggedCount}
                hint="High & Critical Risk cases"
                icon="report"
                tone={stats.flaggedCount > 0 ? 'danger' : 'success'}
                titleClass="text-on-surface"
              />
            </div>

            {completedLogs.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant p-12 text-center shadow-sm">
                <span className="material-symbols-outlined text-outline text-5xl mb-4">analytics</span>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">No Analytics Data Present</h3>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
                  Completed candidate sessions will appear here after an exam is attended and submitted.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Integrity Score Distribution */}
                  <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                    <div className="mb-4">
                      <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface">
                        Integrity Score Distribution
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Breakdown of student sessions grouped by proctoring score ranges.
                      </p>
                    </div>
                    <div className="w-full flex items-center justify-center py-4">
                      <svg viewBox="0 0 500 240" className="w-full h-auto max-w-[440px]">
                        <line x1="40" y1="20" x2="480" y2="20" stroke="#E0E0E0" strokeDasharray="3" />
                        <line x1="40" y1="80" x2="480" y2="80" stroke="#E0E0E0" strokeDasharray="3" />
                        <line x1="40" y1="140" x2="480" y2="140" stroke="#E0E0E0" strokeDasharray="3" />
                        <line x1="40" y1="200" x2="480" y2="200" stroke="#888" strokeWidth="1.5" />
                        {scoreDistribution.map((item, idx) => {
                          const maxCount = Math.max(...scoreDistribution.map((d) => d.count), 1);
                          const height = (item.count / maxCount) * 160;
                          const x = 50 + idx * 88;
                          const yPos = 200 - height;
                          return (
                            <g key={item.label} className="group">
                              <rect
                                x={x - 10}
                                y="15"
                                width="70"
                                height="180"
                                fill="transparent"
                                className="hover:fill-surface-container-low transition-colors duration-200"
                              />
                              <rect
                                x={x}
                                y={yPos}
                                width="50"
                                height={height}
                                rx="6"
                                className={`transition-all duration-300 hover:brightness-95 ${
                                  item.label === '90-100'
                                    ? 'fill-success'
                                    : item.label === '80-89'
                                    ? 'fill-success/70'
                                    : item.label === '70-79'
                                    ? 'fill-warning/70'
                                    : item.label === '50-69'
                                    ? 'fill-warning'
                                    : 'fill-danger'
                                }`}
                              />
                              <text x={x + 25} y={yPos - 8} textAnchor="middle" className="font-label-sm text-[11px] font-bold fill-on-surface">
                                {item.count}
                              </text>
                              <text x={x + 25} y="220" textAnchor="middle" className="font-label-sm text-[11px] fill-on-surface-variant font-bold">
                                {item.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Infraction Frequency Analysis */}
                  <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                    <div className="mb-4">
                      <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface">
                        Infraction Frequency Analysis
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Cumulative occurrence frequency counts of proctoring events.
                      </p>
                    </div>
                    <div className="space-y-4 py-2">
                      {infractionFrequency.map((item) => {
                        const maxVal = Math.max(...infractionFrequency.map((i) => i.value), 1);
                        const percentage = (item.value / maxVal) * 100;
                        const isHighWarning = item.name === 'Prohibited Items' || item.name === 'Tab Switches';
                        return (
                          <div key={item.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-label-sm font-bold">
                              <span className="text-on-surface">{item.name}</span>
                              <span className={isHighWarning && item.value > 0 ? 'text-danger' : 'text-on-surface-variant'}>
                                {item.value} count{item.value === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="h-4 w-full bg-surface-container rounded-full overflow-hidden border border-outline-variant/30">
                              <div
                                style={{ width: `${percentage}%` }}
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.name === 'Tab Switches'
                                    ? 'bg-danger'
                                    : item.name === 'Focus Losses'
                                    ? 'bg-warning'
                                    : item.name === 'Face Absence'
                                    ? 'bg-primary'
                                    : item.name === 'Multiple Faces'
                                    ? 'bg-warning-container text-on-warning-container'
                                    : 'bg-danger-container text-on-danger-container'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                  {/* Unsupervised K-Means Clustering */}
                  <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                    <div className="mb-4">
                      <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface">
                        Unsupervised K-Means Clustering (K=3)
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Sessions grouped into 3 distinct behavior profiles based on <strong>Integrity Score</strong> (X) and{' '}
                        <strong>Infraction Count</strong> (Y).
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6 items-center">
                      <div className="relative border border-outline-variant/40 rounded-2xl bg-surface-container-lowest p-4">
                        <svg viewBox="0 0 400 240" className="w-full h-auto">
                          <line x1="30" y1="20" x2="380" y2="20" stroke="#F0F0F0" />
                          <line x1="30" y1="75" x2="380" y2="75" stroke="#F0F0F0" />
                          <line x1="30" y1="130" x2="380" y2="130" stroke="#F0F0F0" />
                          <line x1="30" y1="185" x2="380" y2="185" stroke="#F0F0F0" />
                          <line x1="30" y1="220" x2="380" y2="220" stroke="#444" strokeWidth="1.5" />
                          <line x1="30" y1="20" x2="30" y2="220" stroke="#444" strokeWidth="1.5" />
                          <text x="205" y="236" textAnchor="middle" className="text-[9px] font-bold fill-on-surface-variant">
                            Integrity Score (0 ➔ 100)
                          </text>
                          <text x="12" y="120" textAnchor="middle" transform="rotate(-90, 12, 120)" className="text-[9px] font-bold fill-on-surface-variant">
                            Total Infractions
                          </text>
                          {clustering.clusters.map((cluster) => {
                            const cx = 30 + (cluster.centroidX / 100) * 350;
                            const cy = 220 - (cluster.centroidY / 15) * 200;
                            return (
                              <g key={cluster.name}>
                                <path
                                  d={`M ${cx} ${cy - 8} L ${cx + 2} ${cy - 2} L ${cx + 8} ${cy - 2} L ${cx + 3} ${cy + 2} L ${cx + 5} ${cy + 8} L ${cx} ${cy + 4} L ${cx - 5} ${cy + 8} L ${cx - 3} ${cy + 2} L ${cx - 8} ${cy - 2} L ${cx - 2} ${cy - 2} Z`}
                                  className={`stroke-white stroke-[1.5] ${
                                    cluster.color === 'success' ? 'fill-success' : cluster.color === 'warning' ? 'fill-warning' : 'fill-danger'
                                  }`}
                                />
                                {cluster.points.map((pt) => {
                                  const px = 30 + (pt.x / 100) * 350;
                                  const py = 220 - (pt.y / 15) * 200;
                                  return (
                                    <circle
                                      key={pt.id}
                                      cx={px}
                                      cy={py}
                                      r="4.5"
                                      className={`stroke-white stroke-[0.8] cursor-pointer hover:r-7 transition-all ${
                                        cluster.color === 'success'
                                          ? 'fill-success hover:fill-success-container'
                                          : cluster.color === 'warning'
                                          ? 'fill-warning hover:fill-warning-container'
                                          : 'fill-danger hover:fill-danger-container'
                                      }`}
                                      onMouseEnter={() =>
                                        setHoveredPoint({
                                          name: pt.sessionName,
                                          score: pt.x,
                                          violations: pt.y,
                                          clusterName: cluster.name,
                                          px,
                                          py
                                        })
                                      }
                                      onMouseLeave={() => setHoveredPoint(null)}
                                      onClick={() => setSelectedSession(pt.session)}
                                    />
                                  );
                                })}
                              </g>
                            );
                          })}
                        </svg>
                        {hoveredPoint && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${(hoveredPoint.px / 400) * 100}%`,
                              top: `${(hoveredPoint.py / 240) * 100 - 24}%`,
                              transform: 'translate(-50%, -100%)'
                            }}
                            className="bg-inverse-surface text-surface rounded-lg p-2.5 shadow-xl text-left border border-outline pointer-events-none z-10 w-44"
                          >
                            <p className="text-label-sm font-bold truncate">{hoveredPoint.name}</p>
                            <div className="text-[10px] mt-1 space-y-0.5 text-surface-variant">
                              <p>
                                Integrity Score:{' '}
                                <span className="font-bold text-surface">{hoveredPoint.score}%</span>
                              </p>
                              <p>
                                Total Infractions:{' '}
                                <span className="font-bold text-surface">{hoveredPoint.violations}</span>
                              </p>
                              <p>
                                Cohort:{' '}
                                <span className="font-bold text-surface">{hoveredPoint.clusterName}</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="border-b border-outline-variant pb-2">
                          <span className="font-label-sm text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                            Cluster Centroids
                          </span>
                        </div>
                        {clustering.clusters.map((cluster) => (
                          <div key={cluster.name} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`h-3 w-3 rounded-full ${
                                cluster.color === 'success' ? 'bg-success' : cluster.color === 'warning' ? 'bg-warning' : 'bg-danger'
                              }`} />
                              <span className="font-label-sm text-label-sm font-bold text-on-surface">
                                {cluster.name} ({cluster.percentage}%)
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant leading-relaxed pl-5">
                              Centroid: {cluster.centroidX}% score, {cluster.centroidY} violations average.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Violation Stage Heatmap */}
                  <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                    <div className="mb-4">
                      <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface">
                        Violation Stage Heatmap
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Violation density relative to exam phases (identifies early vs late exam violations).
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse">
                        <thead>
                          <tr>
                            <th className="p-2 border-b border-outline-variant text-[11px] font-bold text-on-surface-variant text-left uppercase">
                              Violation
                            </th>
                            {heatmap.cols.map((col) => (
                              <th
                                key={col}
                                className="p-2 border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase leading-tight min-w-[90px]"
                              >
                                {col.replace(' (0-15m)', '').replace(' (15-30m)', '').replace(' (30-45m)', '')}
                                <span className="block text-[8px] text-outline">{col.slice(col.indexOf('('))}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {heatmap.rows.map((row, rIdx) => (
                            <tr key={row}>
                              <td className="p-3 border-b border-outline-variant text-label-sm font-bold text-on-surface text-left bg-surface-container-low">
                                {row}
                              </td>
                              {heatmap.grid[rIdx].map((cell, cIdx) => {
                                const maxVal = Math.max(...heatmap.grid.flat(), 1);
                                const intensity = cell / maxVal;
                                const style = cell > 0
                                  ? { backgroundColor: `rgba(239, 68, 68, ${Math.max(0.1, intensity * 0.9)})`, color: intensity > 0.5 ? '#FFFFFF' : '#1F2937' }
                                  : { backgroundColor: '#F9FAFB', color: '#9CA3AF' };
                                return (
                                  <td
                                    key={cIdx}
                                    style={style}
                                    className="p-3 border border-outline-variant/60 font-body-md text-body-md font-bold transition-all hover:scale-105"
                                  >
                                    {cell}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Cohort Risk Profiling */}
                <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                  <div className="mb-6">
                    <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                      Cohort Risk Profiling
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Distribution of candidates segmented by threat level classifications.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'].map((level) => {
                      const filtered = completedLogs.filter((item) => item.riskLabel === level);
                      const count = filtered.length;
                      const percentage = completedLogs.length ? Math.round((count / completedLogs.length) * 100) : 0;

                      let bg = 'bg-success';
                      let textCls = 'text-success';
                      let border = 'bg-success/5 border-success/20';

                      if (level === 'Medium Risk') {
                        bg = 'bg-warning';
                        textCls = 'text-warning';
                        border = 'bg-warning/5 border-warning/20';
                      } else if (level === 'High Risk') {
                        bg = 'bg-warning-container text-on-warning-container';
                        textCls = 'text-warning-container';
                        border = 'bg-warning-container/5 border-warning-container/20';
                      } else if (level === 'Critical Risk') {
                        bg = 'bg-danger';
                        textCls = 'text-danger';
                        border = 'bg-danger/5 border-danger/20';
                      }

                      return (
                        <div key={level} className={`rounded-2xl border p-4 flex flex-col justify-between ${border}`}>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-label-sm text-[11px] font-bold text-on-surface uppercase tracking-wider">
                                {level}
                              </span>
                              <span className={`text-label-sm font-extrabold ${textCls}`}>{percentage}%</span>
                            </div>
                            <p className="font-headline-md text-headline-md text-on-surface font-extrabold">
                              {count} candidate{count === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                              <div style={{ width: `${percentage}%` }} className={`h-full rounded-full ${bg}`} />
                            </div>
                            {count > 0 ? (
                              <div className="text-[10px] text-on-surface-variant flex flex-wrap gap-1 mt-2">
                                {(expandedRiskLevels[level] ? filtered : filtered.slice(0, 3)).map((item, idx) => (
                                  <span
                                    key={`${level}-${idx}`}
                                    className="bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 truncate max-w-[90px] text-on-surface"
                                  >
                                    {item.candidateName || 'Candidate'}
                                  </span>
                                ))}
                                {count > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedRiskLevels((prev) => ({ ...prev, [level]: !prev[level] }))}
                                    className="text-[9px] font-bold pl-1 font-label-sm text-primary underline-offset-2 underline hover:text-primary/80"
                                  >
                                    {expandedRiskLevels[level] ? 'Show less' : `+${count - 3} more`}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-on-surface-variant mt-2 italic">No candidates flagged</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'queue' && (
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-low">
              <div className="relative w-full md:max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  type="text"
                  placeholder="Search by candidate name, ID, or exam title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-body-md text-on-surface placeholder:text-on-surface-variant caret-primary"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">Filter Risk:</span>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="px-4 py-3 bg-surface border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-label-md font-bold"
                >
                  <option value="All">All Cohorts</option>
                  <option value="Low Risk">Low Risk</option>
                  <option value="Medium Risk">Medium Risk</option>
                  <option value="High Risk">High Risk</option>
                  <option value="Critical Risk">Critical Risk</option>
                </select>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-outline text-4xl mb-2">assignment_late</span>
                <p className="font-body-md text-body-md">No candidate logs match your search and filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      <th className="px-6 py-4 font-label-md text-label-md text-on-surface">Candidate</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-on-surface">Assessment</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-on-surface">FPR Ratio</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-on-surface">Integrity Score</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-on-surface">Risk Cohort</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-on-surface text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const score = log.integrityScore ?? 100;
                      const risk = log.riskLabel || 'Low Risk';
                      const fpr = log.facePresenceRatio ?? 100;
                      let badgeCls = 'bg-success/10 text-success border-success/30';
                      if (risk === 'Medium Risk') {
                        badgeCls = 'bg-warning/10 text-warning border-warning/30';
                      } else if (risk === 'High Risk') {
                        badgeCls = 'bg-warning-container/10 text-warning-container border-warning-container/30';
                      } else if (risk === 'Critical Risk') {
                        badgeCls = 'bg-danger/10 text-danger border-danger/30';
                      }

                      return (
                        <tr key={log.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-label-md text-label-md font-bold text-on-surface">{log.candidateName || 'Candidate'}</div>
                            <div className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">ID: {log.candidateId || 'CAND-001'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-body-md text-body-md text-on-surface font-medium">{log.exam}</div>
                            <div className="font-label-sm text-label-sm text-outline mt-0.5">
                              {new Date(log.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-headline-md text-label-md font-bold text-on-surface tabular-nums">{fpr}%</td>
                          <td className="px-6 py-4">
                            <span className={`font-headline-md text-headline-md font-extrabold ${score >= 85 ? 'text-success' : score >= 70 ? 'text-warning' : 'text-danger'}`}>
                              {score}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-label-sm font-bold border ${badgeCls}`}>
                              {risk}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedSession(log)}
                              className="bg-primary-container text-on-primary-container hover:shadow border border-outline-variant px-4 py-2 rounded-xl text-label-md font-bold hover:bg-surface-container-high transition-colors"
                            >
                              Audit Report
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-inverse-surface/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-surface-container-lowest p-6 md:p-8 shadow-2xl border border-outline-variant max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-outline-variant pb-4 mb-4">
              <div>
                <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                  AI Proctoring Audit Details
                </span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface mt-1">
                  Candidate: {selectedSession.candidateName || 'Candidate'}
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  ID: {selectedSession.candidateId || 'CAND-001'} | Session Ref: {selectedSession.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant text-center">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Integrity Score</p>
                <p
                  className={`font-headline-lg text-4xl font-extrabold mt-1 ${
                    (selectedSession.integrityScore ?? 100) >= 85 ? 'text-success' : (selectedSession.integrityScore ?? 100) >= 70 ? 'text-warning' : 'text-danger'
                  }`}
                >
                  {selectedSession.integrityScore ?? 100}%
                </p>
                <span className="text-[10px] text-outline mt-1 block">Risk: {selectedSession.riskLabel || 'Low Risk'}</span>
              </div>

              <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant text-center">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Face Presence Ratio</p>
                <p className="font-headline-lg text-4xl font-extrabold mt-1 text-primary">{selectedSession.facePresenceRatio ?? 100}%</p>
                <span className="text-[10px] text-outline mt-1 block">Absence: {selectedSession.faceAbsentDuration ?? 0}s</span>
              </div>

              <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant text-center">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Academic Score</p>
                <p className="font-headline-lg text-4xl font-extrabold mt-1 text-on-surface">{selectedSession.score}%</p>
                <span className="text-[10px] text-outline mt-1 block">Verification Complete</span>
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 mb-6">
              <h4 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                Scoring Engine Deductions Log
              </h4>
              <div className="space-y-2 text-label-sm">
                <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-on-surface">Starting Base:</span>
                  <span className="font-bold">100.0</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Tab Switches ({selectedSession.tabSwitchCount ?? 0} counts @ -8.0 pts):</span>
                  <span className="text-danger font-medium">-{((selectedSession.tabSwitchCount ?? 0) * 8).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Focus Losses ({selectedSession.focusLossCount ?? 0} counts @ -5.0 pts):</span>
                  <span className="text-danger font-medium">-{((selectedSession.focusLossCount ?? 0) * 5).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Face Absence duration ({selectedSession.faceAbsentDuration ?? 0} seconds @ -0.5 pts/s):</span>
                  <span className="text-danger font-medium">-{((selectedSession.faceAbsentDuration ?? 0) * 0.5).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Multiple Face events ({selectedSession.multipleFacesCount ?? 0} counts @ -5.0 pts):</span>
                  <span className="text-danger font-medium">-{((selectedSession.multipleFacesCount ?? 0) * 5).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Prohibited Objects ({selectedSession.prohibitedItemsCount ?? 0} counts @ -10.0 pts):</span>
                  <span className="text-danger font-medium">-{((selectedSession.prohibitedItemsCount ?? 0) * 10).toFixed(1)}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant pt-2 text-on-surface font-bold">
                  <span>Final Calculated Score:</span>
                  <span
                    className={
                      (selectedSession.integrityScore ?? 100) >= 85 ? 'text-success' : (selectedSession.integrityScore ?? 100) >= 70 ? 'text-warning' : 'text-danger'
                    }
                  >
                    {selectedSession.integrityScore ?? 100}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                Session Audit Timeline
              </h4>
              {(selectedSession.tabSwitchCount ?? 0) +
                (selectedSession.focusLossCount ?? 0) +
                +((selectedSession.faceAbsentDuration ?? 0) > 0) +
                (selectedSession.prohibitedItemsCount ?? 0) ===
              0 ? (
                <p className="text-label-sm text-outline italic">No anomalous infractions detected. Session cleared.</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {Array.from({ length: selectedSession.tabSwitchCount ?? 0 }).map((_, idx) => (
                    <div
                      key={`ts-${idx}`}
                      className="flex justify-between items-center rounded-xl bg-danger/5 border border-danger/10 p-2 text-[11px] text-danger font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">tab_unresponsive</span>
                        <span>Tab Switch Violation #{idx + 1} logged</span>
                      </div>
                      <span className="text-on-surface-variant">{new Date(selectedSession.date).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {selectedSession.faceAbsentDuration > 0 && (
                    <div className="flex justify-between items-center rounded-xl bg-warning/5 border border-warning/10 p-2 text-[11px] text-warning font-medium">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">person_off</span>
                        <span>Face Absent alert logged: Total Absence duration: {selectedSession.faceAbsentDuration} seconds</span>
                      </div>
                      <span className="text-on-surface-variant">{new Date(selectedSession.date).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {Array.from({ length: selectedSession.prohibitedItemsCount ?? 0 }).map((_, idx) => (
                    <div
                      key={`item-${idx}`}
                      className="flex justify-between items-center rounded-xl bg-danger/5 border border-danger/10 p-2 text-[11px] text-danger font-medium animate-pulse"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">smartphone</span>
                        <span>Prohibited Cell Phone detected inside camera field of view</span>
                      </div>
                      <span className="text-on-surface-variant">{new Date(selectedSession.date).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-outline-variant pt-4">
              <button
                onClick={() => setSelectedSession(null)}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all text-label-md"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AnalyticsDashboard;