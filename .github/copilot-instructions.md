# Copilot Instructions — Cultural Fest Registration Portal

## Project Overview
College cultural fest registration system with 3 user types:
- Students (Audience): register as attendees
- Participants: register to compete in sub-events (max 2 events)
- Faculty (Cultural Committee): login to view and export reports

No admin role. No JWT or auth library needed.

## Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS + Framer Motion
- Backend: FastAPI (Python 3.11)
- Database: Supabase (PostgreSQL)
- QR generation: `qrcode` Python library, base64 encoded PNG
- Deploy: Vercel (frontend) + Railway (backend, always-on, no sleep)

## Design System
- Theme: Dark Luxury / Cultural Gala
- Background: #0A0A0A
- Accent: #C9A84C (warm gold)
- Text primary: #F5F0E8
- Text muted: rgba(245,240,232,0.45)
- Border gold: rgba(201,168,76,0.2)
- Border subtle: rgba(245,240,232,0.08)
- Display font: Cormorant Garamond (Google Fonts)
- Body font: DM Sans (Google Fonts)
- Hero glow: radial-gradient gold, low opacity CSS only
- Animations: Framer Motion for page transitions + rules modal
- Scroll reveals: IntersectionObserver fade-up, staggered on cards

## Routes (React Router v6)
- / → Home
- /participant/events → Event selection with rules modal
- /participant/register → Participant form
- /student/register → Student form
- /confirmation/:type/:id → QR receipt
- /faculty/login → Faculty login
- /faculty/dashboard → Reports dashboard

## Event Data
Stored in frontend/src/data/events.js as a static array.
Each event has: id, name, icon, category, rules (string array).
Events: Dance, Standup Comedy, Singing, Skit, Fashion Show, Rangoli, Face Painting.
Rules are hardcoded — no DB call needed for rules.

## Rules Modal Behavior
- Clicking an event card opens a slide-up modal (Framer Motion)
- Modal shows event name + rules list
- "Select this event" button at bottom confirms selection
- If 2 already selected: button is disabled with message "Max 2 events reached"
- Confirmed events get a gold checkmark on their card
- Modal closes on confirm or on backdrop click (if < 2 selected)

## Supabase Tables
students: id (uuid), name, roll_no, course, year, email, registered_at, qr_code (text, base64)
participants: id (uuid), name, roll_no, course, year, email, registered_at, qr_code (text, base64)
participant_events: id, participant_id (FK → participants.id), event_id (text)

## API Endpoints (FastAPI)
POST /api/register/student → { name, roll_no, course, year, email }
POST /api/register/participant → { name, roll_no, course, year, email, events: string[] }
POST /api/faculty/login → { password } → returns { token: "ok" } or 401
GET  /api/faculty/students → all student registrations
GET  /api/faculty/participants → all participant registrations with events
GET  /api/faculty/export/students → CSV download
GET  /api/faculty/export/participants → CSV download

## Faculty Auth
Single password stored in .env as FACULTY_PASSWORD.
No JWT. Frontend stores "authenticated: true" in sessionStorage on login.
Faculty routes check sessionStorage on mount, redirect to /faculty/login if not set.
Backend /api/faculty/* routes check Authorization header: Bearer <FACULTY_PASSWORD>.

## QR Code Generation
Generated in FastAPI after successful DB insert.
Encodes: JSON { "id": uuid, "type": "student"|"participant", "name": name }
Returned as base64 PNG string, stored in DB, displayed on /confirmation page.

## API Response Shape
{ "success": bool, "data": any, "message": string }

## Environment Variables
SUPABASE_URL, SUPABASE_KEY, FACULTY_PASSWORD, FRONTEND_URL, RAILWAY_ENVIRONMENT

## CORS
Allow: localhost:5173 and production Vercel URL (from FRONTEND_URL env var).

## Do NOT
- Use Redux (useState + useContext is enough)
- Use any CSS framework other than Tailwind
- Add JWT or any auth library
- Manage DB migrations via code (use Supabase dashboard)
- Add video or canvas animation backgrounds (performance on mobile)
- Use Render (use Railway — no sleep issue)
