import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { useAppData } from '../hooks/useAppData';
import { ExamCard } from '../components/ExamCard';

export function Dashboard() {
  const { user } = useAuth();
  const { exams, activityLog, stats } = useAppData();

  const availableExams = useMemo(
    () => exams.filter((exam) => exam.status !== 'completed').length,
    [exams]
  );

  const availableExamList = useMemo(
    () => exams.filter((exam) => exam.status !== 'completed'),
    [exams]
  );

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <AppLayout>
      <div className="mb-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
          Welcome, {user?.name}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Your upcoming assessments and academic progress at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">assignment</span>
            <span className="bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded font-label-sm text-label-sm">
              {availableExams} Open
            </span>
          </div>
          <h3 className="font-label-md text-label-md text-on-surface-variant">Total Exam Inventory</h3>
          <p className="font-headline-md text-headline-md font-bold text-on-surface mt-1">
            {exams.length}
          </p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-secondary text-3xl">check_circle</span>
            <span className="bg-secondary-fixed text-on-secondary-fixed px-2 py-1 rounded font-label-sm text-label-sm">
              {stats.averageScore}% Avg
            </span>
          </div>
          <h3 className="font-label-md text-label-md text-on-surface-variant">Completed Exams</h3>
          <p className="font-headline-md text-headline-md font-bold text-on-surface mt-1">
            {stats.completedExams}
          </p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="material-symbols-outlined text-tertiary text-3xl">pending_actions</span>
            <span className="bg-tertiary-fixed text-on-tertiary-fixed px-2 py-1 rounded font-label-sm text-label-sm">
              {stats.pendingExams} Pending
            </span>
          </div>
          <h3 className="font-label-md text-label-md text-on-surface-variant">Pending Exams</h3>
          <p className="font-headline-md text-headline-md font-bold text-on-surface mt-1">
            {stats.pendingExams}
          </p>
        </div>
      </div>

      <section className="mb-stack-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-md text-headline-md text-on-surface">Available Exams</h2>
          <Link to="/session-logs" className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1">
            View all <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {availableExamList.length > 0 ? (
            availableExamList.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
              <p className="font-headline-md text-headline-md text-on-surface-variant">
                No available exams at the moment. Check back later or review your completed sessions.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant mb-stack-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Recent Activity</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Automatically updated after each exam completion.</p>
          </div>
          <Link to="/session-logs" className="text-primary font-bold hover:underline">
            View logs
          </Link>
        </div>
        <div className="space-y-4">
          {activityLog.slice(0, 4).map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 bg-surface rounded-xl border border-outline-variant/30"
            >
              <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center ${
                activity.status === 'completed'
                  ? 'bg-secondary-fixed'
                  : 'bg-primary-fixed'
              }`}>
                <span className="material-symbols-outlined text-[20px]">
                  {activity.status === 'completed' ? 'task_alt' : 'schedule'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-label-md text-label-md font-bold text-on-surface">
                  {activity.title}
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {formatDate(activity.date)}
                </p>
              </div>
              {activity.score !== null && (
                <span className="font-headline-md text-headline-md font-bold text-primary">
                  {activity.score}%
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}

export default Dashboard
