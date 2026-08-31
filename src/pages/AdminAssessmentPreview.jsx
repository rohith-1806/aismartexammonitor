import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AssessmentCover } from '../components/AssessmentCover';
import { Button } from '../components/Button';
import { getExamPreview } from '../services/eventApi';
import { useAuth } from '../hooks/useAuth';

export default function AdminAssessmentPreview() {
  const { examId } = useParams();
  const { token } = useAuth();
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getExamPreview(examId, token).then(setExam).catch((err) => setError(err.message || 'Unable to load assessment preview.'));
  }, [examId, token]);

  if (error) return <AppLayout><div className="mx-auto max-w-3xl py-12 text-center"><p className="text-error">{error}</p><Link to="/admin"><Button className="mt-6">Back to Admin Dashboard</Button></Link></div></AppLayout>;
  if (!exam) return <AppLayout><div className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center text-on-surface-variant"><span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span></div></AppLayout>;

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-2 py-4 sm:px-4 sm:py-6">
        <AssessmentCover exam={{ ...exam, name: exam.title, totalQuestions: exam.questions?.length, totalScore: exam.total_marks }} />
        <div className="mb-6 flex items-center justify-between gap-4"><div><h2 className="font-headline-md text-headline-md font-bold text-on-surface">Question Preview</h2><p className="mt-1 text-sm text-on-surface-variant">Administrative view of the authored assessment.</p></div><Link to="/admin"><Button variant="secondary">Back to Dashboard</Button></Link></div>
        <div className="space-y-4">
          {exam.questions.map((question, index) => (
            <article key={question.question_id} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4"><h3 className="font-bold text-on-surface"><span className="mr-2 text-primary">{index + 1}.</span>{question.question_text}</h3><span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Question {index + 1}</span></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{['a', 'b', 'c', 'd'].map((letter) => <div key={letter} className={`rounded-xl border p-3 text-sm ${question.correct_option === letter.toUpperCase() ? 'border-secondary bg-secondary/10 font-bold text-secondary' : 'border-outline-variant bg-surface-container-low text-on-surface-variant'}`}><span className="mr-2 font-mono font-bold">{letter.toUpperCase()}.</span>{question[`option_${letter}`]}{question.correct_option === letter.toUpperCase() && <span className="ml-2 text-xs">Correct answer</span>}</div>)}</div>
            </article>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
