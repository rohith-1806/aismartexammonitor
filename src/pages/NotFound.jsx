import React from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'

export function NotFound() {
  return (
    <AuthLayout>
      <div className="max-w-md text-center">
        <div className="mb-6">
          <h1 className="font-headline-xl text-headline-xl text-on-surface">404</h1>
          <p className="font-headline-md text-headline-md font-bold">Page Not Found</p>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="bg-primary text-white px-6 py-3 rounded-lg font-bold">Home</Link>
          <Link to="/login" className="bg-surface-container text-on-surface px-6 py-3 rounded-lg border border-outline-variant">Login</Link>
        </div>
      </div>
    </AuthLayout>
  )
}

export default NotFound
