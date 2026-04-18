# Izee-Culturals

Comprehensive guide to understand how this project works end to end.

This README is written so you can run and explain the system confidently to your event team and faculty coordinators.

## 1) What This Project Does

This is a college cultural fest registration portal with 3 user types:

1. Students (audience entry)
2. Participants (competition entry, max 2 events)
3. Faculty (committee dashboard for approval, reporting, and CSV export)

Important behavior in the current implementation:

1. Student and participant registrations are created as pending.
2. Faculty must approve them.
3. QR code is generated only on approval.
4. Users can revisit their confirmation URL and check status until approved.

## 2) Tech Stack

Frontend:

1. React + Vite
2. Tailwind CSS
3. Framer Motion
4. React Router

Backend:

1. FastAPI
2. Supabase Python client
3. dotenv for environment variables
4. qrcode for QR generation

Database:

1. Supabase PostgreSQL

## 3) Project Structure

Main folder: `cultural-fest`

1. `backend/`
2. `frontend/`

### Backend files

1. `backend/main.py`: FastAPI app creation, CORS setup, router mounting.
2. `backend/db.py`: Supabase client initialization.
3. `backend/qr_utils.py`: QR code generation (base64 PNG).
4. `backend/routes/students.py`: student registration + status check.
5. `backend/routes/participants.py`: participant registration + status check.
6. `backend/routes/faculty.py`: faculty login, list views, approval actions, CSV export.
7. `backend/sql/add_approved_at_columns.sql`: optional SQL for adding approval timestamp columns.

### Frontend files

1. `frontend/src/App.jsx`: route definitions + page transitions.
2. `frontend/src/pages/Home.jsx`: landing page and entry points.
3. `frontend/src/pages/ParticipantEvents.jsx`: event cards + rules modal + max 2 selection logic.
4. `frontend/src/pages/ParticipantRegister.jsx`: participant form + submit.
5. `frontend/src/pages/StudentRegister.jsx`: student form + submit.
6. `frontend/src/pages/Confirmation.jsx`: pending/approved UI + status polling.
7. `frontend/src/pages/FacultyLogin.jsx`: password login.
8. `frontend/src/pages/FacultyDashboard.jsx`: records, filters, approval, export.
9. `frontend/src/data/events.js`: static event and rules metadata.

## 4) End-to-End Functional Flow

## A. Student flow (Audience)

1. User opens home page and goes to Student registration.
2. Fills form in frontend.
3. Frontend sends POST request to `/api/register/student`.
4. Backend creates student record with:
	- generated UUID
	- `registered_at`
	- `qr_code = null` (pending)
5. Frontend navigates to `/confirmation/student/:id`.
6. Confirmation page calls status endpoint `/api/register/student/:id/status`.
7. If no QR yet, page shows pending approval state.
8. Faculty later approves in dashboard.
9. Backend generates QR and saves it in `students.qr_code`.
10. Student checks status again; page now displays QR.

## B. Participant flow (Competition)

1. User opens event selection page.
2. Each event card opens rules modal.
3. User selects event(s), max 2.
4. Continue to participant registration form.
5. Frontend POSTs to `/api/register/participant` with form data + events array.
6. Backend validates:
	- at least 1 event
	- at most 2 events
7. Backend inserts participant row with `qr_code = null`.
8. Backend inserts selected events into `participant_events` table.
9. Frontend navigates to `/confirmation/participant/:id`.
10. Confirmation page checks `/api/register/participant/:id/status`.
11. Faculty approves participant later.
12. Backend generates participant QR (includes selected events in payload).
13. Participant sees QR after next status check.

## C. Faculty flow

1. Faculty enters password on `/faculty/login`.
2. Backend validates against `FACULTY_PASSWORD`.
3. Frontend stores session flags in `sessionStorage`:
	- `authenticated = true`
	- `facultyPassword = <password>`
4. Dashboard fetches data with header:
	- `Authorization: Bearer <facultyPassword>`
5. Faculty can:
	- view students
	- view participants (with event list)
	- filter by course/year/event
	- search by name, roll number, or email
	- sort by newest/oldest, name, or course
	- navigate paginated records for large datasets
	- approve pending records
	- export CSV
6. Approval endpoint generates and stores QR in DB.

## 5) Database Design

There are 3 main tables used by the backend code:

### 1. students

Columns used:

1. `id` (UUID as string)
2. `name`
3. `roll_no`
4. `course`
5. `year`
6. `email`
7. `phone`
8. `registered_at`
9. `qr_code` (nullable text)
10. `approved_at` (nullable timestamp, recommended for accurate approval metrics)

### 2. participants

Columns used:

1. `id` (UUID as string)
2. `name`
3. `roll_no`
4. `course`
5. `year`
6. `email`
7. `phone`
8. `registered_at`
9. `qr_code` (nullable text)
10. `approved_at` (nullable timestamp, recommended for accurate approval metrics)

### 3. participant_events

Columns used:

1. `participant_id` (FK-like relation to participants.id)
2. `event_id` (text id from frontend event list)

