# Izee-Culturals Demo Prep README

This document is a full demo and viva prep guide for teachers, committee members, and technically aware peers.

Use this when someone asks:
1. What exactly did you build?
2. Why did you choose this architecture?
3. Which file does what?
4. How does data move end to end?
5. What are the trade-offs and next upgrades?

---

## 1) One-minute project summary

I built a full-stack cultural fest registration portal with three user journeys:
1. Students register as audience.
2. Participants register for competition events (max 2).
3. Faculty reviews registrations, approves entries, and exports CSV reports.

Core behavior:
1. Student/participant registration is created as pending.
2. Faculty approval generates QR and stores it in database.
3. User can revisit confirmation page until QR appears.

---

## 2) Why this stack was chosen

### Frontend: React + Vite + Tailwind + Framer Motion

Why React:
1. Component architecture keeps each page isolated and maintainable.
2. Fast iteration for form-heavy workflows.

Why Vite:
1. Fast dev startup and rebuilds, ideal for demo prep speed.
2. Simple production build pipeline.

Why Tailwind:
1. Rapid UI iteration with consistent spacing/color utilities.
2. Easy responsive behavior without separate CSS files per component.

Why Framer Motion:
1. Smooth route and card transitions.
2. Better visual quality for a cultural fest showcase UI.

### Backend: FastAPI (Python)

Why FastAPI:
1. Very fast to build typed APIs.
2. Clean request validation with Pydantic models.
3. Simple local deployment for event operations.

### Database: Supabase PostgreSQL

Why Supabase:
1. Managed Postgres with quick setup.
2. SQL power with easy table inspection from dashboard.
3. Works well for reporting/export workflows.

### QR generation: qrcode (base64 in DB)

Why this approach:
1. No file storage complexity.
2. QR can be rendered directly in browser as data URI.
3. Easy to resend via email as inline image.

---

## 3) System architecture in simple terms

1. Frontend sends registration data to backend API.
2. Backend saves registration in Supabase with qr_code = null.
3. Faculty dashboard fetches pending entries with token check.
4. On approval, backend generates QR and updates record.
5. Confirmation page polls status endpoint until qr_code exists.
6. CSV endpoints export current records for desk operations.

---

## 4) Full project file map with purpose

Main project folder:
1. cultural-fest/backend
2. cultural-fest/frontend
3. scripts

### Backend files

1. cultural-fest/backend/main.py
Purpose: Creates FastAPI app, validates required env, configures CORS, mounts routers, exposes health endpoint.
Why needed: Single source for API bootstrapping and runtime safety checks.

2. cultural-fest/backend/db.py
Purpose: Loads SUPABASE_URL and SUPABASE_KEY and initializes shared Supabase client.
Why needed: Central DB client avoids repeated connection logic in route files.

3. cultural-fest/backend/qr_utils.py
Purpose: Converts registration payload dict to base64 PNG QR.
Why needed: Consistent in-memory QR generation without filesystem writes.

4. cultural-fest/backend/routes/students.py
Purpose: Student registration + student status API.
Why needed: Keeps student flow isolated and easier to test/maintain.

5. cultural-fest/backend/routes/participants.py
Purpose: Participant registration + event validation (1 to 2 events) + participant status API.
Why needed: Encapsulates participant-specific constraints.

6. cultural-fest/backend/routes/faculty.py
Purpose: Faculty login, secure data access, approve/resend/delete operations, pagination, summaries, and CSV exports.
Why needed: All committee/admin operations in one controlled API surface.

7. cultural-fest/backend/sql/add_approved_at_columns.sql
Purpose: Optional schema helper for approved_at metrics.
Why needed: Better dashboard analytics for approval-day tracking.

### Frontend files

1. cultural-fest/frontend/src/main.jsx
Purpose: App bootstrap entry.

2. cultural-fest/frontend/src/App.jsx
Purpose: Defines all routes and page transitions.
Why needed: Central route graph and animated navigation wrapper.

3. cultural-fest/frontend/src/index.css
Purpose: Global theme, fonts, glass styles, utility animations.
Why needed: Shared design system and readability controls across pages.

