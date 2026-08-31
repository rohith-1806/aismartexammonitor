import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function SessionLogout() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-8 shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
          <span className="material-symbols-outlined text-3xl text-danger">logout</span>
        </div>
        <h2 className="text-center font-headline-md text-headline-md text-on-surface">Confirm Logout</h2>
        <p className="mt-3 text-center font-body-md text-body-md text-on-surface-variant">Are you sure you want to log out? Any unsaved work in the current review will be cleared.</p>
        <div className="mt-8 space-y-3">
          <button type="button" onClick={handleLogout} className="w-full rounded-xl bg-danger px-4 py-4 font-label-md text-label-md font-bold text-on-error">Logout</button>
          <button type="button" onClick={() => navigate('/dashboard')} className="w-full rounded-xl border border-outline-variant bg-surface-container-high px-4 py-4 font-label-md text-label-md font-bold text-on-surface-variant">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default SessionLogout
