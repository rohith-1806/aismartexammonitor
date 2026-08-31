import React from 'react'

export function ExamQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  onToggleFlag,
  isFlagged
}) {
  if (!question) {
    return null
  }

  const renderOption = (optionText, optionIndex) => {
    const isSelected = selectedAnswer === optionIndex
    const optionClassName = isSelected
      ? 'bg-primary/10 border-primary'
      : 'bg-surface-container-low border-outline-variant hover:border-primary/50'

    return (
      <label
        key={optionIndex}
        className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${optionClassName}`}
      >
        <input
          type="radio"
          name={`question-${question.id}`}
          value={optionIndex}
          checked={isSelected}
          onChange={() => onAnswerSelect(optionIndex)}
          className="w-4 h-4 cursor-pointer"
        />
        <span className="ml-3 font-body-md text-body-md text-on-surface">
          {optionText}
        </span>
      </label>
    )
  }

  return (
    <article className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-headline-md text-headline-md text-on-surface">
            Question {questionNumber} of {totalQuestions}
          </span>
          <button
            type="button"
            onClick={onToggleFlag}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isFlagged
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined">flag</span>
            <span className="font-label-md text-label-md">
              {isFlagged ? 'Flagged' : 'Flag'}
            </span>
          </button>
        </div>
        <div className="w-full bg-surface-container-high rounded-full h-1">
          <div
            className="bg-primary h-1 rounded-full"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-body-lg text-body-lg text-on-surface mb-6 leading-relaxed">
          {question.text}
        </h2>

        <div className="space-y-3">
          {question.options?.map(renderOption)}
        </div>
      </div>
    </article>
  )
}
