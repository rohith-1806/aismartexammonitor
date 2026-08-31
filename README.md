# 🛡️ AI Smart Exam Monitor (ExamGuard)

[![Author](https://img.shields.io/badge/Author-PATHAN%20KHADAR%20KHAN-blue.svg?style=for-the-badge)](https://github.com/rohith-1806/aismartexammonitor)
[![Repository](https://img.shields.io/badge/GitHub-aismartexammonitor-181717?style=for-the-badge&logo=github)](https://github.com/rohith-1806/aismartexammonitor)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

An intelligent, real-time automated AI proctoring and online examination monitoring platform built with **React**, **Vite**, **TailwindCSS**, **Flask**, and **OpenCV**. Developed by **PATHAN KHADAR KHAN**.

---

## 📌 Table of Contents
- [📖 Overview](#-overview)
- [🚨 Problem Statement](#-problem-statement)
- [✨ Key Features](#-key-features)
- [⚙️ System Architecture & Workflow](#️-system-architecture--workflow)
- [🛠️ Technology Stack](#️-technology-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Installation & Setup](#-installation--setup)
- [💻 How to Run the Application](#-how-to-run-the-application)
- [🔑 Test Credentials & Usage](#-test-credentials--usage)
- [🎥 Demo & User Experience](#-demo--user-experience)
- [🔮 Future Enhancements](#-future-enhancements)
- [👤 Author](#-author)
- [📄 License](#-license)

---

## 📖 Overview

**AI Smart Exam Monitor** (also known as **ExamGuard**) is a modern web application designed to ensure integrity and fairness in remote online examinations. The system combines an intuitive candidate examination interface with a robust administrator portal backed by an automated AI proctoring rule engine.

By constantly evaluating candidate behavioral signals—such as browser focus, tab switching frequency, face presence, and multiple person detection—the application logs violations, issues interactive warnings, and auto-submits or suspends suspicious exam sessions.

---

## 🚨 Problem Statement

With the rapid expansion of remote learning and online certification programs, maintaining academic integrity during examinations has become a critical challenge. Traditional online tests suffer from:
1. **Unmonitored Tab Switching**: Candidates navigating to external websites or search engines for answers.
2. **Impersonation & Unattended Exams**: Candidates leaving the camera frame or allowing surrogates to take the test.
3. **Collaborative Cheating**: Multiple individuals present in the room giving unauthorized assistance.
4. **Lack of Real-Time Analytics**: Instructors lacking centralized, real-time proctoring data and audit trails.

**AI Smart Exam Monitor** solves these issues through real-time client and server-side proctoring controls, automated anomaly detection, and actionable administrative reports.

---

## ✨ Key Features

### 🎓 Candidate Examination Portal
- **🔐 Secure Authentication**: Role-based authentication supporting both candidates and administrators.
- **🎥 Real-Time Video Proctoring**: Live camera capture monitoring candidate face presence.
- **🚫 Anti-Cheating Controls**:
  - Full-screen mode enforcement.
  - Tab switch counter with configurable violation thresholds.
  - Window focus loss detection.
  - Long inactivity detection.
- **⏱️ Interactive Exam Suite**:
  - Live remaining time counter with automatic submission upon timeout.
  - Question grid navigation with status tracking (Answered, Unanswered, Marked for Review).
  - Clear feedback on candidate responses.

### 🛠️ Administrator Management Panel
- **📊 Real-Time Proctoring Dashboard**: View live examination status, active candidate count, and violation logs.
- **📝 Exam & Question Management**: Create, edit, and publish custom exams with configurable question banks and options.
- **👥 Candidate Roster**: Manage registered candidates, assign exams, and inspect candidate activity history.
- **⚠️ Automated Incident Logging**: Detailed breakdown of proctoring events per candidate (Tab switches, Face Absence duration, Multiple face alerts).
- **🛑 Candidate Suspension Control**: Ability for administrators to review flag severity and terminate non-compliant sessions.

---

## ⚙️ System Architecture & Workflow

The system follows a modular decoupled architecture: a **React + Vite** single-page application (SPA) communicating via RESTful API services with a **Flask + SQLAlchemy** backend engine.

```mermaid
flowchart TD
    subgraph Client ["Frontend (React + Vite + TailwindCSS)"]
        A[Candidate Login] --> B[Exam Selection & Instructions]
        B --> C[Camera & Device Verification]
        C --> D[Active Exam Interface]
        D --> E[Proctoring Engine Hook]
        E -->|Tab Switch / Focus Loss| F[Violation Logger]
        E -->|Video Stream Feed| G[Face & Presence Evaluator]
    end

    subgraph Backend ["Backend (Flask REST API + SQLite)"]
        F -->|POST /api/events| H[Proctoring Event Logger]
        G -->|Event Telemetry| H
        H --> I[(SQLite / SQLAlchemy DB)]
        J[Admin Dashboard API] --> I
    end

    subgraph Admin ["Admin Management Panel"]
        J --> K[Real-time Violation Stream]
        J --> L[Exam & Question Manager]
        J --> M[Proctoring Reports & Session Control]
    end
```

### 🧠 Proctoring Rule Engine Logic
```mermaid
stateDiagram-v2
    [*] --> ExamStarted
    ExamStarted --> Monitoring: Video & Window Focus Active
    
    state Monitoring {
        [*] --> Normal
        Normal --> TabSwitchDetected: Window Blur / Tab Hidden
        Normal --> FaceAbsenceDetected: Camera Obstructed / User Away
        Normal --> MultipleFaceDetected: Additional Person in Frame
    }

    TabSwitchDetected --> IncrementWarning: Log Event & Increment Count
    FaceAbsenceDetected --> IncrementWarning: Log Duration Event
    MultipleFaceDetected --> FlagSuspicious: High Severity Flag

    IncrementWarning --> WarningModal: Show Screen Warning
    WarningModal --> Normal: Acknowledge & Resume
    
    IncrementWarning --> AutoSubmit: Warning Limit Exceeded (Threshold >= 3)
    FlagSuspicious --> AdminReview: Flag Session for Administrator Action
```

---

## 🛠️ Technology Stack

### Core Technologies
| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18.2 | Component-driven user interface |
| **Build Tool / Bundler** | Vite 8.2 | Ultra-fast HMR module bundler |
| **Styling & Design** | TailwindCSS 3.3 | Utility-first CSS framework |
| **Routing** | React Router DOM 6.14 | Client-side routing & route guards |
| **Icons** | Lucide React | Clean, scalable UI icons |
| **Backend Framework** | Flask 3.0 | Lightweight Python web framework |
| **Database ORM** | SQLAlchemy 3.1 | Python SQL toolkit and Object Relational Mapper |
| **Database** | SQLite 3 | Lightweight relational database engine |
| **Authentication** | PyJWT 2.8 & Werkzeug | JWT token auth & secure password hashing |
| **Computer Vision** | OpenCV (opencv-python 4.10) | Image processing & video frame analysis |
| **CORS** | Flask-Cors 5.0 | Cross-Origin Resource Sharing handler |

---

## 📁 Project Structure

```
aismartexammonitor/
├── backend/                        # Flask Python API Server
│   ├── app.py                      # Application entry point
│   ├── seed_data.py                # Database initialization & sample data seeder
│   ├── inspect_backend.py          # Backend diagnostics & schema inspector
│   ├── requirements.txt            # Python dependencies
│   ├── backend/
│   │   ├── __init__.py             # Flask app factory
│   │   ├── config.py               # Application configuration & CORS settings
│   │   ├── database.py             # SQLAlchemy database setup
│   │   ├── models/                 # Database ORM models
│   │   │   └── exam_models.py      # Candidate, Exam, Question, & Session models
│   │   ├── routes/                 # RESTful API route blueprints
│   │   │   ├── auth.py             # Authentication endpoints
│   │   │   ├── candidate.py        # Candidate exam portal endpoints
│   │   │   ├── proctoring.py       # Proctoring violation logging endpoints
│   │   │   └── admin.py            # Administrator management endpoints
│   │   └── services/               # Core business logic & proctoring algorithms
│   └── docs/                       # Backend API documentation
│       └── API_DOCUMENTATION.md    # Detailed API endpoint references
│
├── src/                            # React Frontend Source Code
│   ├── App.jsx                     # Root application component & route configuration
│   ├── main.jsx                    # Application entry point
│   ├── index.css                   # Global styles & Tailwind import
│   ├── components/                 # Reusable UI components (Modals, Timers, Cards)
│   ├── config/                     # Frontend API configurations
│   ├── contexts/                   # React contexts (AuthContext, ProctoringContext)
│   ├── hooks/                      # Custom hooks (useProctoring, useExamTimer)
│   ├── pages/                      # Page views (Login, Candidate Dashboard, Exam, Admin)
│   ├── routes/                     # Protected route components & navigation guards
│   ├── services/                   # API service clients (authApi, examApi, proctoringApi)
│   └── utils/                      # Helper utilities and formatting functions
│
├── public/                         # Static web assets
├── package.json                    # Node.js project manifest & scripts
├── vite.config.js                  # Vite configuration settings
├── tailwind.config.js              # TailwindCSS styling configuration
├── postcss.config.js               # PostCSS plugin settings
├── render.yaml                     # Render backend cloud deployment configuration
├── vercel.json                     # Vercel frontend deployment configuration
├── .env.example                    # Environment variable template
├── .gitignore                      # Git exclusion patterns
└── README.md                       # Comprehensive project documentation
```

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: v3.10.0 or higher
- **pip**: Latest version

---

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/rohith-1806/aismartexammonitor.git
cd aismartexammonitor
```

---

### 2️⃣ Backend Setup (Python / Flask)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows**:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Initialize and seed the SQLite database:
   ```bash
   python seed_data.py
   ```

5. Start the Flask API server:
   ```bash
   python app.py
   ```
   *The Flask API server will start on **`http://127.0.0.1:5000`**.*

---

### 3️⃣ Frontend Setup (React / Vite)

1. Open a new terminal window and return to the root directory:
   ```bash
   cd aismartexammonitor
   ```

2. Install Node modules:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The React application will launch in your browser at **`http://localhost:3000`**.*

---

## 💻 How to Run the Application

To run the complete system locally, run both backend and frontend servers simultaneously:

| Component | Directory | Command | URL |
| :--- | :--- | :--- | :--- |
| **Flask API Backend** | `./backend` | `python app.py` | `http://127.0.0.1:5000` |
| **Vite React Frontend** | `./` | `npm run dev` | `http://localhost:3000` |

---

## 🔑 Test Credentials & Usage

The application comes pre-seeded with sample user accounts for instant testing:

<details>
<summary>🔑 <b>Click to View Pre-Seeded Test Credentials</b></summary>

<br>

#### 👨‍💼 Administrator Account
- **Role**: System Administrator
- **Email**: `admin@gmail.com`
- **Password**: `admin@123`
- **Access**: Full Admin Dashboard, Exam Management, Candidate Roster, & Proctoring Reports.

#### 👨‍🎓 Candidate Account 1
- **Role**: Candidate
- **Email**: `vaishu@instituion.edu`
- **Password**: `vaishu@787`
- **Access**: Candidate Portal, Assigned Examinations, & Live Test Interface.

#### 👩‍🎓 Candidate Account 2
- **Role**: Candidate
- **Email**: `monisha@instituion.edu`
- **Password**: `monisha@0703`
- **Access**: Candidate Portal, Assigned Examinations, & Live Test Interface.

</details>

---

## 🎥 Demo & User Experience

<details>
<summary>🔍 <b>Candidate Workflow Experience</b></summary>

1. **Login**: Candidate enters credentials on the responsive login page.
2. **Dashboard**: Views active, upcoming, and completed exams.
3. **Pre-Exam Verification**: System checks camera access and displays exam instructions.
4. **Active Test Mode**: Full-screen mode is requested. The question navigator displays status across all questions.
5. **Real-time Proctoring**: Switching tabs or leaving the camera frame triggers immediate on-screen warnings. Exceeding the maximum allowed warnings automatically submits the candidate's test.

</details>

<details>
<summary>📊 <b>Administrator Workflow Experience</b></summary>

1. **Login**: Admin logs in using administrative credentials.
2. **Management Overview**: Real-time summary cards displaying active exams, total candidate submissions, and violation alerts.
3. **Exam Builder**: Create new exams, input multiple-choice questions, set duration limits, and assign candidates.
4. **Proctoring Audit Log**: Inspect timestamps and details of every violation event (tab switch, face absence, multiple faces) recorded during test sessions.

</details>

---

## 🔮 Future Enhancements

- [ ] **Gaze & Eye-Tracking AI**: Detect off-screen eye movements using deep learning models (e.g., MediaPipe Face Mesh).
- [ ] **Audio Anomaly Detection**: Real-time microphone monitoring to flag background voices and whisper signals.
- [ ] **Automated ID Verification**: Match candidate photo on test day against uploaded institutional identity cards.
- [ ] **AWS S3 / Cloud Media Backup**: Secure cloud storage for recorded proctoring video feeds and snapshot logs.

---

## 👤 Author

**PATHAN KHADAR KHAN**
- **GitHub**: [@rohith-1806](https://github.com/rohith-1806)
- **Repository**: [aismartexammonitor](https://github.com/rohith-1806/aismartexammonitor)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
