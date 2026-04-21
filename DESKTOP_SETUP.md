# IZee Got Talent — Local Desktop Setup

## Prerequisites
- **Node.js** 16+ (frontend)
- **Python** 3.11+ (backend)
- **npm** (comes with Node)

---

## Backend Setup

### 1. Install Python Dependencies
```bash
cd cultural-fest/backend
pip install -r requirements.txt
```

### 2. Create `.env` File
Create `cultural-fest/backend/.env` with these variables:

```
SUPABASE_URL=https://jbxewwmdqbcdybvzfsub.supabase.co
SUPABASE_KEY=sb_publishable_Vl48aq4T_zBA5anX1FSGPg_ehhbovhU
FACULTY_PASSWORD=Admin123
VOTING_JWT_SECRET=your-secret-voting-jwt-key-change-in-production
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=re_MeVNRHN3_8aukzjSZiiri1f6gkPEfqX3F
RESEND_FROM_EMAIL=IZee Got Talent <onboarding@resend.dev>
VERCEL_URL=http://localhost:3000
RAILWAY_ENVIRONMENT=development
```

### 3. Run Backend
```bash
cd cultural-fest/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend will be at: `http://localhost:8000`

---

## Frontend Setup

### 1. Install npm Dependencies
```bash
cd cultural-fest/frontend
npm install
```

### 2. Create `.env.production` (Optional, for Railway)
Create `cultural-fest/frontend/.env.production`:
```
VITE_API_URL=https://your-railway-backend-url.railway.app
```
For local dev, leave this out—Vite proxy handles it.

### 3. Run Frontend (Dev)
```bash
cd cultural-fest/frontend
npm run dev
```
Frontend will be at: `http://localhost:5173`

### 4. Build for Production
```bash
cd cultural-fest/frontend
npm run build
```
Output: `dist/` folder ready for Railway deployment.

---

## Running Both Simultaneously (Recommended)

### Option A: Two Terminal Tabs
**Terminal 1 (Backend):**
```bash
cd cultural-fest/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd cultural-fest/frontend
npm run dev
```

Then open: `http://localhost:5173`

### Option B: Single Terminal with Background Process
```bash
cd cultural-fest/backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
cd ../frontend && npm run dev
```

---

## Environment Variables Checklist

### Backend (`.env`)
- [ ] `SUPABASE_URL` — Database connection
- [ ] `SUPABASE_KEY` — Supabase public key
- [ ] `FACULTY_PASSWORD` — Admin login password
- [ ] `VOTING_JWT_SECRET` — JWT signing key
- [ ] `FRONTEND_URL` — Where React app is hosted (local: `http://localhost:5173`)
- [ ] `RESEND_API_KEY` — Email service API key
- [ ] `RESEND_FROM_EMAIL` — Email sender address
- [ ] `VERCEL_URL` — (optional, for Railway)
- [ ] `RAILWAY_ENVIRONMENT` — (optional, set to `development`)

### Frontend (`.env.production`)
- [ ] `VITE_API_URL` — Backend URL (only needed for production/Railway builds)

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Module Not Found Errors
```bash
# Reinstall dependencies
cd cultural-fest/backend && pip install --upgrade -r requirements.txt
cd ../frontend && rm -rf node_modules && npm install
```

### Backend Won't Connect to Database
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Check internet connection
- Ensure Supabase project is active

### Frontend Can't Reach Backend API
- Verify backend is running on `http://localhost:8000`
- Check `FRONTEND_URL=http://localhost:5173` is set in backend `.env`
- CORS is configured to allow `localhost:5173`

---

## API Endpoints (Backend Running)

- **Public Login**: `POST http://localhost:8000/api/voting/login`
- **Judge Scoring**: `POST http://localhost:8000/api/voting/judge/score`
- **Audience Voting**: `POST http://localhost:8000/api/voting/audience/vote`
- **Results**: `GET http://localhost:8000/api/voting/results`
- **Award Config**: `GET http://localhost:8000/api/voting/award-config`

---

## Pages to Test Locally

1. **Login**: `http://localhost:5173/voting/login`
2. **Judge Portal**: `http://localhost:5173/voting/judge`
3. **Audience Voting**: `http://localhost:5173/voting/audience`
4. **Winner Reveal**: `http://localhost:5173/reveal`
5. **Faculty Dashboard**: `http://localhost:5173/faculty/dashboard`

---

## Quick Start One-Liner (macOS/Linux)
```bash
(cd cultural-fest/backend && uvicorn main:app --reload --port 8000 &) && \
(cd cultural-fest/frontend && npm run dev)
```

Then open `http://localhost:5173` in your browser.