4. cultural-fest/frontend/src/pages/Home.jsx
Purpose: Entry page for participant, student, and faculty flows.
Why needed: Primary navigation and fest identity page.

5. cultural-fest/frontend/src/pages/ParticipantEvents.jsx
Purpose: Event cards + rules modal + max-2 selection gate.
Why needed: Participant must choose events before registration.

6. cultural-fest/frontend/src/pages/ParticipantRegister.jsx
Purpose: Participant form submission.
Why needed: Collects participant details and selected events.

7. cultural-fest/frontend/src/pages/StudentRegister.jsx
Purpose: Student audience registration form.
Why needed: Separate audience path with simpler fields.

8. cultural-fest/frontend/src/pages/Confirmation.jsx
Purpose: Shows pending state and QR state after approval.
Why needed: Clear post-submit status tracking for users.

9. cultural-fest/frontend/src/pages/FacultyLogin.jsx
Purpose: Faculty password login screen.
Why needed: Simple gate before dashboard access.

10. cultural-fest/frontend/src/pages/FacultyDashboard.jsx
Purpose: Committee operations console with filters, sort, pagination, approvals, deletion, resend, exports.
Why needed: Event desk control center.

11. cultural-fest/frontend/src/data/events.js
Purpose: Static events catalog and rules text.
Why needed: Reliable no-latency source for event metadata.

### Root and utility files

1. scripts/checks.sh
Purpose: Run frontend build + backend compile + optional health check.
Why needed: One-command sanity check before demo.

2. package.json (root)
Purpose: exposes npm run checks.

3. README.md
Purpose: detailed main technical guide.

4. README_TEACHER_STATUS.md
Purpose: short status note for quick teacher review.

5. README_DEMO_PREP.md (this file)
Purpose: defendable explanation + Q and A prep.

---

## 5) Database model and why it is designed this way

Tables:
1. students
2. participants
3. participant_events

Design reason:
1. Students and participants have different business workflows.
2. participant_events is a relation table so one participant can map to one or two events cleanly.
3. Approval state is derived from qr_code presence.

Current practical note:
1. Phone is optional in API request models.
2. Existing database phone columns can remain for backward compatibility.

---

## 6) API list and usage intent

Public endpoints:
1. POST /api/register/student
2. GET /api/register/student/{student_id}/status
3. POST /api/register/participant
4. GET /api/register/participant/{participant_id}/status

Faculty endpoints:
1. POST /api/faculty/login
2. GET /api/faculty/students
3. GET /api/faculty/participants
4. POST /api/faculty/approve/student/{student_id}
5. POST /api/faculty/approve/participant/{participant_id}
6. POST /api/faculty/resend/student/{student_id}
7. POST /api/faculty/resend/participant/{participant_id}
8. DELETE /api/faculty/student/{student_id}
9. DELETE /api/faculty/participant/{participant_id}
10. GET /api/faculty/export/students
11. GET /api/faculty/export/participants

Health endpoint:
1. GET /health

Security model:
1. Faculty routes require Authorization: Bearer FACULTY_PASSWORD.
2. No JWT used by design (kept simple for committee tool use).

---

## 7) End-to-end flow details

### Student flow

1. Student submits form.
2. Backend creates student row with qr_code = null.
3. Frontend redirects to confirmation page.
4. Confirmation checks status endpoint.
5. Faculty approves from dashboard.
6. Backend generates QR and updates record.
7. Student sees QR when status is refreshed.

### Participant flow

1. User selects 1 to 2 events in event page.
2. User submits participant form.
3. Backend validates event count and stores participant.
4. Backend writes selected event IDs to participant_events.
5. Confirmation page shows pending until approval.
6. Faculty approves participant.
7. QR is generated and returned in status flow.

### Faculty flow

1. Faculty logs in with password.
2. Frontend stores authenticated flag and password in sessionStorage.
3. Dashboard requests data with Authorization bearer token.
4. Faculty filters, sorts, paginates, approves, resends mail, deletes, exports CSV.

---

## 8) Reporting and exports

