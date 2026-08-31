import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { useAppData } from '../hooks/useAppData'
import { StatsCard } from '../components/StatsCard'
import { ExamCard } from '../components/ExamCard'

const PHOTO_STORAGE_KEY = 'examguard_user_photo';

export function CandidateDashboard() {
  const { user, token } = useAuth()
  const { exams, activityLog, stats, loadBackendExams, loadBackendSessions } = useAppData()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@gmail.com'

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin', { replace: true })
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin && token) {
      loadBackendExams(token).catch((error) => {
        console.error('Unable to load assigned exams:', error)
      })
      loadBackendSessions(token).catch((error) => {
        console.error('Unable to load candidate sessions:', error)
      })
    }
  }, [isAdmin, loadBackendExams, loadBackendSessions, token])

  const visibleExams = exams
    .filter((exam) => exam.status !== 'completed')
    .filter((exam, index, allExams) => allExams.findIndex((item) => item.id === exam.id) === index)
  const attendedExams = activityLog
    .filter((activity) => activity.status === 'completed')
    .filter((activity, index, attendedActivities) =>
      attendedActivities.findIndex((item) => item.title === activity.title) === index
    )
  const savedPhoto = localStorage.getItem(`${PHOTO_STORAGE_KEY}_${user?.email}`) || user?.avatar || null;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AppLayout>
      {/* Hero Welcome Banner */}
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/10 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg flex-shrink-0 bg-surface-container-high flex items-center justify-center">
            {savedPhoto ? (
              <img src={savedPhoto} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-xl">{getInitials(user?.name)}</span>
            )}
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Candidate Dashboard</p>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">{user?.name || 'Candidate'}</h1>
            <p className="text-xs text-on-surface-variant mt-0.5 font-mono">Student ID: {user?.id || 'Not assigned'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-600 font-bold text-xs">
            <span className="material-symbols-outlined text-base">verified_user</span>
            Identity Verified
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-surface-container-high border border-outline-variant text-on-surface-variant font-bold text-xs hover:bg-surface-container-highest transition"
          >
            <span className="material-symbols-outlined text-base">settings</span>
            Settings
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatsCard title="Available Exams" value={exams.filter((exam) => exam.status === 'available').length} hint="Ready" icon="assignment" tone="primary" />
        <StatsCard title="Completed" value={stats.completedExams} hint={stats.completedExams ? `${stats.averageScore}% Avg` : 'No attempts'} icon="check_circle" tone="success" />
        <StatsCard title="Pending" value={stats.pendingExams} hint="Not attended" icon="pending_actions" tone="warning" />
        <StatsCard title="Not Started" value={stats.notStartedExams} hint="Assigned" icon="schedule" tone="danger" />
      </div>

      {/* Available Exams Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">quiz</span>
            My Assessments
          </h2>
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {visibleExams.filter((exam) => exam.status === 'available').length} Available · {visibleExams.filter((exam) => exam.status === 'assigned').length} Assigned
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleExams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      </section>

      {/* Exam History & Quick Info */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Activity Timeline */}
        <div className="lg:col-span-8 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-outline-variant">
            <div>
              <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">history</span>
                My Exam History
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Your recent assessment results and completion records</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
              {attendedExams.length} Exams
            </span>
          </div>

          {attendedExams.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">event_note</span>
              <p className="text-sm font-medium">No attended exams yet. Start your first assessment above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendedExams.slice(0, 6).map((activity, idx) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 rounded-2xl border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors group">
                  {/* Timeline Indicator */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${
                      activity.status === 'completed'
                        ? 'bg-green-500/15 text-green-600'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <span className="material-symbols-outlined text-lg">
                        {activity.status === 'completed' ? 'task_alt' : 'schedule'}
                      </span>
                    </div>
                    {idx < Math.min(attendedExams.length - 1, 5) && (
                      <div className="w-0.5 h-4 bg-outline-variant rounded-full" />
                    )}
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                      {activity.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                        {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        activity.status === 'completed'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        Attended
                      </span>
                    </div>
                  </div>

                  {/* Score Badge */}
                  {activity.score !== null ? (
                    <div className="flex-shrink-0 text-right">
                      <span className="text-2xl font-bold text-primary">{activity.score}%</span>
                      <p className="text-[10px] text-on-surface-variant font-semibold uppercase">Score</p>
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <span className="text-xs text-on-surface-variant">—</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Info Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Performance Summary Card */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="font-bold text-sm text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">insights</span>
              Performance Overview
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-xs text-on-surface-variant font-semibold">Average Score</span>
                <span className="text-lg font-bold text-primary">{stats.completedExams ? `${stats.averageScore}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-xs text-on-surface-variant font-semibold">Total Attempts</span>
                <span className="text-lg font-bold text-on-surface">{stats.completedExams}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-xs text-on-surface-variant font-semibold">Pass Rate</span>
                <span className="text-lg font-bold text-green-600">{stats.completedExams ? '100%' : '—'}</span>
              </div>
            </div>
          </div>


          {/* System Status */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
              System Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Camera & Microphone Ready
              </div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Face Biometric Registered
              </div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Browser Fullscreen Supported
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}

export default CandidateDashboard
