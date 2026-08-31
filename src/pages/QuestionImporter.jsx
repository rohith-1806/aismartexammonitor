import React, { useState } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { useAppData } from '../hooks/useAppData';

export function QuestionImporter() {
  const { exams, addExam } = useAppData();

  const [rawText, setRawText] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('new');
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDuration, setNewExamDuration] = useState('60');

  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parseStatus, setParseStatus] = useState('');

  // Robust Line-by-Line State Machine Question Parser
  // Only detects question numbers at the very START of a line to avoid
  // false matches on numbers inside question text (e.g. "2 apples", "30%")
  const parseRawQuestionsText = (text) => {
    if (!text || !text.trim()) return [];

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const results = [];

    // Regex that ONLY matches a question number at the start of a line
    // Matches: "1.", "1)", "Q1.", "Q1)", "Q1:" — but NOT "A)", "B)" etc.
    const questionStartRegex = /^(?:Q\.?\s*)?(\d{1,3})\s*[.\):\-]\s+(.+)/i;

    // Regex for option lines: must start with A-D followed by . or ) or :
    const optionRegex = /^([A-Da-d])\s*[.\):]\s*(.+)/;

    // Regex for answer lines
    const answerRegex = /^(?:Answer|Correct|Ans|Correct Answer)\s*[:\-=]?\s*(?:\(?([A-Da-d])\)?|Option\s+([A-Da-d]))/i;

    let currentQuestion = null;

    const pushCurrentQuestion = () => {
      if (!currentQuestion) return;
      // Only push if we have a valid question with at least the question text
      // Pad missing options
      while (currentQuestion.options.length < 4) {
        currentQuestion.options.push(`Option ${String.fromCharCode(65 + currentQuestion.options.length)}`);
      }
      results.push({
        id: `PARSED-${results.length + 1}`,
        text: currentQuestion.text,
        options: currentQuestion.options.slice(0, 4),
        correct: Math.min(3, Math.max(0, currentQuestion.correct))
      });
    };

    for (const line of lines) {
      // 1. Check if this line is an Answer line first (before option check,
      //    since "A" could match both)
      const answerMatch = line.match(answerRegex);
      if (answerMatch && currentQuestion) {
        const ansChar = (answerMatch[1] || answerMatch[2]).toUpperCase();
        currentQuestion.correct = ansChar.charCodeAt(0) - 65;
        continue;
      }

      // 2. Check if this line starts a NEW question (number at start of line)
      const qMatch = line.match(questionStartRegex);
      if (qMatch) {
        // Before starting a new question, save the previous one
        pushCurrentQuestion();
        currentQuestion = {
          text: qMatch[2].trim(),
          options: [],
          correct: 0
        };
        continue;
      }

      // 3. Check if this line is an option (A/B/C/D at start of line)
      const optMatch = line.match(optionRegex);
      if (optMatch && currentQuestion) {
        const optLetter = optMatch[1].toUpperCase();
        const expectedIndex = optLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3

        // Only accept if it's the next expected option or a valid A-D
        if (expectedIndex >= 0 && expectedIndex <= 3) {
          // Fill any gaps (e.g., if we somehow skipped B)
          while (currentQuestion.options.length < expectedIndex) {
            currentQuestion.options.push(`Option ${String.fromCharCode(65 + currentQuestion.options.length)}`);
          }
          // Avoid duplicates — only add if we're at the right index
          if (currentQuestion.options.length === expectedIndex) {
            currentQuestion.options.push(optMatch[2].trim());
          }
        }
        continue;
      }

      // 4. If none of the above matched and we have a current question with
      //    no options yet, this line is a continuation of the question text
      if (currentQuestion && currentQuestion.options.length === 0) {
        currentQuestion.text += ' ' + line;
      }
    }

    // Don't forget the last question
    pushCurrentQuestion();

    return results;
  };

  const handleParseClick = () => {
    if (!rawText.trim()) {
      setParseStatus('Please paste question text first.');
      return;
    }

    const questions = parseRawQuestionsText(rawText);
    if (questions.length === 0) {
      setParseStatus('Unable to parse questions. Ensure questions start with 1., 2. and options start with A), B), C), D).');
      return;
    }

    setParsedQuestions(questions);
    setParseStatus(`✓ Successfully parsed ${questions.length} questions from text!`);
  };

  const handleDocxFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      setRawText(content);
      const questions = parseRawQuestionsText(content);
      setParsedQuestions(questions);
      setParseStatus(`✓ Loaded file '${file.name}' and parsed ${questions.length} questions!`);
    };
    reader.readAsText(file);
  };

  const handleSaveParsedExam = () => {
    if (parsedQuestions.length === 0) {
      alert("No parsed questions to import.");
      return;
    }

    const title = newExamTitle || `Imported Assessment (${parsedQuestions.length} Qs)`;
    const newExamObj = {
      id: Date.now(),
      name: title,
      description: `Bulk imported question bank containing ${parsedQuestions.length} parsed items.`,
      duration: parseInt(newExamDuration, 10) || 60,
      totalQuestions: parsedQuestions.length,
      difficulty: 'Intermediate',
      backgroundColor: 'bg-primary-container',
      status: 'available',
      totalScore: parsedQuestions.length * 10,
      passingScore: 60,
      customQuestions: parsedQuestions
    };

    addExam(newExamObj);
    alert(`✓ Successfully created exam '${title}' with ${parsedQuestions.length} question(s)!`);
    setRawText('');
    setParsedQuestions([]);
    setNewExamTitle('');
    setParseStatus('');
  };

  const sampleQuestionFormat = `1. What is the primary function of the Operating System CPU scheduler?
A) Allocate CPU time to processes in the ready queue
B) Manage hard drive disk partitions
C) Render GUI graphical windows
D) Compile high-level C++ source code
Answer: A

2. Which data structure operates on a Last-In, First-Out (LIFO) principle?
A) Queue
B) Stack
C) Binary Search Tree
D) Hash Map
Answer: B`;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Smart Question Importer
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Paste questions from a document or text source. The structured parser extracts questions, options, and answers automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRawText(sampleQuestionFormat)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold text-xs hover:bg-primary/20 transition"
          >
            <span className="material-symbols-outlined text-base">content_paste</span>
            Load Sample Question Format
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Text Paste & File Upload */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">edit_note</span>
                  Paste Raw Questions Text
                </h2>

                <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface hover:bg-outline-variant transition flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">upload_file</span>
                  Upload Docx / Text File
                  <input type="file" accept=".txt,.docx,.doc" onChange={handleDocxFileUpload} className="hidden" />
                </label>
              </div>

              <textarea
                rows={12}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Paste questions copied from ChatGPT or Word document here...\n\nExample Format:\n1. Question text here...\nA) Option A\nB) Option B\nC) Option C\nD) Option D\nAnswer: B`}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-4 font-mono text-xs text-on-surface focus:border-primary focus:outline-none leading-relaxed"
              />

              {parseStatus && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-bold ${parseStatus.includes("✓") ? "bg-green-500/10 border border-green-500/30 text-green-600" : "bg-amber-500/10 border border-amber-500/30 text-amber-600"}`}>
                  {parseStatus}
                </div>
              )}

              <button
                type="button"
                onClick={handleParseClick}
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">auto_fix_high</span>
                Parse & Extract Questions
              </button>
            </div>

            {/* Exam Configuration Form */}
            {parsedQuestions.length > 0 && (
              <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">add_task</span>
                  Deploy Parsed Exam ({parsedQuestions.length} Questions Ready)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">New Exam Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Operating Systems Final Test"
                      value={newExamTitle}
                      onChange={(e) => setNewExamTitle(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={newExamDuration}
                      onChange={(e) => setNewExamDuration(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveParsedExam}
                  className="w-full py-3.5 px-4 rounded-xl bg-secondary text-on-secondary font-bold text-sm shadow-md hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">rocket_launch</span>
                  Deploy Exam to Platform
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Parsed Question Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant">
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">visibility</span>
                  Parsed Question Bank ({parsedQuestions.length})
                </h3>

                {parsedQuestions.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[11px] font-bold">
                    ✓ Clean Extraction
                  </span>
                )}
              </div>

              {parsedQuestions.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 text-outline">description</span>
                  <p className="text-xs font-medium">Paste text on the left and click 'Parse & Extract Questions' to preview structured questions here.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                  {parsedQuestions.map((q, idx) => (
                    <div key={idx} className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-2">
                      <p className="font-bold text-xs text-on-surface">
                        {idx + 1}. {q.text}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2 rounded-lg border text-xs ${
                              oIdx === q.correct
                                ? "bg-green-500/15 border-green-500/40 text-green-700 font-bold"
                                : "bg-surface-container-lowest border-outline-variant text-on-surface-variant"
                            }`}
                          >
                            <span className="font-mono uppercase font-bold mr-1">{String.fromCharCode(65 + oIdx)}:</span>
                            {opt}
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
      </div>
    </AppLayout>
  );
}

export default QuestionImporter;
