# ExamGuard API Documentation

## Overview

This document describes the backend APIs for the ExamGuard platform.

## Authentication Endpoints

### 1. Register Candidate

- Endpoint: `/api/auth/register`
- Method: `POST`
- Purpose: Register a new candidate account.
- Authentication Required: No
- Headers:
  - `Content-Type: application/json`
- Request Body:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "secure123",
    "photo_path": "/tmp/jane.jpg"
  }
  ```
- Success Response:
  - Status: `201 Created`
  - Body:
    ```json
    {
      "message": "Registration successful.",
      "candidate": {
        "id": 1,
        "name": "Jane Doe",
        "email": "jane@example.com",
        "photo_path": "/tmp/jane.jpg",
        "created_at": "2026-07-25T00:00:00"
      }
    }
    ```
- Error Responses:
  - `400` for missing or invalid input
  - `409` if the email is already registered
- Example Request:
  ```bash
  curl -X POST http://127.0.0.1:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"name":"Jane Doe","email":"jane@example.com","password":"secure123","photo_path":"/tmp/jane.jpg"}'
  ```
- Example Response:
  ```json
  {
    "message": "Registration successful.",
    "candidate": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "photo_path": "/tmp/jane.jpg",
      "created_at": "2026-07-25T00:00:00"
    }
  }
  ```

### 2. Login Candidate

- Endpoint: `/api/auth/login`
- Method: `POST`
- Purpose: Authenticate a candidate and return a JWT token.
- Authentication Required: No
- Headers:
  - `Content-Type: application/json`
- Request Body:
  ```json
  {
    "email": "jane@example.com",
    "password": "secure123"
  }
  ```
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Login successful.",
      "token": "<jwt-token>",
      "candidate": {
        "id": 1,
        "name": "Jane Doe",
        "email": "jane@example.com",
        "photo_path": "/tmp/jane.jpg",
        "created_at": "2026-07-25T00:00:00"
      }
    }
    ```
- Error Responses:
  - `400` for missing credentials
  - `401` for invalid credentials
- Example Request:
  ```bash
  curl -X POST http://127.0.0.1:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"jane@example.com","password":"secure123"}'
  ```
- Example Response:
  ```json
  {
    "message": "Login successful.",
    "token": "<jwt-token>",
    "candidate": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "photo_path": "/tmp/jane.jpg",
      "created_at": "2026-07-25T00:00:00"
    }
  }
  ```

### 3. Logout Candidate

- Endpoint: `/api/auth/logout`
- Method: `POST`
- Purpose: End the current authenticated session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Logout successful."
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
- Example Request:
  ```bash
  curl -X POST http://127.0.0.1:5000/api/auth/logout \
    -H "Authorization: Bearer <token>"
  ```
- Example Response:
  ```json
  {
    "message": "Logout successful."
  }
  ```

### 4. Get Profile

- Endpoint: `/api/auth/profile`
- Method: `GET`
- Purpose: Return the currently authenticated candidate profile.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "candidate": {
        "id": 1,
        "name": "Jane Doe",
        "email": "jane@example.com",
        "photo_path": "/tmp/jane.jpg",
        "created_at": "2026-07-25T00:00:00"
      }
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
- Example Request:
  ```bash
  curl -X GET http://127.0.0.1:5000/api/auth/profile \
    -H "Authorization: Bearer <token>"
  ```
- Example Response:
  ```json
  {
    "candidate": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "photo_path": "/tmp/jane.jpg",
      "created_at": "2026-07-25T00:00:00"
    }
  }
  ```

## Event Endpoints

### 9. Log Browser Event

- Endpoint: `/api/events/browser`
- Method: `POST`
- Purpose: Record a browser-side activity event for the authenticated candidate and exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Request Body:
  ```json
  {
    "session_id": 1,
    "event_type": "tab_switch",
    "additional_details": "User switched tabs"
  }
  ```
- Supported Event Types:
  - `exam_started`
  - `exam_page_opened`
  - `exam_page_closed`
  - `focus_lost`
  - `focus_regained`
  - `tab_switch`
  - `exam_submitted`
