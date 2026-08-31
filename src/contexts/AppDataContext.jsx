import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react'
import { getExamById } from '../utils/mockData'
import { calculateIntegrityScore, getRiskLabel, calculateFacePresenceRatio } from '../utils/integrityEngine'
import { getAssignedExams, getCandidateSessions } from '../services/eventApi'

const STORAGE_KEY = 'examguard_app_data_v1'

const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Unable to save app data', error)
  }
}

const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('Unable to load app data', error)
    return null
  }
}

const normalizeActivityLog = (items) => {
  return items.map((item) => ({
    ...item,
    date: item.date ? new Date(item.date).toISOString() : new Date().toISOString()
  }))
}

const initialState = {
  exams: [],
  activityLog: [],
  sessionLogs: [],
  generatedData: {
    questions: [],
    candidates: [],
    sessionLogs: []
  }
}

const demoExamTitles = new Set([
  'Python Programming Test',
  'Artificial Intelligence Basics',
  'Data Structures Intro',
  'Web Development Fundamentals',
  'Advanced Database Design',
  'Cloud Computing Essentials'
])

const isDemoExam = (exam) => demoExamTitles.has(exam.name)
const isDemoActivity = (activity) => /^(Python Programming Test|Artificial Intelligence Basics|Data Structures Intro|Web Development Fundamentals|Advanced Database Design|Cloud Computing Essentials)/.test(activity.title || '')

const getInitialExams = (storedExams) => {
  if (!storedExams) return initialState.exams

  const uniqueExams = storedExams
    .filter((exam) => !isDemoExam(exam))
    .filter((exam, index, exams) => exams.findIndex((item) => item.id === exam.id) === index)

  return uniqueExams.map((exam) => {
    return exam
  })
}

