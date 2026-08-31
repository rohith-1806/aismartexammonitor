import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { AppDataProvider } from './contexts/AppDataContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppDataProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </AppDataProvider>
  </React.StrictMode>
)
