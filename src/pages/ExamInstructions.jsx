import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { useAppData } from '../hooks/useAppData';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { AssessmentCover } from '../components/AssessmentCover';

export function ExamInstructions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { exams } = useAppData();
  const [showWarning, setShowWarning] = useState(false);
  
  const exam = exams.find((e) => e.id === parseInt(examId, 10));

  if (!exam) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-error">error</span>
          <h1 className="font-headline-md text-headline-md text-on-surface mt-4">Exam Not Found</h1>
          <Button onClick={() => navigate('/dashboard')} className="mt-6">
            Back to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  const instructions = [
    "Read each question carefully before selecting your answer",
    "You can navigate between questions using the Navigator panel",
    "You can flag questions for review at the end",
    "Once submitted, your exam cannot be modified",
    "Ensure your camera and microphone are functional",
    "Do not open other windows or tabs during the exam",
    "Do not use external materials or resources",
    "Maintain proper lighting and seating position"
  ];

  const handleStartExam = () => {
    navigate(`/exam/${exam.id}`);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <AssessmentCover exam={exam} />

        {/* Header */}
        <div className="mb-stack-lg">
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-2">
            Before you begin
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Please review the instructions and requirements before starting
          </p>
        </div>

        {/* Exam Details Card */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-8 mb-stack-lg shadow-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Exam Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Duration</p>
              <p className="font-headline-md text-headline-md text-on-surface">{exam.duration} Minutes</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Total Questions</p>
              <p className="font-headline-md text-headline-md text-on-surface">{exam.totalQuestions}</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Difficulty Level</p>
              <p className="font-headline-md text-headline-md text-on-surface">{exam.difficulty}</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Total Marks</p>
              <p className="font-headline-md text-headline-md text-on-surface">{exam.totalScore ?? exam.total_marks ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-8 mb-stack-lg shadow-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Important Instructions</h2>
          <div className="space-y-3">
            {instructions.map((instruction, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-on-primary text-label-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-grow">
                  <p className="font-body-md text-body-md text-on-surface">{instruction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-error/10 border border-error rounded-xl p-6 mb-stack-lg">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-error text-3xl flex-shrink-0">warning</span>
            <div>
              <h3 className="font-headline-md text-headline-md text-error mb-2">Academic Integrity</h3>
              <p className="font-body-md text-error text-on-surface">
                ExamGuard uses AI-powered proctoring to monitor your exam session. Any suspicious behavior may result in exam invalidation. Ensure you follow all guidelines.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Dashboard
          </Button>
          <Button
            onClick={() => setShowWarning(true)}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            <span>Start Exam</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showWarning}
        title="Start Exam"
        onClose={() => setShowWarning(false)}
        actions={[
          {
            label: 'Start Exam',
            onClick: handleStartExam,
            variant: 'primary'
          }
        ]}
      >
        <div className="space-y-4">
          <p className="font-body-md text-body-md text-on-surface">
            Once you start this exam, your session will be monitored. Make sure you have:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li className="font-body-md text-body-md text-on-surface">Functional camera and microphone</li>
            <li className="font-body-md text-body-md text-on-surface">Stable internet connection</li>
            <li className="font-body-md text-body-md text-on-surface">Quiet environment</li>
            <li className="font-body-md text-body-md text-on-surface">No external resources</li>
          </ul>
          <p className="font-body-md text-body-md text-error font-bold">
            Do not close or refresh this window during the exam.
          </p>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default ExamInstructions