- Success Response:
  - Status: `201 Created`
  - Body:
    ```json
    {
      "message": "Browser event logged.",
      "event": {
        "id": 1,
        "session_id": 1,
        "candidate_id": 1,
        "event_type": "tab_switch",
        "timestamp": "2026-07-25T00:00:00+00:00",
        "additional_details": "User switched tabs"
      }
    }
    ```
- Error Responses:
  - `400` for invalid input or unsupported event type
  - `401` for missing or invalid token
  - `403` for a session that does not belong to the authenticated candidate

### 10. Get Session Events

- Endpoint: `/api/events/session/<session_id>`
- Method: `GET`
- Purpose: Return all browser events for a specific exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "events": [
        {
          "id": 1,
          "session_id": 1,
          "candidate_id": 1,
          "event_type": "tab_switch",
          "timestamp": "2026-07-25T00:00:00+00:00",
          "additional_details": "User switched tabs"
        }
      ]
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for a session that does not belong to the authenticated candidate

### 11. Log Face Presence Event

- Endpoint: `/api/events/face`
- Method: `POST`
- Purpose: Record a face-presence event for the authenticated candidate and exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Request Body:
  ```json
  {
    "session_id": 1,
    "status": "face_present"
  }
  ```
- Supported Status Values:
  - `face_present`
  - `face_absent`
  - `multiple_faces`
- Success Response:
  - Status: `201 Created`
  - Body:
    ```json
    {
      "message": "Face event logged.",
      "event": {
        "id": 1,
        "session_id": 1,
        "candidate_id": 1,
        "status": "face_present",
        "timestamp": "2026-07-25T00:00:00+00:00",
        "additional_details": null,
        "absence_duration_seconds": null
      }
    }
    ```
- Error Responses:
  - `400` for invalid session ID, missing status, or unsupported face status
  - `401` for missing or invalid token
  - `403` for a session that does not belong to the authenticated candidate

### 12. Get Face History

- Endpoint: `/api/events/face/<session_id>`
- Method: `GET`
- Purpose: Return all face-presence events for a specific exam session in chronological order.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "events": [
        {
          "id": 1,
          "session_id": 1,
          "candidate_id": 1,
          "status": "face_absent",
          "timestamp": "2026-07-25T00:00:00+00:00",
          "additional_details": null,
          "absence_duration_seconds": null
        }
      ]
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for a session that does not belong to the authenticated candidate

## Health Endpoint

### 13. Health Check

