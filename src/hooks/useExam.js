import { useState, useCallback } from 'react'
import { mockQuestions } from '../utils/mockData'

export function useExamSession(questionBank = []) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answersByQuestion, setAnswersByQuestion] = useState({})
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState(new Set())
  const [isExamStarted, setIsExamStarted] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const currentQuestion = questionBank[currentQuestionIndex] || {}
  const totalQuestions = questionBank.length

  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index)
    }
  }, [totalQuestions])

  const goToPreviousQuestion = useCallback(() => {
    setCurrentQuestionIndex((previousIndex) => Math.max(previousIndex - 1, 0))
  }, [])

  const goToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex((previousIndex) => Math.min(previousIndex + 1, totalQuestions - 1))
  }, [totalQuestions])

  const saveCandidateAnswer = useCallback((questionId, answerIndex) => {
    setAnswersByQuestion((previousAnswers) => ({
      ...previousAnswers,
      [questionId]: answerIndex
    }))
  }, [])

  const toggleFlagQuestion = useCallback((questionId) => {
    setFlaggedQuestionIds((previousFlags) => {
      const nextFlags = new Set(previousFlags)
      if (nextFlags.has(questionId)) {
        nextFlags.delete(questionId)
      } else {
        nextFlags.add(questionId)
      }
      return nextFlags
    })
  }, [])

  const startExam = useCallback(() => {
    setIsExamStarted(true)
    setAnswersByQuestion({})
    setFlaggedQuestionIds(new Set())
    setCurrentQuestionIndex(0)
  }, [])

  const submitExam = useCallback(() => {
    setHasSubmitted(true)
    const correctAnswers = Object.keys(answersByQuestion).reduce((score, questionId) => {
      const question = questionBank.find((entry) => entry.id === parseInt(questionId, 10))
      return question && answersByQuestion[questionId] === question.correctAnswer ? score + 1 : score
    }, 0)

    const total = questionBank.length || mockQuestions.length
    return {
      totalQuestions: total,
      answeredQuestions: Object.keys(answersByQuestion).length,
      correctAnswers,
      score: total ? Math.round((correctAnswers / total) * 100) : 0
    }
  }, [answersByQuestion, questionBank])

  const resetExam = useCallback(() => {
    setCurrentQuestionIndex(0)
    setAnswersByQuestion({})
    setFlaggedQuestionIds(new Set())
    setIsExamStarted(false)
    setHasSubmitted(false)
  }, [])

  const getQuestionStatus = useCallback((questionId) => {
    if (answersByQuestion[questionId] !== undefined) {
      return 'answered'
    }
    if (flaggedQuestionIds.has(questionId)) {
      return 'flagged'
    }
    return 'unanswered'
  }, [answersByQuestion, flaggedQuestionIds])

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    answers: answersByQuestion,
    flaggedQuestions: flaggedQuestionIds,
    examStarted: isExamStarted,
    examSubmitted: hasSubmitted,
    goToQuestion,
    goToPreviousQuestion,
    goToNextQuestion,
    answerQuestion: saveCandidateAnswer,
    toggleFlagQuestion,
    startExam,
    submitExam,
    resetExam,
    getQuestionStatus
  }
}
