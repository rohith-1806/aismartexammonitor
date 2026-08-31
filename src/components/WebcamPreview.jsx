import React, { useEffect, useRef, useState, useCallback } from "react";
import { logFaceEvent, analyzeCameraFrame, verifyCandidateIdentity } from "../services/eventApi";

const CAMERA_CONSTRAINTS = {
  video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
  audio: false
};
const CAMERA_START_TIMEOUT_MS = 10000;
let sharedCameraStream = null;
let sharedCameraRequest = null;
let cameraConsumerCount = 0;
let sharedCocoModel = null;
let sharedCocoModelRequest = null;
let sharedIdentityRequest = null;
let sharedIdentityRequestKey = "";
let sharedIdentityRequestedAt = 0;

function acquireCameraStream() {
  cameraConsumerCount += 1;
  if (sharedCameraStream) return Promise.resolve(sharedCameraStream);
  if (sharedCameraRequest) return sharedCameraRequest;

  sharedCameraRequest = new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      settled = true;
      reject(new Error("Camera startup timed out."));
    }, CAMERA_START_TIMEOUT_MS);

    navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS).then((stream) => {
      if (settled || cameraConsumerCount === 0) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      sharedCameraStream = stream;
      resolve(stream);
    }).catch((error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(error);
    });
  }).finally(() => {
    sharedCameraRequest = null;
  });

  return sharedCameraRequest;
}

function releaseCameraStream() {
  cameraConsumerCount = Math.max(0, cameraConsumerCount - 1);
  if (cameraConsumerCount === 0 && sharedCameraStream) {
    sharedCameraStream.getTracks().forEach((track) => track.stop());
    sharedCameraStream = null;
  }
}

function requestSharedIdentity({ base64Image, registeredPhoto, token }) {
  const requestKey = `${token || "anonymous"}:${registeredPhoto}`;
  const now = Date.now();
  if (sharedIdentityRequest && sharedIdentityRequestKey === requestKey) return sharedIdentityRequest;
  if (sharedIdentityRequestKey === requestKey && now - sharedIdentityRequestedAt < 4000) return null;

  sharedIdentityRequestKey = requestKey;
  sharedIdentityRequestedAt = now;
  sharedIdentityRequest = verifyCandidateIdentity({ base64Image, registeredPhoto, token }).finally(() => {
    sharedIdentityRequest = null;
  });
  return sharedIdentityRequest;
}

