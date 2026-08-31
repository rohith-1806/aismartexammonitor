import React from 'react'

export function ActionModal({ isOpen, title, children, onClose, actions = [] }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl max-w-md w-full mx-4 p-8">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-6">{children}</div>

        <div className="flex gap-3 flex-wrap">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                action.onClick?.()
                if (action.closeOnClick !== false) {
                  onClose()
                }
              }}
              className={`flex-1 py-3 rounded-lg font-label-md text-label-md font-bold transition-all ${
                action.variant === 'danger'
                  ? 'bg-error text-on-error hover:bg-error/90'
                  : 'bg-primary-container text-on-primary-container hover:bg-primary'
              }`}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-label-md text-label-md font-bold bg-surface-container text-on-surface hover:bg-surface-container-high transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export { ActionModal as Modal }
