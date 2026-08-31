import React from 'react'

export function AlertCard({ title, description, tone = 'info', icon = 'info' }) {
  const toneClasses = {
    info: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20'
  }

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone] || toneClasses.info}`}>
      <div className="flex gap-3">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
        <div>
          <h3 className="font-label-md text-label-md font-bold">{title}</h3>
          <p className="font-body-md text-body-md mt-1">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default AlertCard
