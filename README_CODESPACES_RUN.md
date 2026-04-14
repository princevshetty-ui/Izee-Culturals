# Izee-Culturals Codespaces Run Guide

Use this guide when you create a brand-new GitHub Codespace and want the app running fast with exact commands.

## 1) Open a new Codespace

1. Open the repository in GitHub.
2. Click Code -> Codespaces -> Create codespace on current branch.
3. Wait until terminal is ready.

The repo path should be:

```bash
/workspaces/Izee-Culturals
```

## 2) Backend setup (Terminal 1)

Run these commands exactly:

```bash
cd /workspaces/Izee-Culturals/cultural-fest/backend
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install fastapi uvicorn python-dotenv supabase qrcode pypng
```

Create backend environment file:

```bash
cat > .env << 'EOF'
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_KEY=YOUR_SUPABASE_KEY
FACULTY_PASSWORD=YOUR_FACULTY_PASSWORD
FRONTEND_URL=http://localhost:5173
SMTP_HOST=YOUR_SMTP_HOST
SMTP_PORT=587
SMTP_USER=YOUR_SMTP_USER
SMTP_PASSWORD=YOUR_SMTP_PASSWORD
SMTP_FROM_EMAIL=YOUR_FROM_EMAIL
SMTP_USE_TLS=true
EOF
```

Start backend server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 3) Frontend setup (Terminal 2)

Open a second terminal and run:

```bash
cd /workspaces/Izee-Culturals/cultural-fest/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## 4) Open the app in Codespaces

1. In the Ports tab, ensure these ports are running:
   1. 5173 (frontend)
   2. 8000 (backend)
2. Open the forwarded URL for port 5173.

## 5) Quick verification commands

Backend health check:

```bash
curl http://127.0.0.1:8000/health
```

Expected output:

```json
{"status":"ok"}
```

Optional project checks from repo root:

```bash
cd /workspaces/Izee-Culturals
npm install
npm run checks
```

## 6) Daily restart commands (next time)

When Codespace already has dependencies installed:

Backend (Terminal 1):

```bash
cd /workspaces/Izee-Culturals/cultural-fest/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend (Terminal 2):

```bash
cd /workspaces/Izee-Culturals/cultural-fest/frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

## 7) Common issues and fixes

1. Error: Missing required environment variable
Fix: Check .env in backend folder and verify FACULTY_PASSWORD, SUPABASE_URL, SUPABASE_KEY.

2. Frontend cannot call API
Fix: Confirm backend is running on port 8000 and returns health ok.

3. Permission or package errors in Python install
Fix: Ensure venv is activated before pip install.

4. Port not visible in browser
Fix: Open the Ports panel and open forwarded port 5173 URL.
