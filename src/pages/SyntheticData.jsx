import React, { useState } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { useAppData } from '../hooks/useAppData';
import { Button } from '../components/Button';

export function SyntheticData() {
  const [questionCount, setQuestionCount] = useState(10);
  const [examType, setExamType] = useState('Multiple Choice');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const { generatedData, generateSyntheticData, exportJSON, generateFakeCandidates, generateFakeSessionLogs, clearGeneratedData } = useAppData();

  const handleGenerate = () => {
    generateSyntheticData({ questionCount, examType, difficulty });
  };

  const handleExport = () => {
    exportJSON({
      metadata: { examType, difficulty, generatedAt: new Date().toISOString() },
      generatedQuestions: generatedData.questions || []
    });
  };

  const handleFakeCandidates = () => {
    generateFakeCandidates();
  };

  const handleFakeSessionLogs = () => {
    generateFakeSessionLogs();
  };

  const handleClear = () => {
    clearGeneratedData();
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Synthetic Data Generator
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Create test questions and export the generated dataset for development.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-gutter">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-8 shadow-sm">
            <div className="space-y-6">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Generate Test Data</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Generate realistic sample questions for exam review, testing, and training purposes.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option>Multiple Choice</option>
                    <option>True/False</option>
                    <option>Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <Button variant="primary" size="lg" onClick={handleGenerate} className="w-full">
                <span className="material-symbols-outlined">refresh</span>
                Generate Questions
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleFakeCandidates}
                className="w-full"
              >
                <span className="material-symbols-outlined">groups</span>
                Generate Candidates
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleFakeSessionLogs}
                className="w-full"
              >
                <span className="material-symbols-outlined">history</span>
                Generate Session Logs
              </Button>
              <Button
                variant="tertiary"
                size="lg"
                onClick={handleClear}
                className="w-full"
              >
                <span className="material-symbols-outlined">delete</span>
                Clear Generated Data
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleExport}
                className="w-full"
                disabled={!(generatedData.questions?.length > 0)}
              >
                <span className="material-symbols-outlined">download</span>
                Export as JSON
              </Button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Generated Questions</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Review the latest generated dataset below.
                </p>
              </div>
              <span className="rounded-full bg-primary-container text-on-primary-container px-3 py-1 text-label-sm font-bold">
                {generatedData.questions?.length || 0} items
              </span>
            </div>

            {generatedData.questions?.length === 0 ? (
              <div className="bg-surface-container-high rounded-2xl p-8 text-center text-on-surface-variant">
                Click “Generate Questions” to populate new exam questions.
              </div>
            ) : (
              <div className="space-y-4 max-h-[560px] overflow-y-auto pr-2">
                {generatedData.questions.slice(0, 10).map((question) => (
                  <div key={question.id} className="rounded-2xl border border-outline-variant bg-surface p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-label-md text-label-md font-bold text-on-surface">Q{question.id}</h3>
                      <span className="rounded-full bg-surface-container text-on-surface px-2 py-1 text-label-sm">
                        {question.difficulty}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface mb-3">{question.text}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {question.options.map((option, index) => (
                        <div key={index} className="rounded-xl bg-surface-container-low p-3 text-body-md text-on-surface">
                          {String.fromCharCode(65 + index)}. {option}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Generated Questions</p>
          <p className="font-headline-md text-headline-md text-on-surface font-bold mt-2">{generatedData.questions?.length || 0}</p>
        </div>
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Generated Candidates</p>
          <p className="font-headline-md text-headline-md text-on-surface font-bold mt-2">{generatedData.candidates?.length || 0}</p>
        </div>
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Generated Session Logs</p>
          <p className="font-headline-md text-headline-md text-on-surface font-bold mt-2">{generatedData.sessionLogs?.length || 0}</p>
        </div>
      </div>
    </AppLayout>
  );
}

export default SyntheticData
