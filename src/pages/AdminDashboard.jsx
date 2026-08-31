import React, { useEffect, useState } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { StatsCard } from '../components/StatsCard';
import { useAppData } from '../hooks/useAppData';
import { useAuth } from '../hooks/useAuth';
import { createExam, getDashboardSummary, getRegisteredCandidates } from '../services/eventApi';
import { Link, useNavigate } from 'react-router-dom';
import { AssessmentCover } from '../components/AssessmentCover';

export function AdminDashboard() {
  const { exams, addExam, loadBackendExams } = useAppData();
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [examDuration, setExamDuration] = useState('30');
  const [examTotalMarks, setExamTotalMarks] = useState('100');

  // Question Form State
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState('0');

  const [createdQuestions, setCreatedQuestions] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  useEffect(() => {
    if (token) {
      loadBackendExams(token).catch((error) => {
        console.error('Unable to load existing exams:', error);
      });
      getRegisteredCandidates(token)
        .then((response) => setCandidates(response.candidates || []))
        .catch((error) => console.error('Unable to load registered candidates:', error));
      getDashboardSummary(token)
        .then(setSummary)
        .catch((error) => console.error('Unable to load dashboard summary:', error));
    }
  }, [loadBackendExams, token]);

  const handleAddQuestion = () => {
    if (!questionText || !optionA || !optionB || !optionC || !optionD) {
      alert("Please fill in all question options.");
      return;
    }
    const newQ = {
      id: Date.now(),
      text: questionText,
      options: [optionA, optionB, optionC, optionD],
      correct: parseInt(correctOption, 10)
    };
    setCreatedQuestions([...createdQuestions, newQ]);
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectOption('0');
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examTitle) {
      alert("Please enter an exam title.");
      return;
    }
    const duration = parseInt(examDuration, 10);
    if (!Number.isInteger(duration) || duration < 30 || duration > 45) {
      alert('Exam duration must be between 30 and 45 minutes.');
      return;
    }
    if (createdQuestions.length < 10 || createdQuestions.length > 20) {
      alert('Add between 10 and 20 authored questions before deploying the exam.');
      return;
    }
    const questionBank = createdQuestions.map((question) => ({
        question_text: question.text,
        option_a: question.options[0],
        option_b: question.options[1],
        option_c: question.options[2],
        option_d: question.options[3],
        correct_option: String.fromCharCode(65 + question.correct)
      }));
    const newExamObj = {
      id: Date.now(),
      name: examTitle,
      description: examDescription || "Comprehensive proctored assessment.",
      duration,
      totalQuestions: questionBank.length,
      difficulty: 'Intermediate',
      backgroundColor: 'bg-primary-container',
      status: 'available',
      totalScore: parseInt(examTotalMarks, 10) || 100,
      passingScore: 60,
      customQuestions: createdQuestions
    };
    try {
      const response = await createExam({
        title: examTitle,
        description: examDescription,
        duration,
        totalMarks: examTotalMarks,
        questions: questionBank,
        token,
      });
      if (response.exam?.exam_id) newExamObj.id = response.exam.exam_id;
      if (response.exam?.difficulty) newExamObj.difficulty = response.exam.difficulty;
      if (response.exam?.total_questions) newExamObj.totalQuestions = response.exam.total_questions;
      if (response.exam?.total_marks) newExamObj.totalScore = response.exam.total_marks;
      if (response.exam?.duration) newExamObj.duration = response.exam.duration;
    } catch (error) {
      setSuccessMessage(error.message || 'Unable to deploy exam. Start the backend and try again.');
      return;
    }
    addExam(newExamObj);
    setSuccessMessage(`Exam '${examTitle}' created successfully with ${createdQuestions.length} custom question(s)!`);
    setExamTitle('');
    setExamDescription('');
    setCreatedQuestions([]);
    setTimeout(() => {
      setShowAddExamModal(false);
      setSuccessMessage('');
    }, 1500);
  };

  return (
    <AppLayout adminHeader>
      <div className="mx-auto max-w-7xl px-2 pb-2 pt-20 sm:px-4 sm:pb-4 sm:pt-20">
        <div className="fixed left-0 right-0 top-0 z-[60] flex h-16 items-center justify-end border-b border-outline-variant bg-white px-4 md:left-[280px] md:px-8">
          <button
            type="button"
            aria-label="View admin notifications"
            title="Notifications"
            className="relative mr-3 flex h-9 w-9 items-center justify-center rounded-full text-[#10243d] hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-[21px]">notifications</span>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" aria-label="New notification" />
          </button>
          <button
            type="button"
            onClick={() => setShowAdminMenu((current) => !current)}
            aria-expanded={showAdminMenu}
            aria-label="Open admin profile menu"
            className="flex items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-slate-100"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#10243d] text-sm font-bold text-white">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : (user?.name || 'Admin User').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-bold text-[#10243d]">{user?.name || 'Admin User'}</span>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Administrator</span>
            </span>
            <span className="material-symbols-outlined text-lg text-[#10243d]">expand_more</span>
          </button>
          {showAdminMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-outline-variant bg-white p-2 text-left shadow-xl">
              <div className="border-b border-outline-variant px-3 py-2">
                <p className="text-sm font-bold text-on-surface">{user?.name || 'Admin User'}</p>
                <p className="truncate text-xs text-on-surface-variant">{user?.email || 'Administrator'}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setShowAdminMenu(false)}
                className="mt-1 block rounded-lg px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Admin Profile
              </Link>
              <button
                type="button"
                onClick={() => { logout(); navigate('/login'); }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Logout
              </button>
            </div>
          )}
        </div>
        <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:p-6 md:mb-6 md:flex md:items-center md:justify-between md:gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">ExamGuard / Staff workspace</p>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Admin & Faculty Control Center
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Manage examinations, add question banks, track student attendance, and inspect proctoring analytics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddExamModal(true)}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-lg hover:brightness-110 md:mt-0"
          >
            <span className="material-symbols-outlined text-xl">add_circle</span>
            Create New Exam & Questions
          </button>
        </div>

        {/* Analytics Overview */}
        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Student Attendance %" value={`${summary?.attendance_percentage ?? 0}%`} hint="Completed at least one test" icon="school" tone="primary" />
          <StatsCard title="Average Student Score" value={`${summary?.average_score ?? 0}%`} hint="Submitted answer performance" icon="insights" tone="success" />
          <StatsCard title="Total Registered Candidates" value={summary?.total_candidates ?? candidates.length} hint="Enrolled roster" icon="groups" tone="info" />
          <StatsCard title="High Risk Sessions" value={summary?.high_risk_sessions ?? 0} hint="Warning limit or integrity risk" icon="warning" tone="warning" />
        </div>

        {/* Exam Management Board */}
        <div className="mb-8 rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
            <div>
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">assignment</span>
                Professional Exam Management Board
              </h2>
              <p className="text-xs text-on-surface-variant">Active examinations available for proctored candidate deployment</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
              {exams.length} Exams Configured
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {exams.map((ex) => (
              <Link key={ex.id} to={`/admin/exams/${ex.id}/preview`} className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary">
                <AssessmentCover exam={ex} compact />
              </Link>
            ))}
          </div>
        </div>

        {/* Registered Student Roster */}
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
            <div>
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                Registered Student Directory & Attendance
              </h2>
              <p className="text-xs text-on-surface-variant">Enrolled candidates, facial signature statuses, and average percentage grades</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold font-mono">
              {candidates.length} Registered Students
            </span>
          </div>

          {candidates.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline">group</span>
              <p className="mt-2 text-sm font-semibold">No candidates registered yet.</p>
              <p className="mt-1 text-xs">Registered candidates will appear here after creating an account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b border-outline-variant text-xs uppercase text-on-surface">
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Face Verification</th>
                    <th className="px-4 py-3">Completed Exams</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="border-b border-outline-variant last:border-0">
                      <td className="px-4 py-4 font-bold text-on-surface">{candidate.name}</td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">{candidate.email}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-green-600">
                        {candidate.photo_registered ? 'Verified photo registered' : 'Photo not registered'}
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">{candidate.completed_exams}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add New Exam & Questions Modal */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-3xl bg-surface-container-lowest border border-outline-variant p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-2xl">post_add</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Create Examination & Add Questions</h2>
                  <p className="text-xs text-on-surface-variant">Faculty Question Builder</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExamModal(false)}
                className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high transition"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Exam Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Operating Systems"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={examDuration}
                    onChange={(e) => setExamDuration(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Exam description and instructions..."
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              {/* Question Creator Box */}
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 space-y-4">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">quiz</span>
                  Add Question to Bank ({createdQuestions.length} Added)
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Question Text</label>
                  <input
                    type="text"
                    placeholder="e.g. What is virtual memory in Operating Systems?"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Option A"
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-xs text-on-surface"
                  />
                  <input
                    type="text"
                    placeholder="Option B"
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-xs text-on-surface"
                  />
                  <input
                    type="text"
                    placeholder="Option C"
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-xs text-on-surface"
                  />
                  <input
                    type="text"
                    placeholder="Option D"
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-xs text-on-surface"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-on-surface-variant">Correct Option:</span>
                    <select
                      value={correctOption}
                      onChange={(e) => setCorrectOption(e.target.value)}
                      className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-primary"
                    >
                      <option value="0">Option A</option>
                      <option value="1">Option B</option>
                      <option value="2">Option C</option>
                      <option value="3">Option D</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Question
                  </button>
                </div>
              </div>

              {/* Questions Preview List */}
              {createdQuestions.length > 0 && (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                  {createdQuestions.map((q, idx) => (
                    <div key={q.id} className="p-3 rounded-xl bg-surface-bright border border-outline-variant text-xs flex justify-between items-center">
                      <span className="font-semibold text-on-surface truncate max-w-md">{idx + 1}. {q.text}</span>
                      <span className="font-bold text-green-600 text-[11px]">Correct: Option {String.fromCharCode(65 + q.correct)}</span>
                    </div>
                  ))}
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 text-xs font-bold text-center">
                  ✓ {successMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowAddExamModal(false)}
                  className="px-5 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 transition shadow-md"
                >
                  Deploy Exam to Platform
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AdminDashboard;
