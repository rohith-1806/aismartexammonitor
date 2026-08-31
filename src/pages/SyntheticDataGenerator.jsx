import React, { useState } from 'react'
import { AppLayout } from '../layouts/AppLayout'
import { useAppData } from '../hooks/useAppData'
import { Button } from '../components/Button'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function SyntheticDataGenerator() {
  const [questionCount, setQuestionCount] = useState(10)
  const [examType, setExamType] = useState('Multiple Choice')
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [loading, setLoading] = useState(false)
  const { generatedData, generateSyntheticData, exportJSON, generateFakeCandidates, generateFakeSessionLogs, clearGeneratedData } = useAppData()

  const handleGenerate = () => {
    setLoading(true)
    setTimeout(() => {
      generateSyntheticData({ questionCount, examType, difficulty })
      setLoading(false)
    }, 500)
  }

  const handleExport = () => {
    exportJSON({ metadata: { examType, difficulty, generatedAt: new Date().toISOString() }, generatedQuestions: generatedData.questions || [] })
  }

  return (
    <AppLayout>
      <div className="mb-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Synthetic Data Generator</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Generate candidate and exam data to support testing without relying on real student information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-gutter">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
          <div className="space-y-6">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Generate Test Data</h2>
              <p className="mt-2 font-body-md text-body-md text-on-surface-variant">Populate the system with realistic sample questions and session logs.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block font-label-md text-label-md text-on-surface-variant">Number of Questions</label>
                <input type="number" min="5" max="100" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3" />
              </div>
              <div>
                <label className="mb-2 block font-label-md text-label-md text-on-surface-variant">Exam Type</label>
                <select value={examType} onChange={(e) => setExamType(e.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3">
                  <option>Multiple Choice</option>
                  <option>True/False</option>
                  <option>Short Answer</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block font-label-md text-label-md text-on-surface-variant">Difficulty Level</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <Button variant="primary" size="lg" onClick={handleGenerate} className="w-full">Generate Questions</Button>
            <Button variant="secondary" size="lg" onClick={generateFakeCandidates} className="w-full">Generate Candidates</Button>
            <Button variant="secondary" size="lg" onClick={generateFakeSessionLogs} className="w-full">Generate Session Logs</Button>
            <Button variant="tertiary" size="lg" onClick={clearGeneratedData} className="w-full">Clear Generated Data</Button>
            <Button variant="secondary" size="lg" onClick={handleExport} className="w-full" disabled={!generatedData.questions?.length}>Export as JSON</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Generated Output</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Review the latest generated data below.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-label-sm text-primary">{generatedData.questions?.length || 0} items</span>
          </div>

          {loading ? <LoadingSkeleton rows={4} /> : generatedData.questions?.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-high p-8 text-center text-on-surface-variant">Click Generate Questions to populate new synthetic exam content.</div>
          ) : (
            <div className="max-h-[560px] space-y-4 overflow-y-auto pr-2">
              {generatedData.questions.slice(0, 8).map((question) => (
                <div key={question.id} className="rounded-2xl border border-outline-variant bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-label-md text-label-md font-bold text-on-surface">Q{question.id}</h3>
                    <span className="rounded-full bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">{question.difficulty}</span>
                  </div>
                  <p className="mb-3 font-body-md text-body-md text-on-surface">{question.text}</p>
                  <div className="grid gap-2">
                    {question.options.map((option, index) => (
                      <div key={index} className="rounded-xl bg-surface-container-low p-3 text-body-md text-on-surface">{String.fromCharCode(65 + index)}. {option}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default SyntheticDataGenerator
