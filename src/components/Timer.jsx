import React, { useEffect, useState } from 'react'

function formatCountdown(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  return [hours, minutes, remainder]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function ExamTimer({ duration, onTimeUp, isActive = true }) {
  const [secondsRemaining, setSecondsRemaining] = useState(duration)

  useEffect(() => {
    if (!isActive || secondsRemaining === 0) {
      return undefined
    }

    const timer = setInterval(() => {
      setSecondsRemaining((previousValue) => {
        if (previousValue <= 1) {
          onTimeUp?.()
          return 0
        }
        return previousValue - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isActive, onTimeUp, secondsRemaining])

  const countdownText = formatCountdown(secondsRemaining)
  const statusClass = secondsRemaining < 300 ? 'text-error' : 'text-on-surface'

  return (
    <div className="flex flex-col items-center">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
        Time Remaining
      </span>
      <span className={`font-headline-md text-headline-md ${statusClass} tabular-nums font-bold`}>
        {countdownText}
      </span>
    </div>
  )
}