- Endpoint: `/api/health`
- Method: `GET`
- Purpose: Confirm the backend service is running.
- Authentication Required: No
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "status": "Backend Running"
    }
    ```
- Error Responses:
  - `404` if the route is unavailable

## Warning Endpoints

### 14. Get Session Warnings

- Endpoint: `/api/events/warnings/<session_id>`
- Method: `GET`
- Purpose: Return all warnings generated for a specific exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "warnings": [
        {
          "id": 1,
          "session_id": 1,
          "candidate_id": 1,
          "warning_type": "Excessive Tab Switching",
          "message": "The candidate switched tabs excessively during the exam.",
          "severity": "Medium",
          "created_at": "2026-07-25T00:00:00+00:00"
        }
      ]
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for a session that does not belong to the authenticated candidate

### 15. Get Warning Count

- Endpoint: `/api/events/warning-count/<session_id>`
- Method: `GET`
- Purpose: Return the total number of warnings for a specific exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "count": 1
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for a session that does not belong to the authenticated candidate

## Session Monitoring Endpoints

### 16. Get All Exam Sessions

- Endpoint: `/api/monitor/sessions`
- Method: `GET`
- Purpose: Return a summary list of exam sessions for authenticated admin or invigilator users.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    [
      {
        "session_id": 1,
        "candidate": "Alice",
        "exam": "Python Test",
        "status": "Completed",
        "warnings": 2
      }
    ]
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for non-admin or non-invigilator access

### 17. Get Session Summary

- Endpoint: `/api/monitor/session/<session_id>`
- Method: `GET`
- Purpose: Return the monitoring summary for a single exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "session_id": 1,
      "candidate_name": "Alice",
      "candidate_email": "alice@example.com",
      "exam_name": "Python Test",
      "start_time": "2026-07-25T00:00:00+00:00",
      "end_time": "2026-07-25T00:10:00+00:00",
      "status": "Completed",
      "warning_count": 2,
      "browser_event_count": 2,
      "face_event_count": 1
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for non-admin or non-invigilator access
  - `404` if the session does not exist

### 18. Get Session Timeline

- Endpoint: `/api/monitor/timeline/<session_id>`
- Method: `GET`
- Purpose: Return all browser and face events for a session in chronological order.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    [
      {
        "time": "10:02:10",
        "type": "browser",
        "event": "tab_switch"
      },
      {
        "time": "10:02:18",
        "type": "face",
        "event": "multiple_faces"
      }
    ]
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for non-admin or non-invigilator access
  - `404` if the session does not exist

### 19. Get Session Warnings

- Endpoint: `/api/monitor/warnings/<session_id>`
- Method: `GET`
- Purpose: Return all warnings recorded for a session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    [
      {
        "warning_type": "Excessive Tab Switching",
        "severity": "Medium",
        "timestamp": "2026-07-25T00:10:00+00:00",
        "details": "The candidate switched tabs excessively during the exam."
      }
    ]
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for non-admin or non-invigilator access
  - `404` if the session does not exist

## Integrity Analytics Endpoints

### 20. Get Session Integrity

- Endpoint: `/api/integrity/session/<session_id>`
- Method: `GET`
- Purpose: Return integrity scoring details for a single completed or in-progress exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "session_id": 1,
      "integrity_score": 82,
      "risk_level": "Medium",
      "summary": {
        "tab_switches": 3,
        "focus_losses": 2,
        "browser_closed": 0,
        "face_absent": 1,
        "multiple_faces": 0,
        "warnings": 2
      }
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for non-admin or non-invigilator access
  - `404` if the session does not exist

### 21. Get All Completed Session Integrity Scores

- Endpoint: `/api/integrity/all`
- Method: `GET`
- Purpose: Return integrity scores for every completed exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    [
      {
        "session_id": 1,
        "candidate": "Alice",
        "exam": "Python Test",
        "score": 91,
        "risk": "Low"
      }
    ]
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for non-admin or non-invigilator access

## Dashboard Endpoints

### 22. Dashboard Summary

- Endpoint: `/api/dashboard/summary`
- Method: `GET`
- Purpose: Return aggregate dashboard analytics for admin and invigilator users.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "total_candidates": 25,
      "total_exams": 4,
      "total_sessions": 120,
      "completed_sessions": 110,
      "active_sessions": 10,
      "browser_events": 540,
      "face_events": 312,
      "warnings": 45,
      "average_integrity_score": 91.4,
      "high_risk_sessions": 8,
      "critical_sessions": 2
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
  - `403` for non-admin or non-invigilator access

### 23. Recent Sessions

- Endpoint: `/api/dashboard/recent-sessions`
- Method: `GET`
- Purpose: Return the latest 10 sessions with integrity and warning information.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    [
      {
        "session_id": 1,
        "candidate_name": "Alice",
        "exam_name": "Python Test",
        "status": "Completed",
        "integrity_score": 91,
        "risk_level": "Low Risk",
        "warning_count": 2
      }
    ]
    ```

### 24. High Risk Sessions

- Endpoint: `/api/dashboard/high-risk`
- Method: `GET`
- Purpose: Return only sessions with High or Critical risk.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    [
      {
        "session_id": 2,
        "candidate_name": "Bob",
        "exam_name": "Java Test",
        "status": "Completed",
        "integrity_score": 58,
        "risk_level": "High",
        "warning_count": 1
      }
    ]
    ```

### 25. Candidate Analytics

- Endpoint: `/api/dashboard/candidate/<candidate_id>`
- Method: `GET`
- Purpose: Return candidate profile, completed exams, integrity scores, warnings, and event counts.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "candidate": {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "photo_path": null
      },
      "completed_exams": ["Python Test"],
      "integrity_scores": [91],
      "warnings": [],
      "browser_event_count": 12,
      "face_event_count": 5
    }
    ```

## Report Endpoints

### 26. Session Report

