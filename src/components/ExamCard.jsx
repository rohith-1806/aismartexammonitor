import React from 'react';
import { Link } from 'react-router-dom';

export function ExamCard({ exam }) {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return { bg: 'bg-tertiary-container', text: 'text-tertiary', tag: 'bg-white/90 text-tertiary' };
      case 'Intermediate':
        return { bg: 'bg-primary-container', text: 'text-primary', tag: 'bg-white/90 text-primary' };
      case 'Advanced':
        return { bg: 'bg-secondary', text: 'text-on-secondary', tag: 'bg-white/90 text-secondary' };
      default:
        return { bg: 'bg-primary-container', text: 'text-primary', tag: 'bg-white/90 text-primary' };
    }
  };

  const colors = getDifficultyColor(exam.difficulty);
  const getSubjectTheme = (name) => {
    const subject = name.toLowerCase();
    if (subject.includes('python')) return { icon: 'code', label: 'Python', cover: 'bg-blue-600' };
    if (subject.includes('artificial intelligence')) return { icon: 'psychology', label: 'AI', cover: 'bg-emerald-600' };
    if (subject.includes('data structure')) return { icon: 'account_tree', label: 'Data Structures', cover: 'bg-amber-600' };
    if (subject.includes('web development')) return { icon: 'language', label: 'Web Development', cover: 'bg-cyan-700' };
    if (subject.includes('database')) return { icon: 'storage', label: 'Databases', cover: 'bg-slate-700' };
    if (subject.includes('cloud')) return { icon: 'cloud', label: 'Cloud Computing', cover: 'bg-sky-600' };
    return { icon: 'school', label: 'Assessment', cover: 'bg-blue-600' };
  };

  const subjectTheme = getSubjectTheme(exam.name);
  const isAssigned = exam.status === 'assigned';

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <div className={`h-32 ${subjectTheme.cover} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
          backgroundSize: '12px 12px'
        }}></div>
        <div className="absolute right-5 top-1/2 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-white shadow-inner">
          <span className="material-symbols-outlined text-[44px]">{subjectTheme.icon}</span>
        </div>
        <div className="absolute left-4 right-24 top-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
            <span className="material-symbols-outlined text-[17px]">{subjectTheme.icon}</span>
          </span>
          <span className="font-label-sm text-label-sm uppercase tracking-wider">{subjectTheme.label}</span>
          </div>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-white/65">Exam {String(exam.id).padStart(2, '0')}</span>
        </div>
        <div className="absolute bottom-3 left-4 right-24 flex items-center gap-3">
          <span className={`${colors.tag} font-label-sm text-label-sm px-3 py-1 rounded-full uppercase tracking-wider`}>
            {exam.difficulty}
          </span>
          <span className="h-px flex-1 bg-white/30" aria-hidden="true"></span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-headline-md text-headline-md mb-2 text-on-surface text-[22px] leading-7">{exam.name}</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
            <span className="font-label-md text-label-md">{exam.duration} Mins</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">help_center</span>
            <span className="font-label-md text-label-md">{exam.totalQuestions} Questions</span>
          </div>
        </div>
        <div className={`mb-4 flex items-center gap-2 text-xs font-bold ${isAssigned ? 'text-amber-600' : 'text-green-600'}`}>
          <span className="material-symbols-outlined text-[18px]">{isAssigned ? 'pending_actions' : 'check_circle'}</span>
          {isAssigned ? 'Assigned · Not Started' : 'Available to Start'}
        </div>
        <Link
          to={isAssigned ? '#' : `/exam/${exam.id}/instructions`}
          onClick={(event) => {
            if (isAssigned) event.preventDefault();
          }}
          aria-disabled={isAssigned}
          className={`w-full py-3 rounded-lg font-bold text-label-md inline-flex items-center justify-center gap-2 transition-colors duration-150 ${
            isAssigned
              ? 'cursor-not-allowed bg-surface-container-high text-on-surface-variant'
              : 'bg-primary-container text-on-primary-container hover:bg-primary-container/90 active:scale-95'
          }`}
        >
          {isAssigned ? 'Not Available Yet' : 'Start Exam'}
          <span className="material-symbols-outlined text-[20px]">{isAssigned ? 'lock' : 'arrow_forward'}</span>
        </Link>
      </div>
    </div>
  );
}
