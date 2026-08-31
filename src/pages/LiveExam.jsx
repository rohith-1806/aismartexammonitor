import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MonitoringPanel from "../components/MonitoringPanel";
import WarningPopup from "../components/WarningPopup";
import WebcamPreview from "../components/WebcamPreview";
import { useAppData } from '../hooks/useAppData';
import { useAuth } from '../hooks/useAuth';
import { buildExamQuestions } from '../utils/mockData';
import { startExamSession, submitExamSession, logBrowserEvent, verifyCandidateIdentity, getExamDetails, requestProfileUpdate } from '../services/eventApi';

export function LiveExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, token, session, updateProfile } = useAuth();
  const { getExamById, completeExam, addSessionEvent, loadBackendExams, loadBackendSessions } = useAppData();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [showSubmit, setShowSubmit] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [autoSubmitNotice, setAutoSubmitNotice] = useState("");

  const [cameraStatus, setCameraStatus] = useState("Active");
  const [faceStatus, setFaceStatus] = useState("Detected");
  const [browserStatus, setBrowserStatus] = useState("Focused");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [identityVerificationError, setIdentityVerificationError] = useState("");
  const [identityMatchConfidence, setIdentityMatchConfidence] = useState(null);

  const [warningCount, setWarningCount] = useState(0);
  const [faceWarningCount, setFaceWarningCount] = useState(0);
  const [multipleFacesCount, setMultipleFacesCount] = useState(0);
  const [phoneDetectedCount, setPhoneDetectedCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);

  const [examSessionId, setExamSessionId] = useState(null);
  const [backendQuestions, setBackendQuestions] = useState(null);
  const sessionInitializedRef = useRef(false);
  const submissionStartedRef = useRef(false);
  const autoSubmitReasonRef = useRef(false);

  const prevFaceStatusRef = useRef("Detected");
  const prevPhoneDetectedRef = useRef(false);
  const lastTabSwitchTimeRef = useRef(0);
  const warningAutoSubmitRef = useRef(false);

  const exam = getExamById(examId);
  const questions = useMemo(() => {
    if (backendQuestions) return backendQuestions;
    return exam?.backend ? [] : buildExamQuestions(exam);
  }, [backendQuestions, exam]);

  useEffect(() => {
    if (!exam?.backend || !token) return;
    getExamDetails(examId, token)
      .then((data) => {
        setBackendQuestions((data.questions || []).map((question) => ({
          id: question.question_id,
          text: question.question_text,
          options: [question.option_a, question.option_b, question.option_c, question.option_d]
        })));
      })
      .catch((error) => console.error('Unable to load authored exam questions:', error));
  }, [exam, examId, token]);

  // Auto-request Fullscreen on Exam Load
  useEffect(() => {
    const autoFullscreen = setTimeout(() => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => console.warn("Auto-fullscreen blocked:", err));
      }
    }, 500);
    return () => clearTimeout(autoFullscreen);
  }, []);

  // Start Backend Session Logging
  useEffect(() => {
    if (!exam || sessionInitializedRef.current || !token) return;
    sessionInitializedRef.current = true;

    startExamSession(examId, token)
      .then((data) => {
        setExamSessionId(data.session_id);
        return logBrowserEvent({
          sessionId: data.session_id,
          eventType: 'exam_page_opened',
          additionalDetails: `Candidate opened live exam page for ${exam.name}`,
          token
        });
      })
      .catch((err) => {
        console.warn("Unable to start backend exam session:", err);
      });
  }, [exam, examId, token]);

  // Capture Fresh Candidate Baseline Photo (If candidate photo is missing)
  const handleRegisterFaceSnapshot = async () => {
    try {
      const video = document.querySelector("video");
      if (!video || !video.videoWidth) {
        setIdentityVerificationError("Camera feed not ready. Please allow camera access.");
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

      const response = await requestProfileUpdate({
        name: user?.name || '',
        email: user?.email || '',
        photoPath: dataUrl,
        token,
      });
      const savedPhoto = response.candidate.photo_path || dataUrl;
      updateProfile({ avatar: savedPhoto });
      setIdentityVerificationError("Registered face snapshot saved. Click 'Scan & Verify My Identity' below.");
    } catch (err) {
      setIdentityVerificationError(err.message || "Unable to save camera photo. Please try again.");
    }
  };

  // Strictly Enforced Pre-Exam Face Identity Verification Scan
  const handleVerifyCandidateFace = async () => {
    setIsVerifyingFace(true);
    setIdentityVerificationError("");

    try {
      const video = document.querySelector("video");
      if (!video || !video.videoWidth) {
        setIdentityVerificationError("Camera feed not ready. Please allow camera access and align your face.");
        setIsVerifyingFace(false);
        return;
      }

      const regPhoto = user?.avatar || null;
      if (!regPhoto) {
        setIdentityVerificationError("No registered candidate profile photo found. Please save a profile photo in My Profile before starting the exam.");
        setIsVerifyingFace(false);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);

      const savedProfile = await requestProfileUpdate({
        name: user?.name || '',
        email: user?.email || '',
        photoPath: regPhoto,
        token,
      });
      const savedPhoto = savedProfile.candidate.photo_path || regPhoto;
      updateProfile({ avatar: savedPhoto });
      const res = await verifyCandidateIdentity({ base64Image: dataUrl, registeredPhoto: savedPhoto, token });

      if (res && res.verified) {
        console.info('[FaceVerification] result', res);
        setIdentityMatchConfidence(res.match_confidence || 94.0);
        setIsIdentityVerified(true);
        setIdentityVerificationError("");
      } else {
        console.warn('[FaceVerification] failed', res);
        const conf = res?.match_confidence !== undefined ? `${res.match_confidence}%` : "Low";
        const reasonStr = res?.reason || "Biometric facial features do not match candidate photo!";
        setIsIdentityVerified(false);
        setIdentityVerificationError(`FACE VERIFICATION FAILED (Match Confidence: ${conf}). ${reasonStr}`);
      }
    } catch (err) {
      console.warn("Pre-exam face verification error:", err);
      setIsIdentityVerified(false);
      setIdentityVerificationError(`Verification Check Failed: ${err.message || 'Face matching failed'}. Align face in camera and retry.`);
    } finally {
      setIsVerifyingFace(false);
    }
  };


  // Fullscreen Toggle Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => console.warn("Fullscreen request error:", err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => console.warn("Exit fullscreen error:", err));
    }
  };

  // Fullscreen & Window Tab Monitors
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);

      if (!active) {
        setFullscreenExitCount((prev) => prev + 1);
        setWarningCount((prev) => prev + 1);
        setWarningMessage("SECURITY ALERT: You exited Full-Screen Exam Mode! Violation logged.");

        if (examSessionId && token) {
          logBrowserEvent({
            sessionId: examSessionId,
            eventType: 'focus_lost',
            additionalDetails: 'Candidate exited compulsory full-screen mode.',
            token
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        setBrowserStatus("Unfocused");
        if (now - lastTabSwitchTimeRef.current > 2500) {
          lastTabSwitchTimeRef.current = now;
          setTabSwitchCount((prev) => {
            const next = prev + 1;
            setWarningCount((warningTotal) => warningTotal + 1);
            setWarningMessage(`Tab Switch Warning #${next}: You switched tabs or minimized the window!`);
            return next;
          });

          if (examSessionId && token) {
            logBrowserEvent({
              sessionId: examSessionId,
              eventType: 'tab_switch',
              additionalDetails: 'Candidate switched away from active exam tab.',
              token
            });
          }
        }
      } else {
        setBrowserStatus("Focused");
        if (examSessionId && token) {
          logBrowserEvent({
            sessionId: examSessionId,
            eventType: 'focus_regained',
            additionalDetails: 'User returned focus to active exam tab.',
            token
          });
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [examSessionId, token]);

  // Handle AI Proctor Status Updates
  const handleStatusChange = useCallback((updater) => {
    const nextState = typeof updater === "function" ? updater({ cameraStatus, faceStatus }) : updater;
    if (nextState.cameraStatus !== undefined) setCameraStatus(nextState.cameraStatus);

    if (nextState.faceStatus !== undefined) {
      setFaceStatus(nextState.faceStatus);
      if (nextState.faceStatus !== prevFaceStatusRef.current) {
        const oldStatus = prevFaceStatusRef.current;
        prevFaceStatusRef.current = nextState.faceStatus;

        if (isIdentityVerified) {
          if (nextState.faceStatus === "Absent" && oldStatus !== "Absent") {
            setFaceWarningCount((prev) => prev + 1);
            setWarningCount((prev) => prev + 1);
          } else if (nextState.faceStatus === "Multiple Faces" && oldStatus !== "Multiple Faces") {
            setMultipleFacesCount((prev) => prev + 1);
            setWarningCount((prev) => prev + 1);
          }
        }
      }
    }

    if (nextState.isPhoneDetected !== undefined) {
      if (nextState.isPhoneDetected && !prevPhoneDetectedRef.current) {
        prevPhoneDetectedRef.current = true;
        if (isIdentityVerified) {
          setPhoneDetectedCount((prev) => prev + 1);
          setWarningCount((prev) => prev + 1);
        }
      } else if (!nextState.isPhoneDetected && prevPhoneDetectedRef.current) {
        prevPhoneDetectedRef.current = false;
      }
    }
  }, [cameraStatus, faceStatus, isIdentityVerified]);

  // Handle Warnings from Camera AI
  const handleProctorWarning = useCallback((warningType, message) => {
    const wasIdentityVerified = isIdentityVerified;

    if (warningType === "Identity Mismatch") {
      if (wasIdentityVerified) setWarningCount((prev) => prev + 1);
    }

    if (!isIdentityVerified) return; // Ignore other warnings during baseline setup/verification!

    setWarningMessage(`${warningType}: ${message}`);

    addSessionEvent({
      event: warningType,
      status: 'Warning',
      sessionId: session?.id ?? `EXAM-${examId}`,
      details: message,
      score: null
    });
  }, [addSessionEvent, examId, session, isIdentityVerified]);

  useEffect(() => {
    if (warningCount > 4 && examSessionId && !warningAutoSubmitRef.current) {
      warningAutoSubmitRef.current = true;
      autoSubmitReasonRef.current = true;
      setAutoSubmitNotice("This test is being submitted automatically because the warning limit was exceeded.");
      window.setTimeout(() => submitExam(), 1500);
    }
  }, [warningCount, examSessionId]);

  if (!exam) {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Exam Not Found</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">The requested exam is unavailable.</p>
        </div>
      </div>
    );
  }

  if (exam.backend && !backendQuestions) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <p className="mt-3 text-sm font-semibold">Loading your assigned exam...</p>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  const selectAnswer = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
  };

  const submitExam = async () => {
    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;

    if (examSessionId && token) {
      const backendAnswers = Object.entries(answers).map(([questionId, answerIndex]) => ({
        question_id: Number(questionId),
        selected_option: String.fromCharCode(65 + answerIndex)
      }));

      try {
        await submitExamSession({ sessionId: examSessionId, answers: backendAnswers, token });
      } catch (error) {
        console.error('Unable to persist exam submission:', error);
        submissionStartedRef.current = false;
        return;
      }
    }

    const result = {
      totalQuestions: questions.length,
      answeredQuestions: Object.keys(answers).length,
      correctAnswers: 0,
      score: Math.round((answeredCount / questions.length) * 100),
      tabSwitchCount,
      focusLossCount: fullscreenExitCount + tabSwitchCount,
      faceAbsentDuration: faceWarningCount * 3, // Estimate 3s per face absent event
      multipleFacesCount,
      prohibitedItemsCount: phoneDetectedCount,
      candidateName: user?.name || 'Alex Carter',
      candidateId: user?.id || 'EG-88294'
    };

    completeExam(examId, result);

    if (examSessionId && token) {
      await logBrowserEvent({
        sessionId: examSessionId,
        eventType: 'exam_submitted',
        additionalDetails: autoSubmitReasonRef.current
          ? `Exam automatically submitted because the warning limit was exceeded. ${answeredCount} answered questions.`
          : `Exam submitted with ${answeredCount} answered questions.`,
        token
      });
    }

    addSessionEvent({
      event: 'Exam Submitted',
      status: 'Info',
      sessionId: session?.id ?? `EXAM-${examId}`,
      details: 'Exam was submitted from the live proctored exam view.',
      score: result.score,
      recordActivity: false
    });

    if (token) {
      await Promise.all([
        loadBackendExams(token),
        loadBackendSessions(token)
      ]);
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col overflow-hidden">
      {autoSubmitNotice && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/80 p-6 text-center">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-on-surface">Test Submitted Automatically</h2>
            <p className="mt-3 text-sm text-on-surface-variant">{autoSubmitNotice}</p>
          </div>
        </div>
      )}
      {/* Compulsory Pre-Exam Identity Verification Modal Gate */}
      {!isIdentityVerified && (
        <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-black/95 text-white p-6 text-center backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-3xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface p-8 shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-4xl">verified_user</span>
            </div>

            <h2 className="text-2xl font-bold mb-2">Compulsory Face Identity Verification</h2>
            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Candidate <span className="font-bold text-primary">{user?.name || 'Registered Candidate'}</span> must sit in front of the camera. The AI will strictly verify your facial biometric signature against your registration photo before unlocking the exam.
            </p>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-outline-variant mb-4">
              <WebcamPreview
                sessionId={examSessionId}
                token={token}
                onStatusChange={handleStatusChange}
                onWarning={handleProctorWarning}
              />
            </div>

            {identityVerificationError ? (
              <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-xs leading-relaxed">
                {identityVerificationError}
              </div>
            ) : (
              <div className="mb-4 p-2.5 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
                <span>Camera Live: Click 'Scan & Verify My Identity' to run facial scan</span>
              </div>
            )}

            {!user?.avatar && (
              <button
                type="button"
                onClick={handleRegisterFaceSnapshot}
                className="w-full mb-3 py-2.5 px-4 rounded-xl bg-amber-500/20 text-amber-600 border border-amber-500/30 font-bold text-xs hover:bg-amber-500/30 transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">photo_camera</span>
                Register Candidate Face Snapshot (1-Click)
              </button>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleVerifyCandidateFace}
                disabled={isVerifyingFace}
                className="flex-1 py-3.5 px-4 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-lg hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">fact_check</span>
                {isVerifyingFace ? "Scanning Facial Signature..." : "Scan & Verify My Identity"}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="py-3.5 px-4 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-sm hover:bg-surface-container-high transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compulsory Full-Screen Lock Overlay */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center backdrop-blur-md">
          <div className="w-20 h-20 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mb-6 border border-red-500/30 shadow-2xl">
            <span className="material-symbols-outlined text-5xl">fullscreen_exit</span>
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Compulsory Full-Screen Mode Required</h2>
          <p className="text-gray-300 max-w-md mb-8 text-sm leading-relaxed">
            This proctored exam requires mandatory full-screen mode. You cannot view or answer questions until you enter full-screen mode.
          </p>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="bg-primary text-on-primary px-8 py-4 rounded-2xl font-bold text-base shadow-xl hover:brightness-110 transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined">fullscreen</span>
            Enter Full-Screen Mode Now
          </button>
        </div>
      )}

      {/* Header */}
      <header className="w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 border-b border-outline-variant bg-surface shadow-sm">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-2xl">security</span>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary">ExamGuard</h1>
            <p className="hidden md:block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Live AI Proctored Examination
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-bold hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined text-base">{isFullscreen ? "fullscreen_exit" : "fullscreen"}</span>
            <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>

          <div className="flex flex-col items-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant">SESSION ID</span>
            <span className="font-headline-md text-headline-md text-primary font-bold">
              {examSessionId ? `#${examSessionId}` : `EXAM-${examId}`}
            </span>
          </div>
          <div className="h-8 w-px bg-outline-variant" />
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-label-sm text-on-surface-variant">PROGRESS</span>
            <span className="font-headline-md text-headline-md text-on-surface">
              {currentIndex + 1} of {questions.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="font-label-md text-label-md text-on-surface font-bold">{user?.name}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">ID: {user?.id}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed font-bold text-on-primary-fixed">
            {user?.name?.split(' ').map((part) => part[0]).join('')}
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Question Navigator */}
        <aside className="hidden md:flex w-[320px] flex-col border-r border-outline-variant bg-surface-container-low p-6">
          <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
            Question Navigator
          </h3>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {questions.map((item, index) => {
              const status = answers[item.id] !== undefined ? 'answered' : flagged.has(item.id) ? 'flagged' : index === currentIndex ? 'current' : 'unanswered';
              const classes = status === 'answered' ? 'bg-success/10 text-success border-success' : status === 'flagged' ? 'bg-danger/10 text-danger border-danger' : status === 'current' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-highest text-on-surface-variant border-transparent';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border font-label-md text-label-md ${classes}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-8 space-y-3">
            <h3 className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Legend</h3>
            <div className="flex items-center gap-2 text-label-sm"><span className="h-3 w-3 rounded-sm bg-primary" /> <span>Current</span></div>
            <div className="flex items-center gap-2 text-label-sm"><span className="h-3 w-3 rounded-sm border border-success bg-success/10" /> <span>Answered</span></div>
            <div className="flex items-center gap-2 text-label-sm"><span className="h-3 w-3 rounded-sm border border-danger bg-danger/10" /> <span>Flagged</span></div>
          </div>

          <div className="mt-auto rounded-2xl border border-outline-variant bg-surface-container p-4">
            <button
              type="button"
              onClick={() => setShowSubmit(true)}
              className="w-full rounded-xl bg-primary px-4 py-3 font-label-md text-label-md font-bold text-on-primary"
            >
              Submit Exam
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1 overflow-y-auto bg-surface-bright p-6 md:p-10">
          <div className="mx-auto flex max-w-7xl gap-6">
            <div className="flex-1">
              <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm md:p-10">
                <div className="mb-6 flex items-start justify-between">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-label-sm text-label-sm text-primary uppercase tracking-wide">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFlagged((prev) => new Set(prev).add(question.id))}
                    className="flex items-center gap-2 rounded-full px-3 py-1 text-danger transition-colors hover:bg-danger/10"
                  >
                    <span className="material-symbols-outlined text-sm">flag</span>
                    <span className="font-label-sm text-label-sm">Flag for review</span>
                  </button>
                </div>

                <h2 className="mb-8 font-headline-md text-headline-md text-on-surface leading-snug">{question.text}</h2>

                <div className="space-y-4">
                  {question.options.map((option, index) => {
                    const isSelected = answers[question.id] === index;
                    return (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center rounded-2xl border p-5 transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={isSelected}
                          onChange={() => selectAnswer(index)}
                          className="h-5 w-5 border-outline text-primary focus:ring-primary"
                        />
                        <span className={`ml-4 font-body-md text-body-md ${isSelected ? 'font-medium text-on-surface' : 'text-on-surface-variant'}`}>
                          {option}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 md:flex-row md:justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-highest px-8 py-3 font-label-md text-label-md text-on-surface transition-colors hover:bg-outline-variant"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-10 py-3 font-label-md text-label-md font-bold text-on-primary shadow-lg transition-all hover:brightness-110"
                >
                  Next
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-body-md text-on-surface-variant flex justify-between items-center">
                <span>Answered {answeredCount} of {questions.length} questions</span>
                <span className="text-xs font-bold text-primary">Fullscreen Exits: {fullscreenExitCount}</span>
              </div>
            </div>

            {/* AI Proctor Drawer */}
            <div className="w-80 sticky top-4 self-start">
              <WebcamPreview
                sessionId={examSessionId}
                token={token}
                registeredPhoto={user?.avatar}
                onStatusChange={handleStatusChange}
                onWarning={handleProctorWarning}
              />

              <MonitoringPanel
                cameraStatus={cameraStatus}
                faceStatus={faceStatus}
                browserStatus={browserStatus}
                warningCount={warningCount}
                faceWarningCount={faceWarningCount}
                multipleFacesCount={multipleFacesCount}
                tabSwitchCount={tabSwitchCount}
                phoneDetectedCount={phoneDetectedCount}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Warning Popup */}
      <WarningPopup
        message={warningMessage}
        onClose={() => setWarningMessage("")}
      />

      {/* Submit Modal */}
      {showSubmit ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-inverse-surface/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-surface-container-lowest p-8 shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <span className="material-symbols-outlined text-3xl text-primary">assignment_turned_in</span>
            </div>
            <h3 className="mb-2 text-center font-headline-md text-headline-md text-on-surface">Ready to Submit?</h3>
            <p className="mb-8 text-center font-body-md text-body-md text-on-surface-variant">
              You have answered {answeredCount} of {questions.length} questions. Once submitted, you cannot change your answers.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={submitExam}
                className="w-full rounded-2xl bg-primary px-4 py-4 font-label-md text-label-md font-bold text-on-primary"
              >
                Yes, Submit Exam
              </button>
              <button
                type="button"
                onClick={() => setShowSubmit(false)}
                className="w-full rounded-2xl border border-outline-variant bg-surface px-4 py-4 font-label-md text-label-md font-bold text-on-surface-variant"
              >
                Back to Questions
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LiveExam;