- Endpoint: `/api/reports/session/<session_id>`
- Method: `GET`
- Purpose: Return a JSON report for one exam session including session, candidate, exam, integrity score, risk, browser events, face events, and warnings.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "session": {
        "id": 1,
        "status": "Completed",
        "start_time": "2026-07-25T00:00:00+00:00",
        "end_time": "2026-07-25T00:10:00+00:00"
      },
      "candidate": {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com"
      },
      "exam": {
        "id": 1,
        "title": "Python Test",
        "description": "Sample",
        "duration": 60,
        "total_marks": 100
      },
      "integrity_score": 91,
      "risk_level": "Low Risk",
      "browser_events": [],
      "face_events": [],
      "warnings": []
    }
    ```

### 27. Candidate Report

- Endpoint: `/api/reports/candidate/<candidate_id>`
- Method: `GET`
- Purpose: Return a JSON summary for one candidate including completed exams, average integrity score, and warning history.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "candidate": {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "photo_path": null
      },
      "completed_exams": ["Python Test"],
      "average_integrity_score": 91.4,
      "warning_history": []
    }
    ```

## Exam Endpoints

### 5. Get All Exams

- Endpoint: `/api/exams`
- Method: `GET`
- Purpose: Return available exams.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "exams": [
        {
          "exam_id": 1,
          "title": "Math Exam",
          "description": "Sample",
          "duration": 60,
          "total_marks": 100
        }
      ]
    }
    ```
- Error Responses:
  - `401` for missing or invalid token
- Example Request:
  ```bash
  curl -X GET http://127.0.0.1:5000/api/exams \
    -H "Authorization: Bearer <token>"
  ```
- Example Response:
  ```json
  {
    "exams": [
      {
        "exam_id": 1,
        "title": "Math Exam",
        "description": "Sample",
        "duration": 60,
        "total_marks": 100
      }
    ]
  }
  ```

### 6. Get Exam Details

- Endpoint: `/api/exams/<id>`
- Method: `GET`
- Purpose: Return complete exam details and questions.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
- Request Body:
  - None
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "exam_id": 1,
      "title": "Math Exam",
      "description": "Sample",
      "duration": 60,
      "total_marks": 100,
      "questions": [
        {
          "question_id": 1,
          "question_text": "2+2?",
          "option_a": "3",
          "option_b": "4",
          "option_c": "5",
          "option_d": "6"
        }
      ]
    }
    ```
- Error Responses:
  - `404` for invalid exam ID
  - `401` for missing or invalid token
- Example Request:
  ```bash
  curl -X GET http://127.0.0.1:5000/api/exams/1 \
    -H "Authorization: Bearer <token>"
  ```
- Example Response:
  ```json
  {
    "exam_id": 1,
    "title": "Math Exam",
    "description": "Sample",
    "duration": 60,
    "total_marks": 100,
    "questions": [
      {
        "question_id": 1,
        "question_text": "2+2?",
        "option_a": "3",
        "option_b": "4",
        "option_c": "5",
        "option_d": "6"
      }
    ]
  }
  ```

### 7. Start Exam

- Endpoint: `/api/exams/start`
- Method: `POST`
- Purpose: Start a candidate exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Request Body:
  ```json
  {
    "exam_id": 2
  }
  ```
- Success Response:
  - Status: `201 Created`
  - Body:
    ```json
    {
      "message": "Exam session started.",
      "session_id": 1
    }
    ```
- Error Responses:
  - `400` for invalid exam ID or malformed input
  - `401` for missing or invalid token
- Example Request:
  ```bash
  curl -X POST http://127.0.0.1:5000/api/exams/start \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"exam_id":2}'
  ```
- Example Response:
  ```json
  {
    "message": "Exam session started.",
    "session_id": 1
  }
  ```

### 8. Submit Exam

- Endpoint: `/api/exams/submit`
- Method: `POST`
- Purpose: Submit answers for an active exam session.
- Authentication Required: Yes
- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Request Body:
  ```json
  {
    "session_id": 5,
    "answers": [
      {
        "question_id": 1,
        "selected_option": "B"
      }
    ]
  }
  ```
- Success Response:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "message": "Exam submitted successfully.",
      "session_id": 5
    }
    ```
- Error Responses:
  - `400` for invalid session or malformed input
  - `401` for missing or invalid token
- Example Request:
  ```bash
  curl -X POST http://127.0.0.1:5000/api/exams/submit \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"session_id":5,"answers":[{"question_id":1,"selected_option":"B"}]}'
  ```
- Example Response:
  ```json
  {
    "message": "Exam submitted successfully.",
    "session_id": 5
  }
  ```
