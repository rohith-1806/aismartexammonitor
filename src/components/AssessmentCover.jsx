import React from 'react';

function getSubjectTheme(name = '') {
  const subject = name.toLowerCase();
  if (subject.includes('python')) return { icon: 'code', label: 'Programming' };
  if (subject.includes('artificial intelligence')) return { icon: 'psychology', label: 'Artificial Intelligence' };
  if (subject.includes('data structure')) return { icon: 'account_tree', label: 'Computer Science' };
  if (subject.includes('web development')) return { icon: 'language', label: 'Web Development' };
  if (subject.includes('database')) return { icon: 'storage', label: 'Database Systems' };
  if (subject.includes('cloud')) return { icon: 'cloud', label: 'Cloud Technology' };
  return { icon: 'school', label: 'Professional Assessment' };
}

export function AssessmentCover({ exam, compact = false }) {
  const subjectTheme = getSubjectTheme(exam.name || exam.title);
  const questionCount = exam.totalQuestions ?? exam.total_questions ?? exam.questions?.length ?? 0;
  const totalMarks = exam.totalScore ?? exam.total_marks ?? 0;
  const difficulty = exam.difficulty || 'Assigned';

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-primary-container text-on-primary shadow-lg ${compact ? 'mb-0 p-4' : 'mb-stack-lg p-6 sm:p-8'}`}>
      <div className="absolute -right-8 -top-12 text-white/10">
        <span className="material-symbols-outlined text-[180px]">{subjectTheme.icon}</span>
      </div>
      <div className="relative max-w-2xl">
        <div className={`${compact ? 'mb-3' : 'mb-5'} flex flex-wrap items-center gap-3`}>
          <span className={`flex items-center justify-center rounded-xl bg-white/15 ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
            <span className={`${compact ? 'text-[23px]' : 'text-[28px]'} material-symbols-outlined`}>{subjectTheme.icon}</span>
          </span>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-white/80">{subjectTheme.label}</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">{difficulty}</span>
        </div>
        <h1 className={`${compact ? 'text-xl' : 'font-headline-lg text-headline-lg'} mt-1 font-bold text-white`}>{exam.name || exam.title}</h1>
        <p className={`${compact ? 'mt-2 text-xs' : 'mt-3 font-body-md text-body-md'} text-white/90`}>{exam.description || 'Complete this proctored assessment with care and attention.'}</p>
        <div className={`${compact ? 'mt-4' : 'mt-6'} grid grid-cols-3 gap-2`}>
          <div className="rounded-xl bg-white/15 p-3"><p className="text-xs text-white/70">Duration</p><p className="mt-1 font-bold">{exam.duration} minutes</p></div>
          <div className="rounded-xl bg-white/15 p-3"><p className="text-xs text-white/70">Questions</p><p className="mt-1 font-bold">{questionCount}</p></div>
          <div className="rounded-xl bg-white/15 p-3"><p className="text-xs text-white/70">Total marks</p><p className="mt-1 font-bold">{totalMarks}</p></div>
        </div>
      </div>
    </div>
  );
}

export default AssessmentCover;
