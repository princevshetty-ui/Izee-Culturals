from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")


def validate_startup_env() -> None:
    required = ["FACULTY_PASSWORD"]
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"Missing required environment variable(s): {', '.join(missing)}")


validate_startup_env()

from routes import students, participants, faculty, volunteers
from routers import voting

app = FastAPI(title="Cultural Fest API")

# Build allowed origins list
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# Add production URLs from environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
if FRONTEND_URL:
    ALLOWED_ORIGINS.append(FRONTEND_URL)
    # Also add without trailing slash if present
    ALLOWED_ORIGINS.append(FRONTEND_URL.rstrip("/"))

# Add Railway preview URLs pattern
VERCEL_URL = os.getenv("VERCEL_URL", "")
if VERCEL_URL:
    ALLOWED_ORIGINS.append(f"https://{VERCEL_URL}")

# Hardcode the known Railway frontend URL as fallback
RAILWAY_FRONTEND = os.getenv(
    "RAILWAY_FRONTEND_URL",
    "https://izee-culturals-frontend-production.up.railway.app"
)
ALLOWED_ORIGINS.append(RAILWAY_FRONTEND)

# Remove duplicates
ALLOWED_ORIGINS = list(set(ALLOWED_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

print(f"[CORS] Allowed origins: {ALLOWED_ORIGINS}")

# Include route routers
app.include_router(students.router, prefix="/api")
app.include_router(participants.router, prefix="/api")
app.include_router(volunteers.router, prefix="/api")
app.include_router(faculty.router, prefix="/api")
app.include_router(voting.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}