export const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  // Lazy initializers: load from localStorage SYNCHRONOUSLY on first render
  // so admin-deployed exams persist across login/logout cycles
  const stored = loadState();
  const [exams, setExams] = useState(() => getInitialExams(stored?.exams))
  const [activityLog, setActivityLog] = useState(() =>
    stored?.activityLog ? normalizeActivityLog(stored.activityLog.filter((activity) => !isDemoActivity(activity))) : initialState.activityLog
  )
  const [sessionLogs, setSessionLogs] = useState(() =>
    stored?.sessionLogs ? normalizeActivityLog(stored.sessionLogs) : initialState.sessionLogs
  )
  const [generatedData, setGeneratedData] = useState(() => stored?.generatedData ?? initialState.generatedData)


  useEffect(() => {
    saveState({ exams, activityLog, sessionLogs, generatedData })
  }, [exams, activityLog, sessionLogs, generatedData])

  const stats = useMemo(() => {
    const completedExams = exams.filter((exam) => exam.status === 'completed').length
    const pendingExams = exams.filter((exam) => exam.status !== 'completed').length
    const notStartedExams = exams.filter((exam) => exam.status === 'assigned').length
    const completedScores = exams
      .filter((exam) => exam.status === 'completed' && typeof exam.score === 'number')
      .map((exam) => exam.score)
    const averageScore = completedScores.reduce((acc, score) => acc + score, 0)
    const average = completedScores.length
    return {
      totalExams: exams.length,
      completedExams,
      pendingExams,
      notStartedExams,
      averageScore: average ? Math.round(averageScore / average) : 0
    }
  }, [exams, sessionLogs])

  const completeExam = useCallback(
    (examId, result, proctorReport = null) => {
      const currentExam = exams.find((exam) => exam.id === parseInt(examId, 10))
      if (!currentExam) return

      setExams((prev) =>
        prev.map((item) =>
          item.id === currentExam.id ? { ...item, status: 'completed', score: result.score } : item
        )
      )

      let integrityScore = 100
      let riskLabel = 'Low Risk'
      let facePresenceRatio = 100
      let tabSwitchCount = 0
      let focusLossCount = 0
      let faceAbsentDuration = 0
      let multipleFacesCount = 0
      let prohibitedItemsCount = 0

      if (proctorReport) {
        integrityScore = proctorReport.integrity_summary?.integrity_score ?? 100
        riskLabel = proctorReport.integrity_summary?.status ?? 'Low Risk'
        if (riskLabel === 'CLEARED') riskLabel = 'Low Risk'
        else if (riskLabel === 'FLAGGED FOR REVIEW') riskLabel = 'Medium Risk'
        else if (riskLabel === 'HIGH VIOLATION RISK') riskLabel = 'Critical Risk'
        else riskLabel = getRiskLabel(integrityScore)

        tabSwitchCount = proctorReport.violation_metrics?.tab_switch_count ?? 0
        faceAbsentDuration = proctorReport.violation_metrics?.total_absence_duration_seconds ?? 0
        multipleFacesCount = proctorReport.violation_metrics?.multiple_face_events_count ?? 0
        prohibitedItemsCount = proctorReport.violation_metrics?.object_violation_count ?? 0
        focusLossCount = Math.max(0, tabSwitchCount - 1)
        facePresenceRatio = calculateFacePresenceRatio(currentExam.duration * 60, faceAbsentDuration)
      } else {
        const mockMetrics = {
          tabSwitchCount: result.tabSwitchCount ?? 0,
          focusLossCount: result.focusLossCount ?? 0,
          browserClosed: result.browserClosed ?? false,
          faceAbsentDuration: result.faceAbsentDuration ?? 0,
          multipleFacesCount: result.multipleFacesCount ?? 0,
          prohibitedItemsCount: result.prohibitedItemsCount ?? 0
        }
        integrityScore = calculateIntegrityScore(mockMetrics)
        riskLabel = getRiskLabel(integrityScore)
        facePresenceRatio = calculateFacePresenceRatio(currentExam.duration * 60, mockMetrics.faceAbsentDuration)
        
        tabSwitchCount = mockMetrics.tabSwitchCount
        focusLossCount = mockMetrics.focusLossCount
        faceAbsentDuration = mockMetrics.faceAbsentDuration
        multipleFacesCount = mockMetrics.multipleFacesCount
        prohibitedItemsCount = mockMetrics.prohibitedItemsCount
      }

      const sessionLog = {
        id: Date.now(),
        date: new Date().toISOString(),
        exam: currentExam.name,
        duration: `${currentExam.duration}m`,
        status: 'Completed',
        score: result.score,
        integrityScore,
        riskLabel,
        facePresenceRatio,
        tabSwitchCount,
        focusLossCount,
        faceAbsentDuration,
        multipleFacesCount,
        prohibitedItemsCount,
        candidateName: result.candidateName || 'Alex Carter',
        candidateId: result.candidateId || 'EG-88294'
      }

      const activityEntry = {
        id: Date.now() + 1,
        title: `${currentExam.name} Completed`,
        status: 'completed',
        date: new Date().toISOString(),
        score: result.score
      }

      setSessionLogs((prev) => [sessionLog, ...prev])
      setActivityLog((prev) => [activityEntry, ...prev])
    },
    [exams]
  )

  const generateSyntheticData = useCallback((options) => {
    const questionCount = Math.max(5, Math.min(50, Number(options.questionCount) || 10))
    const difficulty = options.difficulty || 'Intermediate'
    const examType = options.examType || 'Multiple Choice'

    const generated = Array.from({ length: questionCount }).map((_, index) => {
      const typeLabel = examType === 'Short Answer' ? 'Describe' : examType === 'True/False' ? 'Determine' : 'Select'
      const optionsList = examType === 'True/False'
        ? ['True', 'False']
        : [`${difficulty} concept A`, `${difficulty} concept B`, `${difficulty} concept C`, `${difficulty} concept D`]

      return {
        id: index + 1,
        text: `Generated ${examType} ${difficulty} question ${index + 1}: ${typeLabel} the correct response for this scenario.`,
        options: optionsList,
        correctAnswer: examType === 'True/False' ? index % 2 : index % optionsList.length,
        examType,
        difficulty,
        explanation: `This is a generated ${examType.toLowerCase()} question used for synthetic exam testing.`
      }
    })

    setGeneratedData((prev) => ({ ...prev, questions: generated }))
    return generated
  }, [])

  const exportJSON = useCallback((payload) => {
    const data = payload || { exams, sessionLogs, activityLog, generatedData }
    const filename = `examguard-export-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }, [exams, sessionLogs, activityLog, generatedData])

  const addExam = useCallback((newExam) => {
    setExams((prev) => [
      ...prev,
      {
        ...newExam,
        id: newExam.id || Date.now(),
        status: newExam.status || 'available'
      }
    ]);
  }, []);

  const getExamByIdFromState = useCallback(
    (examId) => exams.find((exam) => exam.id === parseInt(examId, 10) || exam.id === examId),
    [exams]
  )

  const addSessionEvent = useCallback(
    ({ event, status, sessionId, details, score = null, exam = null, recordActivity = true }) => {
      const timestamp = new Date().toISOString()
      const normalizedStatus = status ? String(status) : 'Info'
      const sessionLogEntry = {
        id: Date.now(),
        date: timestamp,
        event,
        exam: exam || event,
        duration: 'N/A',
        status: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1),
        sessionId,
        details,
        score
      }
      const activityEntry = {
        id: Date.now() + 1,
        title: event,
        status: normalizedStatus.toLowerCase(),
        date: timestamp,
        score
      }

      setSessionLogs((prev) => [sessionLogEntry, ...prev])
      if (recordActivity) {
        setActivityLog((prev) => [activityEntry, ...prev])
      }
    },
    []
  )

  const generateFakeCandidates = useCallback(() => {
    const fakeCandidates = Array.from({ length: 8 }).map((_, index) => ({
      id: `CAND-${index + 1}`,
      name: `Candidate ${index + 1}`,
      email: `candidate${index + 1}@example.com`,
      role: 'Candidate',
      registeredAt: new Date(Date.now() - index * 3600 * 1000).toISOString()
    }))
    setGeneratedData((prev) => ({ ...prev, candidates: fakeCandidates }))
    return fakeCandidates
  }, [])

  const loadBackendExams = useCallback(async (token) => {
    if (!token) return []
    const response = await getAssignedExams(token)
    const backendExams = (response.exams || []).map((exam) => ({
      id: exam.exam_id,
      name: exam.title,
      description: exam.description || '',
      duration: exam.duration,
      totalQuestions: exam.total_questions || 0,
      totalScore: exam.total_marks,
      difficulty: exam.difficulty || 'Assigned',
      status: exam.status || 'assigned',
      backend: true
    }))
    setExams(backendExams)
    return backendExams
  }, [])

  const loadBackendSessions = useCallback(async (token) => {
    if (!token) return []
    const response = await getCandidateSessions(token)
    const backendSessions = (response.sessions || []).map((session) => ({
      id: session.session_id,
      date: session.end_time || session.start_time,
      exam: session.exam,
      title: `${session.exam} ${session.status === 'Completed' ? 'Completed' : 'In Progress'}`,
      duration: 'N/A',
      status: session.status === 'Completed' ? 'Completed' : 'In Progress',
      score: session.score,
      sessionId: session.session_id,
    }))
    setSessionLogs(backendSessions)
    setActivityLog(backendSessions.map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status.toLowerCase(),
      date: session.date,
      score: session.score,
    })))
    return backendSessions
  }, [])

  const generateFakeSessionLogs = useCallback(() => {
    const fakeSessionLogs = Array.from({ length: 6 }).map((_, index) => ({
      id: `LOG-${index + 1}`,
      date: new Date(Date.now() - index * 90 * 60 * 1000).toISOString(),
      event: index % 2 === 0 ? 'Exam Submitted' : 'Tab Switch Warning',
      status: index % 2 === 0 ? 'Completed' : 'Warning',
      sessionId: `SESSION-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      details: index % 2 === 0 ? `Score: ${80 + index}%` : 'Candidate switched tabs while taking an exam',
      score: index % 2 === 0 ? 80 + index : null
    }))
    setGeneratedData((prev) => ({ ...prev, sessionLogs: fakeSessionLogs }))
    return fakeSessionLogs
  }, [])

  const seedAnalyticsData = useCallback(() => {
    const candidatesList = [
      { name: 'Alex Carter', id: 'CAND-001' },
      { name: 'Mina Patel', id: 'CAND-002' },
      { name: 'Louis Kim', id: 'CAND-003' },
      { name: 'Sarah Jenkins', id: 'CAND-004' },
      { name: 'Rajesh Kumar', id: 'CAND-005' },
      { name: 'David Chen', id: 'CAND-006' },
      { name: 'Aisha Diop', id: 'CAND-007' },
      { name: 'Elena Rostova', id: 'CAND-008' },
      { name: 'Marcus Vance', id: 'CAND-009' },
      { name: 'Chloe Lafont', id: 'CAND-010' },
      { name: 'Carlos Mendez', id: 'CAND-011' },
      { name: 'Yuki Tanaka', id: 'CAND-012' },
      { name: 'Liam O\'Connor', id: 'CAND-013' },
      { name: 'Fatima Al-Sayed', id: 'CAND-014' },
      { name: 'Emily Watson', id: 'CAND-015' }
    ]

    const examsList = [
      'Python Programming Test',
      'Artificial Intelligence Basics',
      'Data Structures Intro',
      'Web Development Fundamentals',
      'Advanced Database Design'
    ]

    const seededLogs = []
    const now = Date.now()

    for (let i = 0; i < 38; i++) {
      const candidate = candidatesList[i % candidatesList.length]
      const examName = examsList[i % examsList.length]
      const date = new Date(now - i * 4.5 * 3600 * 1000).toISOString()
      const score = Math.floor(Math.random() * 32) + 65 // 65 to 97

      // Violation profiles:
      const roll = Math.random()
      let tabSwitchCount = 0
      let focusLossCount = 0
      let faceAbsentDuration = 0
      let multipleFacesCount = 0
      let prohibitedItemsCount = 0
      let browserClosed = false

      if (roll < 0.72) {
        // Low Risk
        tabSwitchCount = Math.random() < 0.25 ? 1 : 0
        focusLossCount = tabSwitchCount
        faceAbsentDuration = Math.floor(Math.random() * 8)
      } else if (roll < 0.86) {
        // Medium Risk
        tabSwitchCount = Math.floor(Math.random() * 2) + 1
        focusLossCount = tabSwitchCount + Math.floor(Math.random() * 2)
        faceAbsentDuration = Math.floor(Math.random() * 20) + 6
        multipleFacesCount = Math.random() < 0.2 ? 1 : 0
      } else if (roll < 0.94) {
        // High Risk
        tabSwitchCount = Math.floor(Math.random() * 2) + 2
        focusLossCount = tabSwitchCount + Math.floor(Math.random() * 2)
        faceAbsentDuration = Math.floor(Math.random() * 70) + 20
        multipleFacesCount = Math.random() < 0.4 ? 1 : 0
        prohibitedItemsCount = Math.random() < 0.65 ? 1 : 0
      } else {
        // Critical Risk
        tabSwitchCount = Math.floor(Math.random() * 2) + 3
        focusLossCount = tabSwitchCount + Math.floor(Math.random() * 3)
        faceAbsentDuration = Math.floor(Math.random() * 180) + 90
        multipleFacesCount = Math.floor(Math.random() * 2) + 1
        prohibitedItemsCount = Math.floor(Math.random() * 2) + 1
        browserClosed = Math.random() < 0.4
      }

      const metrics = {
        tabSwitchCount,
        focusLossCount,
        browserClosed,
        faceAbsentDuration,
        multipleFacesCount,
        prohibitedItemsCount
      }

      const integrityScore = calculateIntegrityScore(metrics)
      const riskLabel = getRiskLabel(integrityScore)
      const facePresenceRatio = calculateFacePresenceRatio(45 * 60, faceAbsentDuration)

      seededLogs.push({
        id: now - i * 200000,
        date,
        exam: examName,
        duration: '45m',
        status: 'Completed',
        score,
        integrityScore,
        riskLabel,
        facePresenceRatio,
        tabSwitchCount,
        focusLossCount,
        faceAbsentDuration,
        multipleFacesCount,
        prohibitedItemsCount,
        candidateName: candidate.name,
        candidateId: candidate.id
      })
    }

    setSessionLogs(seededLogs)

    const seededActivity = seededLogs.slice(0, 5).map((log) => ({
      id: log.id + 1,
      title: `${log.exam} Completed`,
      status: 'completed',
      date: log.date,
      score: log.score
    }))
    setActivityLog(seededActivity)
  }, [])

  const clearGeneratedData = useCallback(() => {
    setGeneratedData({ questions: [], candidates: [], sessionLogs: [] })
  }, [])

  const resetPortalData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setExams(initialState.exams)
    setActivityLog([])
    setSessionLogs([])
  }, [])

  return (
    <AppDataContext.Provider
      value={{
        exams,
        activityLog,
        sessionLogs,
        generatedData,
        stats,
        completeExam,
        addExam,
        loadBackendExams,
        loadBackendSessions,
        addSessionEvent,
        generateSyntheticData,
        generateFakeCandidates,
        generateFakeSessionLogs,
        clearGeneratedData,
        resetPortalData,
        seedAnalyticsData,
        exportJSON,
        getExamById: getExamByIdFromState
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}
