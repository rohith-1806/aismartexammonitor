from __future__ import annotations

from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Any

from backend import db
from backend.models.exam_models import ExamSession, FaceLog
from backend.services.warning_service import WarningService


logger = logging.getLogger(__name__)


def normalize_profile_photo(photo_source: str | None) -> str | None:
    """Validate browser image data and store it in a canonical JPEG data URL."""
    if not photo_source:
        return None
    if not isinstance(photo_source, str):
        raise ValueError("Profile photo must be an image data URL.")

    source = photo_source.strip()
    if not source.lower().startswith("data:"):
        return source

    try:
        import base64
        import cv2
        import numpy as np

        header, encoded = source.split(",", 1)
        if not header.lower().startswith("data:image/") or ";base64" not in header.lower():
            raise ValueError
        image_bytes = base64.b64decode(encoded, validate=True)
        image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None or image.size == 0:
            raise ValueError
        encoded_image, normalized_bytes = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if not encoded_image:
            raise ValueError
        normalized = base64.b64encode(normalized_bytes.tobytes()).decode("ascii")
        return f"data:image/jpeg;base64,{normalized}"
    except Exception:
        raise ValueError("Profile photo must be a valid, decodable image.") from None


class FaceService:
    YUNET_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "face_detection_yunet_2023mar.onnx"
    SFACE_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "face_recognition_sface_2021dec.onnx"
    SFACE_COSINE_THRESHOLD = 0.363

    @staticmethod
    def _normalize_datetime(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def __init__(self):
        self.db = db
        self.warning_service = WarningService()

    def _normalize_status(self, status: str) -> str:
        normalized = (status or "").strip().lower()
        if normalized not in {"face_present", "face_absent", "multiple_faces"}:
            raise ValueError("Invalid face status.")
        return normalized

    def save_face_event(self, session_id: int, candidate_id: int, status: str, additional_details: str | None = None) -> dict[str, Any]:
        session = self.db.session.get(ExamSession, session_id)
        if not session:
            raise ValueError("Invalid session ID.")
        if session.candidate_id != candidate_id:
            raise PermissionError("Session does not belong to the authenticated candidate.")

        normalized_status = self._normalize_status(status)
        timestamp = datetime.now(timezone.utc)
        absence_duration_seconds = None

        if normalized_status == "face_present":
            last_absence = (
                self.db.session.query(FaceLog)
                .filter(FaceLog.session_id == session_id, FaceLog.status == "face_absent")
                .order_by(FaceLog.timestamp.desc())
                .first()
            )
            if last_absence:
                last_absence_timestamp = self._normalize_datetime(last_absence.timestamp)
                if last_absence_timestamp is not None:
                    absence_duration_seconds = max(0, int((timestamp - last_absence_timestamp).total_seconds()))

        face_log = FaceLog(
            session_id=session_id,
            candidate_id=candidate_id,
            status=normalized_status,
            additional_details=additional_details,
            absence_duration_seconds=absence_duration_seconds,
            timestamp=timestamp,
            face_present=normalized_status == "face_present",
            multiple_faces=normalized_status == "multiple_faces",
        )
        self.db.session.add(face_log)
        self.db.session.commit()
        self.warning_service.evaluate_face_event(session_id, candidate_id, normalized_status, additional_details)

        return {
            "id": face_log.id,
            "session_id": face_log.session_id,
            "candidate_id": face_log.candidate_id,
            "status": face_log.status,
            "timestamp": face_log.timestamp.isoformat(),
            "additional_details": face_log.additional_details,
            "absence_duration_seconds": face_log.absence_duration_seconds,
        }

    def get_face_history(self, session_id: int, candidate_id: int) -> list[dict[str, Any]]:
        session = self.db.session.get(ExamSession, session_id)
        if not session or session.candidate_id != candidate_id:
            raise PermissionError("Session does not belong to the authenticated candidate.")

        return [
            {
                "id": event.id,
                "session_id": event.session_id,
                "candidate_id": event.candidate_id,
                "status": event.status,
                "timestamp": event.timestamp.isoformat(),
                "additional_details": event.additional_details,
                "absence_duration_seconds": event.absence_duration_seconds,
            }
            for event in self.db.session.query(FaceLog)
            .filter_by(session_id=session_id)
            .order_by(FaceLog.timestamp.asc())
            .all()
        ]

    def analyze_frame_bytes(self, image_bytes: bytes) -> dict[str, Any]:
        try:
            import cv2
            import numpy as np

            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                return {"face_count": 0, "status": "face_absent", "boxes": [], "phone_detected": False}

            faces = self._detect_faces(frame, cv2, np)
            boxes = [{"x": int(face[0]), "y": int(face[1]), "w": int(face[2]), "h": int(face[3])} for face in faces]

            face_count = len(boxes)
            if face_count == 0:
                status = "face_absent"
            elif face_count == 1:
                status = "face_present"
            else:
                status = "multiple_faces"

            return {
                "face_count": face_count,
                "status": status,
                "boxes": boxes,
                "phone_detected": False,
                "engine": "OpenCV YuNet face detector",
                "diagnostics": {
                    "image_dimensions": [int(frame.shape[1]), int(frame.shape[0])],
                    "detected_face_count": face_count,
                },
            }
        except Exception as exc:
            return {"face_count": 0, "status": "face_absent", "boxes": [], "phone_detected": False, "error": str(exc)}

    @classmethod
    def _detect_faces(cls, image, cv2, np):
        if not cls.YUNET_MODEL_PATH.exists():
            raise FileNotFoundError(f"YuNet model is missing: {cls.YUNET_MODEL_PATH}")

        detector = cv2.FaceDetectorYN.create(
            str(cls.YUNET_MODEL_PATH), "", (image.shape[1], image.shape[0]), 0.9, 0.3, 5000
        )
        _, detected = detector.detect(image)
        if detected is None:
            return []
        return [face.astype(np.float32) for face in detected]

    def verify_candidate_face_identity(self, live_image_bytes: bytes, registered_photo: str | None) -> dict[str, Any]:
        if not registered_photo or not isinstance(registered_photo, str):
            return {
                "verified": False,
                "match_confidence": 0.0,
                "reason": "No registered candidate profile photo on file. Please upload a photo or capture a webcam snapshot at registration."
            }

        try:
            import cv2
            import numpy as np
            import base64
            import urllib.request

            live_frame = self._decode_image(live_image_bytes, cv2, np)
            if live_frame is None:
                return {"verified": False, "match_confidence": 0.0, "reason": "Invalid live camera frame"}

            reg_frame = self._load_registered_image(
                registered_photo, cv2, np, base64, urllib.request
            )

            if reg_frame is None:
                return {
                    "verified": False,
                    "match_confidence": 0.0,
                    "reason": "Unable to decode registered candidate profile photo for verification."
                }

            faces_live = self._detect_faces(live_frame, cv2, np)
            faces_reg = self._detect_faces(reg_frame, cv2, np)
            diagnostics = {
                "registered_image_source": self._describe_photo_source(registered_photo),
                "registered_image_dimensions": [int(reg_frame.shape[1]), int(reg_frame.shape[0])],
                "live_image_dimensions": [int(live_frame.shape[1]), int(live_frame.shape[0])],
                "registered_image_loaded": True,
                "live_face_count": len(faces_live),
                "registered_face_count": len(faces_reg),
                "similarity_metric": "OpenCV SFace cosine similarity",
                "configured_threshold": self.SFACE_COSINE_THRESHOLD,
            }

            if len(faces_live) == 0:
                logger.info("Face verification diagnostics: %s", diagnostics)
                return {
                    "verified": False,
                    "match_confidence": 0.0,
                    "reason": "No face detected in live camera view. Please align your face inside the frame.",
                    "engine": "OpenCV YuNet + SFace",
                    "diagnostics": diagnostics,
                }

            if len(faces_reg) == 0:
                logger.info("Face verification diagnostics: %s", diagnostics)
                return {
                    "verified": False,
                    "match_confidence": 0.0,
                    "reason": "No face detected in the registered candidate photo.",
                    "engine": "OpenCV YuNet + SFace",
                    "diagnostics": diagnostics,
                }

            if len(faces_live) > 1 or len(faces_reg) > 1:
                logger.info("Face verification diagnostics: %s", diagnostics)
                return {
                    "verified": False,
                    "match_confidence": 0.0,
                    "reason": "Exactly one face is required in both the live and registered images.",
                    "engine": "OpenCV YuNet + SFace",
                    "diagnostics": diagnostics,
                }

            recognizer = cv2.FaceRecognizerSF.create(str(self.SFACE_MODEL_PATH), "")
            live_face = self._to_detector_row(faces_live[0], cv2, np)
            registered_face = self._to_detector_row(faces_reg[0], cv2, np)
            live_aligned = recognizer.alignCrop(live_frame, live_face)
            registered_aligned = recognizer.alignCrop(reg_frame, registered_face)
            live_feature = recognizer.feature(live_aligned)
            registered_feature = recognizer.feature(registered_aligned)
            cosine_similarity = float(recognizer.match(registered_feature, live_feature, cv2.FaceRecognizerSF_FR_COSINE))
            is_match = cosine_similarity >= self.SFACE_COSINE_THRESHOLD
            diagnostics.update({
                "live_face_crop_dimensions": [int(live_aligned.shape[1]), int(live_aligned.shape[0])],
                "registered_face_crop_dimensions": [int(registered_aligned.shape[1]), int(registered_aligned.shape[0])],
                "similarity_score": round(cosine_similarity, 6),
                "verification_decision": is_match,
            })
            logger.info("Face verification diagnostics: %s", diagnostics)
            return {
                "verified": is_match,
                "match_confidence": round(max(0.0, cosine_similarity) * 100, 1),
                "engine": "OpenCV YuNet face detector + SFace face recognizer",
                "reason": "Biometric match successful." if is_match else "Facial identity does not match the registered candidate photo.",
                "diagnostics": diagnostics,
            }
        except Exception as exc:
            return {
                "verified": False,
                "match_confidence": 0.0,
                "reason": "Face verification could not be completed.",
                "error": str(exc),
                "engine": "OpenCV YuNet + SFace",
            }

    @staticmethod
    def _describe_photo_source(registered_photo: str) -> str:
        if registered_photo.lower().startswith("data:image"):
            return f"candidate data URL ({len(registered_photo)} characters)"
        return registered_photo

    @staticmethod
    def _decode_image(image_bytes: bytes, cv2, np):
        """Decode any browser-supported image into a consistent BGR frame."""
        if not image_bytes:
            return None
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if frame is None or frame.size == 0:
            return None
        return frame

    @classmethod
    def _load_registered_image(cls, photo_source: str, cv2, np, base64, url_request):
        source = photo_source.strip()
        if source.lower().startswith("data:"):
            try:
                header, encoded = source.split(",", 1)
                if ";base64" not in header.lower():
                    return None
                return cls._decode_image(base64.b64decode(encoded, validate=True), cv2, np)
            except (ValueError, TypeError, base64.binascii.Error):
                return None

        if source.lower().startswith(("http://", "https://")):
            try:
                with url_request.urlopen(source, timeout=4) as response:
                    return cls._decode_image(response.read(), cv2, np)
            except Exception:
                return None

        path = Path(source).expanduser()
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[2] / path
        if not path.is_file():
            return None
        return cv2.imread(str(path), cv2.IMREAD_COLOR)

    @staticmethod
    def _to_detector_row(face_box, cv2, np):
        return np.asarray([face_box], dtype=np.float32)





