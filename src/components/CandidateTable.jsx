import React from 'react'

export function CandidateTable({ rows = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <table className="min-w-full divide-y divide-outline-variant">
        <thead className="bg-surface-container-high">
          <tr>
            <th className="px-4 py-3 text-left text-label-sm uppercase text-on-surface-variant">Candidate</th>
            <th className="px-4 py-3 text-left text-label-sm uppercase text-on-surface-variant">Status</th>
            <th className="px-4 py-3 text-left text-label-sm uppercase text-on-surface-variant">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-label-md text-label-md text-on-surface">{row.name}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-label-sm ${row.status === 'Verified' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 font-label-md text-label-md text-on-surface">{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CandidateTable