### Approval model

There is no separate `approved` column in DB.
Approval is derived in code as:

1. `approved = bool(qr_code)`

If `qr_code` exists, record is treated as approved.

For accurate "Approved Today" analytics, add `approved_at` to both `students` and `participants` tables via Supabase dashboard (nullable `timestamptz`).
The backend is backward compatible and will fall back to `registered_at` when `approved_at` is unavailable.
Use `backend/sql/add_approved_at_columns.sql` in Supabase SQL editor for quick setup.

## 6) Backend API Details

Base prefix: `/api`

### Public registration endpoints

1. `POST /api/register/student`
2. `GET /api/register/student/{student_id}/status`
3. `POST /api/register/participant`
4. `GET /api/register/participant/{participant_id}/status`

### Faculty endpoints

1. `POST /api/faculty/login`
2. `GET /api/faculty/students`
3. `GET /api/faculty/participants`
4. `POST /api/faculty/approve/student/{student_id}`
5. `POST /api/faculty/approve/participant/{participant_id}`
6. `POST /api/faculty/resend/student/{student_id}`
7. `POST /api/faculty/resend/participant/{participant_id}`
8. `DELETE /api/faculty/student/{student_id}`
9. `DELETE /api/faculty/participant/{participant_id}`
10. `GET /api/faculty/export/students`
11. `GET /api/faculty/export/participants`

Pagination query params for list endpoints:

1. `page` (default: `1`)
2. `page_size` (default: `25`, min: `5`, max: `100`)

### Health endpoint

1. `GET /health`

### Authorization rules

Faculty protected routes require header:

`Authorization: Bearer <FACULTY_PASSWORD>`

No JWT is used.

## 7) QR Code Logic

QR generation lives in `backend/qr_utils.py`.

How it works:

1. Build a JSON payload dictionary.
2. Convert to JSON string.
3. Render QR image in memory (no file write).
4. Encode PNG bytes to base64 string.
5. Save base64 string in DB `qr_code` column.
6. Frontend displays using:
	- `data:image/png;base64,<qr_code>`

Payload includes important identity and registration info.

## 8) Frontend Routing and Behavior

Routes configured in `frontend/src/App.jsx`:

1. `/` -> Home
2. `/participant/events` -> Event selection with rules modal
3. `/participant/register` -> Participant form
4. `/student/register` -> Student form
5. `/confirmation/:type/:id` -> Pending or QR display page
6. `/faculty/login` -> Faculty login page
7. `/faculty/dashboard` -> Faculty dashboard

Notable UI logic:

1. Event selection is enforced at max 2 in UI and backend.
2. Confirmation page re-checks backend status when QR is missing.
3. Faculty dashboard truncates QR text in table but stores full value in DB.
4. Faculty dashboard supports search by name, roll number, and email, plus quick sorting.
5. Faculty dashboard uses backend pagination for student and participant lists.

## 9) Environment Variables

Backend expects `.env` inside `cultural-fest/backend` with:

```env
SUPABASE_URL=...
SUPABASE_KEY=...
FACULTY_PASSWORD=...
FRONTEND_URL=http://localhost:5173
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=...
SMTP_USE_TLS=true
```

Notes:

1. CORS allows `FRONTEND_URL` and `http://localhost:5173`.
2. SMTP variables are used to send approval mail with QR on student approval.
3. Do not commit real secrets to git.

## 10) Local Development Setup

## Backend

```bash
cd cultural-fest/backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn python-dotenv supabase qrcode
uvicorn main:app --reload
```

Backend starts on: `http://127.0.0.1:8000`

## Frontend

```bash
cd cultural-fest/frontend
npm install
npm run dev
```

Frontend starts on: `http://localhost:5173`

Vite proxy forwards `/api/*` to backend at `127.0.0.1:8000` (see `frontend/vite.config.js`).

## Automated Checks

From project root, run:

```bash
npm run checks
```

This runs:

1. Frontend production build check
2. Backend Python syntax compile check
3. Optional `/health` smoke check (if backend is running)

## 11) Event Brief for Teacher and Organizing Team

Use this short explanation during planning meetings:

1. This is a full-stack cultural fest registration portal using React frontend, FastAPI backend, and Supabase database.
2. Student and participant registrations are first saved as pending records.
3. Faculty reviews pending records and approves from dashboard.
4. On approval, backend generates and stores QR code in database.
5. Participants/students open their confirmation page to view QR once approved.
6. Faculty can filter records and export CSV for event desk and reporting.

## 12) Event Operations Checklist (Practical)

### Before Event (1-2 days prior)

1. Verify backend is running and `/health` returns `{"status":"ok"}`.
2. Verify frontend registration pages open correctly.
3. Confirm `.env` values are correct:
	- `SUPABASE_URL`
	- `SUPABASE_KEY`
	- `FACULTY_PASSWORD`
	- `FRONTEND_URL`
4. Test one dummy student registration.
5. Test one dummy participant registration with 2 events.
6. Login as faculty and approve both test records.
7. Confirm QR appears on confirmation page after approval.
8. Test CSV export for students and participants.

