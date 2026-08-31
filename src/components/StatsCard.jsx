import React from 'react'

export function StatsCard({ title, value, hint, icon, tone = 'primary', titleClass = 'text-on-surface-variant' }) {
  const toneClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    danger: 'text-danger bg-danger/10',
    warning: 'text-warning bg-warning/10'
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className={`material-symbols-outlined text-3xl ${toneClasses[tone] || toneClasses.primary}`}>{icon}</span>
        {hint ? <span className="rounded-full bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">{hint}</span> : null}
      </div>
      <h3 className={`font-label-md text-label-md ${titleClass}`}>{title}</h3>
      <p className="font-headline-md text-headline-md font-bold text-on-surface mt-1">{value}</p>
    </div>
  )
}

export default StatsCard
