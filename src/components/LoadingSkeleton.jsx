import React from 'react'

export function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-surface-container-high mb-3" />
          <div className="h-4 w-full rounded bg-surface-container-high mb-2" />
          <div className="h-4 w-4/5 rounded bg-surface-container-high" />
        </div>
      ))}
    </div>
  )
}

export default LoadingSkeleton