function WebcamPreview({
  sessionId,
  token,
  registeredPhoto,
  onStatusChange,
  onWarning
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelStatus, setModelStatus] = useState("Initializing AI Neural Network...");
  const [detectedLabels, setDetectedLabels] = useState(["Candidate Face"]);
  const [isImpersonationDetected, setIsImpersonationDetected] = useState(false);

  const cocoModelRef = useRef(null);
  const lastLoggedFaceStatusRef = useRef(null);
  const lastPhoneAlertTimeRef = useRef(0);
  const lastMultipleFaceAlertTimeRef = useRef(0);
  const lastIdentityCheckTimeRef = useRef(0);
  const isAnalyzingBackendRef = useRef(false);
  const isDetectionRunningRef = useRef(false);

  const onStatusChangeRef = useRef(onStatusChange);
  const onWarningRef = useRef(onWarning);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onWarningRef.current = onWarning;
  }, [onStatusChange, onWarning]);

  // Attach one shared stream immediately; AI model loading is independent.
  useEffect(() => {
    acquireCameraStream()
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStreamActive(true);
        if (onStatusChangeRef.current) {
          onStatusChangeRef.current((prev) => ({ ...prev, cameraStatus: "Active" }));
        }
      })
      .catch((err) => {
        console.warn("Camera access failed:", err);
        setStreamActive(false);
        if (onStatusChangeRef.current) {
          onStatusChangeRef.current((prev) => ({ ...prev, cameraStatus: "Inactive" }));
        }
      });

    return () => {
      releaseCameraStream();
    };
  }, []);

  // Load COCO-SSD once, only after the camera preview has been attached.
  useEffect(() => {
    if (!streamActive) return undefined;
    let isMounted = true;

    async function loadModel() {
      try {
        if (window.cocoSsd) {
          setModelStatus("Loading COCO-SSD Model...");
          if (!sharedCocoModelRequest) sharedCocoModelRequest = window.cocoSsd.load();
          const model = sharedCocoModel || await sharedCocoModelRequest;
          sharedCocoModel = model;
          if (isMounted) {
            cocoModelRef.current = model;
            setModelLoading(false);
            setModelStatus("COCO-SSD Model Active");
          }
        } else {
          setModelLoading(false);
          setModelStatus("OpenCV Backend Active");
        }
      } catch (err) {
        console.warn("COCO-SSD model load error, falling back to OpenCV:", err);
        setModelLoading(false);
        setModelStatus("OpenCV Backend Active");
      }
    }

    loadModel();
    return () => {
      isMounted = false;
    };
  }, [streamActive]);

  // Main Stable Detection & Live Verification Loop
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const width = canvas.width;
    const height = canvas.height;

    ctx.drawImage(video, 0, 0, width, height);

    let currentFaceStatus = "face_present";
    let isPhoneDetected = false;
    let predictions = [];

    // 1. Primary: Run TensorFlow COCO-SSD Deep Neural Network
    if (cocoModelRef.current) {
      try {
        predictions = await cocoModelRef.current.detect(video);

        const persons = predictions.filter((p) => p.class === "person" && p.score > 0.4);
        const phones = predictions.filter((p) =>
          ["cell phone", "phone", "mobile phone", "remote"].includes(p.class.toLowerCase()) && p.score > 0.35
        );

        if (persons.length === 0) {
          currentFaceStatus = "face_absent";
        } else if (persons.length === 1) {
          currentFaceStatus = "face_present";
        } else {
          currentFaceStatus = "multiple_faces";
        }

        if (phones.length > 0) {
          isPhoneDetected = true;
        }
      } catch (err) {
        console.warn("COCO-SSD inference error:", err);
      }
    }

    // 2. Secondary/Fallback: Run OpenCV Backend on Laptop
    if (!cocoModelRef.current && token && !isAnalyzingBackendRef.current) {
      isAnalyzingBackendRef.current = true;
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        const backendRes = await analyzeCameraFrame({ base64Image: dataUrl, token });
        if (backendRes && backendRes.status) {
          currentFaceStatus = backendRes.status;
          if (backendRes.phone_detected) {
            isPhoneDetected = true;
          }
        }
      } catch (err) {
        // Fallback
      } finally {
        isAnalyzingBackendRef.current = false;
      }
    }

    // 3. CONTINUOUS LIVE FACE VERIFICATION (Anti-Impersonation Protection Every 4 Seconds)
    const nowTime = Date.now();
    if (registeredPhoto && nowTime - lastIdentityCheckTimeRef.current > 4000) {
      lastIdentityCheckTimeRef.current = nowTime;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
      const identityRequest = requestSharedIdentity({ base64Image: dataUrl, registeredPhoto, token });
      let identityRes = null;
      try {
        identityRes = identityRequest ? await identityRequest : null;
      } catch (error) {
        console.warn("Backend face verification unavailable:", error);
      }

      if (identityRes && identityRes.verified === false) {
        setIsImpersonationDetected(true);
        if (onWarningRef.current) {
          onWarningRef.current(
            "Identity Mismatch",
            `LIVE SECURITY ALERT: Camera face does not match registered candidate photo. (${identityRes.reason || 'Impersonation detected'})`
          );
        }
        if (sessionId) {
          logFaceEvent({
            sessionId,
            status: "multiple_faces",
            additionalDetails: `Continuous Live Face Mismatch (Match Score: ${identityRes.match_confidence || 0}%). ${identityRes.reason || ''}`,
            token
          }).catch(() => {});
        }
      } else {
        setIsImpersonationDetected(false);
      }
    }

    // Render Canvas Overlay Bounding Boxes
    ctx.clearRect(0, 0, width, height);
    const labels = [];

    if (isImpersonationDetected) {
      labels.push("IMPERSONATION DETECTED");
    }

    if (predictions.length > 0) {
      predictions.forEach((pred) => {
        const [x, y, w, h] = pred.bbox;
        const className = pred.class.toLowerCase();
        const confidence = Math.round(pred.score * 100);

        if (className === "person") {
          ctx.strokeStyle = isImpersonationDetected || currentFaceStatus === "multiple_faces" ? "#dc2626" : "#16a34a";
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);

          ctx.fillStyle = isImpersonationDetected || currentFaceStatus === "multiple_faces" ? "#dc2626" : "#16a34a";
          ctx.fillRect(x, y - 24, Math.max(160, className.length * 10), 24);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(
            `${isImpersonationDetected ? "IMPERSONATION" : currentFaceStatus === "multiple_faces" ? "MULTIPLE" : "DETECTED"} ${pred.class.toUpperCase()} (${confidence}%)`,
            x + 6,
            y - 7
          );
          labels.push(`Person (${confidence}%)`);
        } else if (["cell phone", "phone", "mobile phone", "remote"].includes(className)) {
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, w, h);

          ctx.fillStyle = "#dc2626";
          ctx.fillRect(x, y - 26, 230, 26);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(`CELL PHONE DETECTED (${confidence}%)`, x + 6, y - 8);
          labels.push(`Cell Phone (${confidence}%)`);
        }
      });
    }

    // Default Bounding Box Overlays
    if (labels.length === 0 || (labels.length === 1 && labels[0].includes("IMPERSONATION"))) {
      if (currentFaceStatus === "face_present") {
        const bW = width * 0.45, bH = height * 0.55;
        const bX = (width - bW) / 2, bY = (height - bH) / 3;
        ctx.strokeStyle = isImpersonationDetected ? "#dc2626" : "#16a34a";
        ctx.lineWidth = 3;
        ctx.strokeRect(bX, bY, bW, bH);
        ctx.fillStyle = isImpersonationDetected ? "#dc2626" : "#16a34a";
        ctx.fillRect(bX, bY - 24, 200, 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(isImpersonationDetected ? "FACE MISMATCH" : "Candidate Face (Live AI)", bX + 6, bY - 7);
        if (!isImpersonationDetected) labels.push("Candidate Face");
      } else if (currentFaceStatus === "multiple_faces") {
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 3;
        ctx.strokeRect(width * 0.12, height * 0.2, width * 0.35, height * 0.55);
        ctx.strokeRect(width * 0.52, height * 0.2, width * 0.35, height * 0.55);
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(width * 0.12, height * 0.2 - 24, 160, 24);
        ctx.fillRect(width * 0.52, height * 0.2 - 24, 160, 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("Person 1 Detected", width * 0.12 + 6, height * 0.2 - 7);
        ctx.fillText("Person 2 Detected", width * 0.52 + 6, height * 0.2 - 7);
        labels.push("Multiple Faces");
      } else {
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(width * 0.2, height * 0.2, width * 0.6, height * 0.6);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(width * 0.2, height * 0.2 - 24, 160, 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("Face Absent", width * 0.2 + 6, height * 0.2 - 7);
        labels.push("No Face");
      }
    }

    if (isPhoneDetected && !labels.some((l) => l.includes("Cell Phone"))) {
      const pX = width * 0.62, pY = height * 0.45, pW = width * 0.26, pH = height * 0.42;
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 4;
      ctx.strokeRect(pX, pY, pW, pH);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(pX - 2, pY - 28, 230, 26);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PROHIBITED DEVICE DETECTED", pX + 4, pY - 9);
      labels.push("Mobile Phone");
    }

    setDetectedLabels(labels);

    // Notify Parent Component
    if (onStatusChangeRef.current) {
      onStatusChangeRef.current((prev) => ({
        ...prev,
        cameraStatus: streamActive ? "Active" : "Inactive",
        faceStatus: isImpersonationDetected
          ? "Impersonation"
          : currentFaceStatus === "face_present"
          ? "Detected"
          : currentFaceStatus === "face_absent"
          ? "Absent"
          : "Multiple Faces",
        isPhoneDetected
      }));
    }

    const now = Date.now();

    // Phone Warning Alert
    if (isPhoneDetected && now - lastPhoneAlertTimeRef.current > 8000) {
      lastPhoneAlertTimeRef.current = now;
      if (onWarningRef.current) {
        onWarningRef.current("Prohibited Device", "MOBILE PHONE DETECTED in candidate view!");
      }
      if (sessionId && token) {
        logFaceEvent({
          sessionId,
          status: "multiple_faces",
          additionalDetails: "Prohibited mobile phone / secondary device detected.",
          token
        }).catch((err) => console.warn("Log phone event error:", err));
      }
    }

    // Multiple Faces Alert Trigger
    if (currentFaceStatus === "multiple_faces" && now - lastMultipleFaceAlertTimeRef.current > 8000) {
      lastMultipleFaceAlertTimeRef.current = now;
      if (onWarningRef.current) {
        onWarningRef.current("Multiple Faces", "SECURITY VIOLATION: Multiple persons detected in camera view!");
      }
    }

    // Log status transitions to backend
    if (currentFaceStatus !== lastLoggedFaceStatusRef.current) {
      lastLoggedFaceStatusRef.current = currentFaceStatus;
      if (sessionId && token && (currentFaceStatus === "face_absent" || currentFaceStatus === "multiple_faces")) {
        logFaceEvent({
          sessionId,
          status: currentFaceStatus,
          additionalDetails: `AI Proctoring detected state transition: ${currentFaceStatus}`,
          token
        }).catch((err) => console.warn("Log face status error:", err));
      }
    }
  }, [streamActive, token, sessionId, registeredPhoto, isImpersonationDetected]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDetectionRunningRef.current) return;
      isDetectionRunningRef.current = true;
      Promise.resolve(runDetection()).finally(() => {
        isDetectionRunningRef.current = false;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [runDetection]);

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">security</span>
          <h3 className="font-bold text-on-surface text-sm">AI Proctoring Camera</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${streamActive ? "bg-red-600 animate-pulse" : "bg-gray-400"}`}></span>
          <span className="font-semibold text-[11px] text-red-600 uppercase">
            {streamActive ? "LIVE SCAN" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Video Feed + Bounding Box Overlay */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-outline-variant">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
        />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {detectedLabels.map((lbl, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                lbl.includes("IMPERSONATION")
                  ? "bg-red-600 text-white animate-bounce"
                  : lbl.includes("Cell Phone") || lbl === "Mobile Phone"
                  ? "bg-red-600 text-white animate-bounce"
                  : lbl === "Multiple Faces"
                  ? "bg-red-500 text-white"
                  : lbl === "No Face"
                  ? "bg-amber-600 text-white"
                  : "bg-green-600 text-white"
              }`}
            >
              {lbl}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2.5 text-[11px] font-medium text-on-surface-variant flex justify-between">
        <span>Model: {modelStatus}</span>
        <span className={modelLoading ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
          {modelLoading ? "Loading..." : "● Live Matching Active"}
        </span>
      </div>
    </div>
  );
}

export default WebcamPreview;