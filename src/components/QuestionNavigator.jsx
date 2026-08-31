import React from 'react'

export function ExamQuestionNavigator({
  totalQuestions,
  currentQuestionIndex,
  answers,
  flaggedQuestions,
  onNavigate,
  getQuestionStatus
}) {
  const questionButtons = Array.from({ length: totalQuestions }, (_, index) => {
    const questionNumber = index + 1
    const status = getQuestionStatus(questionNumber)
    const baseClasses = 'w-10 h-10 flex items-center justify-center rounded-lg font-label-md text-label-md cursor-pointer border transition-all '
    const activeClasses = index === currentQuestionIndex
      ? 'bg-primary text-on-primary border-primary ring-2 ring-primary ring-offset-2'
      : status === 'answered'
      ? 'bg-secondary-container text-on-secondary-container border-secondary'
      : status === 'flagged'
      ? 'bg-tertiary-container text-on-tertiary-container border-tertiary'
      : 'bg-surface-container-highest text-on-surface-variant border-transparent'

    return (
      <button
        key={questionNumber}
        type="button"
        onClick={() => onNavigate(index)}
        className={baseClasses + activeClasses}
        title={`Question ${questionNumber} - ${status}`}
      >
        {questionNumber}
      </button>
    )
  })

  return (
    <aside className="h-full flex flex-col bg-surface-container-low border-r border-outline-variant overflow-hidden">
      <div className="p-6 border-b border-outline-variant overflow-y-auto">
        <h3 className="font-label-md text-label-md font-bold text-on-surface-variant mb-4 uppercase tracking-wider">
          Question Navigator
        </h3>
        <div className="grid grid-cols-5 gap-2">{questionButtons}</div>
      </div>

      <div className="p-6 border-b border-outline-variant">
        <h3 className="font-label-sm text-label-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
          Legend
        </h3>
        <div className="space-y-2 text-label-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-primary"></span>
            <span className="text-on-surface">Current</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-secondary-container border border-secondary"></span>
            <span className="text-on-surface">Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-tertiary-container border border-tertiary"></span>
            <span className="text-on-surface">Flagged</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-surface-container-highest"></span>
            <span className="text-on-surface">Not Visited</span>
          </div>
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-outline-variant bg-surface-container">
        <div className="text-label-sm text-on-surface-variant mb-4">
          <p>Answered: {Object.keys(answers).length} / {totalQuestions}</p>
          <p>Flagged: {flaggedQuestions.size}</p>
        </div>
      </div>
    </aside>
  )
}