Students CSV includes:
1. Registration ID
2. Name
3. Roll Number
4. Course
5. Year
6. Email
7. Status
8. Registered At

Participants CSV includes:
1. Registration ID
2. Name
3. Roll Number
4. Course
5. Year
6. Email
7. Event1
8. Event2
9. Status
10. Registered At

Why Event1 and Event2 columns:
1. Cleaner desk operations than comma-joined event text.
2. Faster manual sorting and print-friendly format.

---

## 9) Why these trade-offs are acceptable right now

1. No JWT: Faster setup and simpler faculty desk use in controlled environment.
2. sessionStorage auth state: acceptable for internal committee workflow, not for public internet hardening.
3. Static event metadata: stable and fast, no extra DB/API complexity.
4. QR stored as base64 in DB: easiest retrieval and display path.

If asked what would be upgraded for larger production:
1. Replace static password auth with role-based auth and short-lived tokens.
2. Add rate limiting and audit logging.
3. Add migration/versioning strategy.
4. Add API tests and E2E tests.

---

## 10) Demo script for committee (5 to 7 minutes)

1. Open home page and explain 3 user paths.
2. Register one student quickly.
3. Show pending state on confirmation page.
4. Register one participant with two events.
5. Open faculty login and dashboard.
6. Approve both pending entries.
7. Return to confirmation pages and show QR appears.
8. Export student and participant CSV.
9. Mention search/filter/pagination in dashboard.

---

## 11) Likely questions and strong answers

Q1: Why did you choose FastAPI instead of Node backend?
A: Team speed and typed validation. FastAPI gave quick, clean APIs and strong request modeling with very little boilerplate.

Q2: How do you prevent invalid participant event selection?
A: Validation in two layers. UI limits selection to max two and backend enforces min one, max two, so client bypass still fails.

Q3: Why pending first, not instant QR?
A: Committee control. Approval gate avoids unverified registrations and keeps entry validation manageable.

Q4: How is faculty endpoint protected?
A: Bearer token using FACULTY_PASSWORD in request header. Backend blocks unauthorized requests.

Q5: Why store QR as base64 instead of files?
A: Simpler delivery and portability. No file hosting path, no storage cleanup complexity, direct render in confirmation page.

Q6: Can this handle many records?
A: Yes for college-scale events. Dashboard uses backend pagination and indexed fetch patterns.

Q7: What if email fails on approval?
A: Approval and QR persistence can still succeed. Resend endpoint is available once SMTP issue is resolved.

Q8: Why separate students and participants tables?
A: They represent two different processes and reporting needs. Participant has event mapping, student does not.

Q9: What is your fallback if internet drops at venue?
A: Keep latest CSV exports and use registration IDs/records for manual verification flow until connectivity returns.

Q10: Biggest technical risk today?
A: Auth simplicity. Current password approach is practical but not enterprise-level identity security.

---

## 12) Honest limitations to mention confidently

1. Current auth is simple and suitable for controlled committee use, not high-security multi-admin internet deployment.
2. Event metadata is static in frontend; changing events requires frontend deploy.
3. No automated E2E suite yet.
4. Operational dependency on Supabase availability.

---

## 13) How to run locally (exact commands)

Backend:
1. cd cultural-fest/backend
2. python3 -m venv venv
3. source venv/bin/activate
4. pip install fastapi uvicorn python-dotenv supabase qrcode
5. uvicorn main:app --reload

Frontend:
1. cd cultural-fest/frontend
2. npm install
3. npm run dev

All checks from root:
1. npm run checks

---

## 14) Last-minute demo checklist (for tomorrow)

1. Confirm backend health endpoint responds.
2. Confirm frontend opens cleanly.
3. Keep one student and one participant test record ready.
4. Keep faculty password ready.
5. Keep CSV export demonstration ready.
6. Keep this Q and A section open in another tab.

You are ready if you can explain:
1. Why pending approval exists.
2. Why max 2 event validation exists in both frontend and backend.
3. How data moves from form to DB to QR to confirmation.
4. Why this architecture is practical for a college fest timeline.
