import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import CandidateDashboard from './pages/CandidateDashboard'
import ExamInstructions from './pages/ExamInstructions'
import LiveExam from './pages/LiveExam'
import SessionExpired from './pages/SessionExpired'
import SessionLogout from './pages/SessionLogout'
import AdminDashboard from './pages/AdminDashboard'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import QuestionImporter from './pages/QuestionImporter'
import Profile from './pages/Profile'
import SessionLogs from './pages/SessionLogs'
import AdminAssessmentPreview from './pages/AdminAssessmentPreview'
import NotFound from './pages/NotFound'
import ProtectedRoute from './routes/ProtectedRoute'
import { ROUTES } from './utils/mockData'

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Landing />} />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.REGISTER} element={<Register />} />
      <Route
        path={ROUTES.DASHBOARD}
        element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>}
      />
      <Route
        path="/instructions"
        element={<ProtectedRoute><ExamInstructions /></ProtectedRoute>}
      />
      <Route
        path={ROUTES.EXAM_INSTRUCTIONS}
        element={<ProtectedRoute><ExamInstructions /></ProtectedRoute>}
      />
      <Route
        path={ROUTES.EXAM}
        element={<ProtectedRoute><LiveExam /></ProtectedRoute>}
      />
      <Route path="/exam" element={<ProtectedRoute><LiveExam /></ProtectedRoute>} />
      <Route path="/logout" element={<SessionLogout />} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/exams/:examId/preview" element={<ProtectedRoute><AdminAssessmentPreview /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
      <Route path={ROUTES.SESSION_EXPIRED} element={<SessionExpired />} />
      <Route
        path="/question-importer"
        element={<ProtectedRoute><QuestionImporter /></ProtectedRoute>}
      />
      <Route
        path={ROUTES.SYNTHETIC_DATA}
        element={<ProtectedRoute><QuestionImporter /></ProtectedRoute>}
      />
      <Route
        path={ROUTES.PROFILE}
        element={<ProtectedRoute><Profile /></ProtectedRoute>}
      />
      <Route
        path={ROUTES.SESSION_LOGS}
        element={<ProtectedRoute><SessionLogs /></ProtectedRoute>}
      />
      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
    </Routes>
  )
}
