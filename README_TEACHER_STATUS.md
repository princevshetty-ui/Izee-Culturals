# Izee-Culturals Teacher Status Note

Short project status for quick review and viva-style questions.

## 1) Objective
Build a college cultural fest registration portal for:
1. Students (audience registration)
2. Participants (event registration, max 2 events)
3. Faculty (approval + dashboard + CSV reports)

## 2) Current Status
Completed and working end-to-end in local setup.

Implemented:
1. Frontend app with all planned routes
2. FastAPI backend with registration and faculty APIs
3. Supabase database integration
4. Pending approval workflow (QR generated only after faculty approval)
5. Faculty dashboard with filter/search/pagination
6. CSV export for students and participants
7. Health endpoint and checks script

## 3) Architecture Snapshot
1. Frontend: React + Vite + Tailwind + Framer Motion
2. Backend: FastAPI (Python)
3. Database: Supabase PostgreSQL
4. QR: Python qrcode library (base64 PNG stored in DB)

## 4) Functional Flow (Simple)
1. Student/participant submits form
2. Backend stores registration as pending
3. Faculty logs in and approves record
4. Backend generates QR and stores it
5. User checks confirmation page and sees QR once approved

## 5) API Coverage
Public:
1. POST /api/register/student
2. GET /api/register/student/{student_id}/status
3. POST /api/register/participant
4. GET /api/register/participant/{participant_id}/status

Faculty:
1. POST /api/faculty/login
2. GET /api/faculty/students
3. GET /api/faculty/participants
4. POST /api/faculty/approve/student/{student_id}
5. POST /api/faculty/approve/participant/{participant_id}
6. GET /api/faculty/export/students
7. GET /api/faculty/export/participants

## 6) 3-Minute Demo Plan
1. Show home page with 3 user paths
2. Submit one student registration
3. Show pending confirmation state
4. Login as faculty and approve
5. Refresh/check confirmation page for QR
6. Show CSV export from dashboard

## 7) Ready Answers (Teacher Questions)
Q: Why not instant QR?
A: Approval gate prevents unverified entries.

Q: How is faculty protected?
A: Faculty APIs require Authorization header with FACULTY_PASSWORD.

Q: Where is data stored?
A: Supabase tables: students, participants, participant_events.

Q: How is participant event limit enforced?
A: Enforced in both frontend and backend (max 2).

## 8) What Is Next (If Asked)
1. Deployment hardening for production
2. Final testing with real event load
3. Optional analytics polish using approved_at timestamps
