import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamSession } from '../hooks/useExam';
import { useAuth } from '../hooks/useAuth';
import { useAppData } from '../hooks/useAppData';
import { ExamTimer } from '../components/Timer';
import { ExamQuestionCard } from '../components/QuestionCard';
import { ExamQuestionNavigator } from '../components/QuestionNavigator';
import { ActionModal } from '../components/Modal';
import { PrimaryButton } from '../components/Button';
import { buildExamQuestions } from '../utils/mockData';
import { logBrowserEvent, startExamSession } from '../services/eventApi';

export function Exam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, session, token } = useAuth();
  const { getExamById, completeExam, addSessionEvent } = useAppData();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [examResult, setExamResult] = useState(null);
  const [examSessionId, setExamSessionId] = useState(null);
  const examStartInitializedRef = useRef(false);
  const examStartedLoggedRef = useRef(false);
  const examSessionInitializedRef = useRef(false);

  const exam = getExamById(examId);
  const questionBank = useMemo(() => buildExamQuestions(exam), [exam]);
  const examState = useExamSession(questionBank);

  const emitBrowserEvent = React.useCallback(async (eventType, details = null) => {
    if (!token || !examSessionId) return;

    try {
      await logBrowserEvent({
        sessionId: examSessionId,
        eventType,
        additionalDetails: details,
        token
      });
    } catch (error) {
      console.warn(`Browser event logging failed for ${eventType}:`, error);
    }
  }, [examSessionId, token]);

  const handleSubmitExam = React.useCallback(() => {
    const result = examState.submitExam();
    setExamResult(result);
    completeExam(examId, result);
    if (examSessionId && token) {
      emitBrowserEvent('exam_submitted', `Exam submitted with an estimated score of ${result.score}%.`);
    }
    setShowSubmitModal(false);
  }, [examState, completeExam, examId, examSessionId, token, emitBrowserEvent]);

  const handleTimeUp = React.useCallback(() => {
    const result = examState.submitExam();
    setExamResult(result);
    completeExam(examId, result);
    addSessionEvent({
      event: 'Exam Auto-Submitted',
      status: 'Info',
      sessionId: session?.id ?? `EXAM-${examId}`,
      details: 'Exam time expired and submission was completed automatically.',
      score: result.score
    });
    if (examSessionId && token) {
      emitBrowserEvent('exam_submitted', 'Exam auto-submitted after the timer expired.');
    }
    setShowTimeUpModal(true);
  }, [examState, completeExam, addSessionEvent, session, examId, examSessionId, token, emitBrowserEvent]);

  useEffect(() => {
    if (!exam || examResult || examSessionInitializedRef.current) return;

    examSessionInitializedRef.current = true;
    startExamSession(examId, token)
      .then((data) => {
        setExamSessionId(data.session_id);
        return logBrowserEvent({
          sessionId: data.session_id,
          eventType: 'exam_page_opened',
          additionalDetails: `Opened the ${exam.name} exam experience.`,
          token
        });
      })
      .catch((error) => {
        console.warn('Unable to initialize backend exam session logging:', error);
      });
  }, [exam, examId, examResult, token]);

  useEffect(() => {
    if (!examState.examStarted && !examStartInitializedRef.current) {
      examStartInitializedRef.current = true;
      examState.startExam();
      addSessionEvent({
        event: 'Exam Started',
        status: 'Info',
        sessionId: session?.id ?? `EXAM-${examId}`,
        details: `The candidate started the ${exam?.name} exam.`,
        score: null,
        exam: exam?.name
      });
    }
  }, [examState, addSessionEvent, exam, session, examId]);

  useEffect(() => {
    if (examState.examStarted && examSessionId && token && !examStartedLoggedRef.current) {
      examStartedLoggedRef.current = true;
      emitBrowserEvent('exam_started', `The candidate started the ${exam?.name} exam.`);
    }
  }, [examState.examStarted, examSessionId, token, exam, emitBrowserEvent]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !examResult) {
        const nextCount = tabSwitchCount + 1;
        setTabSwitchCount(nextCount);
        setShowTabWarning(true);

        addSessionEvent({
          event: 'Tab Switch Warning',
          status: 'Warning',
          sessionId: session?.id ?? `EXAM-${examId}`,
          details: `Candidate switched away from the exam tab ${nextCount} time${nextCount === 1 ? '' : 's'}.`,
          score: null
        });

        emitBrowserEvent('tab_switch', `Candidate switched away from the exam tab ${nextCount} time${nextCount === 1 ? '' : 's'}.`);
        emitBrowserEvent('focus_lost', 'Exam lost focus while the user switched away from the tab.');

        if (nextCount >= 2) {
          handleSubmitExam();
        }
      } else if (!document.hidden && !examResult) {
        emitBrowserEvent('focus_regained', 'Exam focus returned after the user returned to the tab.');
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tabSwitchCount, addSessionEvent, session, examId, examResult, handleSubmitExam, emitBrowserEvent]);

  useEffect(() => {
    return () => {
      if (!examResult && examSessionId && token) {
        emitBrowserEvent('exam_page_closed', 'The exam page was closed before submission.');
      }
    };
  }, [emitBrowserEvent, examResult, examSessionId, token]);

  if (!exam) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl p-10 text-center">
          <span className="material-symbols-outlined text-error text-5xl">error</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-4">Exam Not Found</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            The requested exam does not exist or is unavailable.
          </p>
          <PrimaryButton onClick={() => navigate('/dashboard')} className="mt-6" variant="primary" size="lg">
            Back to Dashboard
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const handleDone = () => {
    navigate('/dashboard');
  };

  if (examResult) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Exam Submitted</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8">
            Your exam has been successfully submitted and is now under review.
          </p>

          <div className="bg-surface-container-low rounded-xl p-6 mb-8 space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">Total Questions</span>
              <span className="font-headline-md text-headline-md text-on-surface">{examResult.totalQuestions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">Questions Answered</span>
              <span className="font-headline-md text-headline-md text-on-surface">{examResult.answeredQuestions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-label-md text-label-md text-on-surface-variant">Correct Answers</span>
              <span className="font-headline-md text-headline-md text-on-surface">{examResult.correctAnswers}</span>
            </div>
            <div className="border-t border-outline-variant pt-4 flex justify-between items-center">
              <span className="font-headline-md text-headline-md text-on-surface-variant">Estimated Score</span>
              <span className="font-headline-lg text-headline-lg text-primary font-bold">{examResult.score}%</span>
            </div>
          </div>

          <PrimaryButton
            onClick={handleDone}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Back to Dashboard
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between bg-[#10243d] px-margin-mobile text-white shadow-sm md:px-margin-desktop">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary-fixed text-2xl">security</span>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-white tracking-tight">
              ExamGuard
            </h1>
            <p className="hidden md:block font-label-sm text-label-sm text-white/60 uppercase tracking-widest">
              Exam Mode
            </p>
          </div>
        </div>

        {/* Desktop Timer & Progress */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex flex-col items-center">
            <ExamTimer
              duration={exam.duration * 60}
              onTimeUp={handleTimeUp}
              isActive={true}
            />
          </div>
          <div className="h-8 w-px bg-outline-variant"></div>
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-label-sm text-on-surface-variant">QUESTION PROGRESS</span>
            <span className="font-headline-md text-headline-md text-on-surface">
              {examState.currentQuestionIndex + 1} of {examState.totalQuestions}
            </span>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="font-label-md text-label-md text-on-surface font-bold">{user?.name}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">ID: {user?.id}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold">
            {user?.name?.split(' ').map(n => n[0]).join('')}
          </div>
        </div>
      </header>

      {/* Mobile Progress Bar */}
      <div className="md:hidden mt-16 px-margin-mobile py-2 bg-surface-container flex justify-between items-center border-b border-outline-variant">
        <ExamTimer
          duration={exam.duration * 60}
          onTimeUp={handleTimeUp}
          isActive={true}
        />
        <span className="font-label-md text-label-md text-on-surface">
          Q{examState.currentQuestionIndex + 1} / {examState.totalQuestions}
        </span>
      </div>

      <main className="flex flex-1 mt-16 md:mt-16 h-[calc(100vh-64px)] overflow-hidden">
        <ExamQuestionNavigator
          totalQuestions={examState.totalQuestions}
          currentQuestionIndex={examState.currentQuestionIndex}
          answers={examState.answers}
          flaggedQuestions={examState.flaggedQuestions}
          onNavigate={examState.goToQuestion}
          getQuestionStatus={examState.getQuestionStatus}
        />

        {/* Question Section */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-6 md:p-8">
            <ExamQuestionCard
              question={examState.currentQuestion}
              questionNumber={examState.currentQuestionIndex + 1}
              totalQuestions={examState.totalQuestions}
              selectedAnswer={examState.answers[examState.currentQuestion.id]}
              onAnswerSelect={(answerIndex) => {
                examState.answerQuestion(examState.currentQuestion.id, answerIndex);
              }}
              onToggleFlag={() => examState.toggleFlagQuestion(examState.currentQuestion.id)}
              isFlagged={examState.flaggedQuestions.has(examState.currentQuestion.id)}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="border-t border-outline-variant bg-surface-container-low p-6 flex gap-4">
            <PrimaryButton
              onClick={examState.goToPreviousQuestion}
              variant="secondary"
              disabled={examState.currentQuestionIndex === 0}
              className="flex-1"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Previous
            </PrimaryButton>
            <PrimaryButton
              onClick={examState.goToNextQuestion}
              variant="secondary"
              disabled={examState.currentQuestionIndex === examState.totalQuestions - 1}
              className="flex-1"
            >
              Next
              <span className="material-symbols-outlined">arrow_forward</span>
            </PrimaryButton>
            <PrimaryButton
              onClick={() => setShowSubmitModal(true)}
              variant="primary"
              className="flex-1"
            >
              Submit Exam
              <span className="material-symbols-outlined">check</span>
            </PrimaryButton>
          </div>
        </div>
      </main>

      {/* Submit Modal */}
      <ActionModal
        isOpen={showSubmitModal}
        title="Submit Exam?"
        onClose={() => setShowSubmitModal(false)}
        actions={[
          {
            label: 'Submit',
            onClick: handleSubmitExam,
            variant: 'danger'
          }
        ]}
      >
        <div className="space-y-4">
          <p className="font-body-md text-body-md text-on-surface">
            Are you sure you want to submit your exam? You cannot make changes after submission.
          </p>
          <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">Questions Answered</span>
              <span className="font-label-md text-label-md text-on-surface">{Object.keys(examState.answers).length} / {examState.totalQuestions}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">Questions Flagged</span>
              <span className="font-label-md text-label-md text-on-surface">{examState.flaggedQuestions.size}</span>
            </div>
          </div>
        </div>
      </ActionModal>

      {/* Time Up Modal */}
      <ActionModal
        isOpen={showTimeUpModal}
        title="Time's Up!"
        onClose={() => setShowTimeUpModal(false)}
      >
        <div className="space-y-4">
          <p className="font-body-md text-body-md text-on-surface">
            Your exam time has expired. Your answers have been automatically submitted for review.
          </p>
          <PrimaryButton
            onClick={handleDone}
            variant="primary"
            size="lg"
            className="w-full"
          >
            View Results
          </PrimaryButton>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={showTabWarning}
        title="Exam Attention"
        onClose={() => setShowTabWarning(false)}
        actions={[
          {
            label: 'Continue Exam',
            onClick: () => setShowTabWarning(false),
            variant: 'primary'
          }
        ]}
      >
        <div className="space-y-4">
          <p className="font-body-md text-body-md text-on-surface">
            We detected that you left the exam tab. This is being logged as a proctoring warning.
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Continued switching may trigger automatic submission for exam integrity.
          </p>
          <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Warning Count</p>
            <p className="font-headline-md text-headline-md text-on-surface font-bold mt-2">{tabSwitchCount}</p>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}

export default Exam