### Event Day (operations desk)

1. Keep one laptop open on faculty dashboard.
2. Keep one laptop/mobile open for public registration flow.
3. Ask registrants to keep their confirmation URL or registration ID safe.
4. Faculty approves records in batches every few minutes.
5. Entry desk checks QR before allowing access.
6. Use CSV export periodically as backup attendance/report data.

### After Event

1. Export final students CSV.
2. Export final participants CSV.
3. Archive both CSV files for committee records.

## 13) Current Practical Notes

1. This implementation uses pending-then-approve flow (not instant QR on registration).
2. Faculty password is stored in sessionStorage on frontend so dashboard can call protected endpoints.
3. Event metadata and rules are static in frontend data file.

## 14) Quick Troubleshooting

If frontend cannot reach backend:

1. Confirm backend is running at `127.0.0.1:8000`.
2. Confirm Vite dev server is running.
3. Confirm `.env` variables exist and are correct.
4. Check browser devtools Network tab for failing `/api` calls.

If faculty API returns Unauthorized:

1. Ensure correct faculty password in `.env`.
2. Log out and login again on faculty page.
3. Verify Authorization header format is exactly `Bearer <password>`.

## 15) Arena.ai Handoff Context (Resume After Rate Limit)

Use this section when starting a new Arena.ai chat so it can continue from the exact current state.

### What Was Completed Recently

1. Pass generation was moved to template-based digital passes in `backend/pass_generator.py`.
2. Name rendering uses Nevara-first loading with fallback fonts.
3. Header branding placement (logo + college text) was tuned for the luxury template.
4. QR rendering was updated so the white QR plate and QR code fit inside the black QR box.
5. Faculty approval flow for student/participant is stable:
	- generates pass on approval
	- stores base64 pass in DB
	- sends approval email with QR

### What Is Still Pending

1. Faculty-side approval actions for volunteer and group registrations are not yet implemented.
	- Current volunteer/group routes support registration + status only.
2. Faculty dashboard currently focuses on student/participant lists.
	- volunteer/group management views and actions are pending.
3. CSV export for volunteer/group datasets is pending (if required by ops workflow).
4. Optional deployment hardening:
	- copy Nevara font into backend assets and load from backend-local path only.
	- this avoids dependency on frontend font path during deployment packaging.
5. Final micro-tuning of template text placements can still be done visually (pixel-level refinement).

### Exactly Where To Resume

1. `cultural-fest/backend/routes/volunteers.py`
	- has `/register/volunteer`, `/register/volunteer/{id}/status`,
	- has `/register/group-participant`, `/register/group/{id}/status`.
	- does not have faculty approve/resend/delete endpoints yet.
2. `cultural-fest/backend/routes/faculty.py`
	- currently has full student + participant approve/resend/delete/list/export flow.
	- add volunteer/group approve + resend + list + export flow here (or dedicated faculty-volunteer router).
3. `cultural-fest/backend/pass_generator.py`
	- `generate_volunteer_pass()` and `generate_group_pass()` already exist and can be wired into approval endpoints.
4. `cultural-fest/frontend/src/pages/FacultyDashboard.jsx`
	- add volunteer/group tabs, filters, approve actions, and optional export actions.
5. `cultural-fest/frontend/src/pages/Confirmation.jsx`
	- already supports pending messaging for volunteer/group; verify approved-state rendering after backend endpoints are added.

### Suggested Next Implementation Order

1. Add backend faculty list endpoints for volunteers/groups (paginated + summary).
2. Add backend faculty approve endpoints for volunteers/groups using existing pass generator functions.
3. Add resend email endpoints for volunteers/groups.
4. Add dashboard UI sections for volunteers/groups and wire approve/resend buttons.
5. Add CSV export endpoints for volunteers/groups (if needed by organizing committee).
6. Run end-to-end checks for all four user types: student, participant, volunteer, group.

### Quick Copy-Paste Prompt For New Arena.ai Chat

```text
Continue implementation for Izee-Culturals from current state.

Already done:
- Student/participant faculty approval flow works (approve + resend + CSV exports).
- Pass generator is template-based in cultural-fest/backend/pass_generator.py.
- Name uses Nevara-first font loading.
- Header placement and QR box fitting were tuned.

Pending:
1) Add faculty list + approve + resend (+ optional delete/export) endpoints for volunteers and group registrations.
2) Wire those APIs into FacultyDashboard UI with pagination/filter/search/sort parity.
3) Verify confirmation page approved-state for volunteer/group after approval endpoints are live.

Resume files:
- cultural-fest/backend/routes/volunteers.py
- cultural-fest/backend/routes/faculty.py
- cultural-fest/backend/pass_generator.py
- cultural-fest/frontend/src/pages/FacultyDashboard.jsx
- cultural-fest/frontend/src/pages/Confirmation.jsx

Do not change existing student/participant behavior.
Keep pending-then-approve model.
Keep API response shape: { success, data, message }.
```

