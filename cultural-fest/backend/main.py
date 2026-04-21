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

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

_frontend_url = os.getenv("FRONTEND_URL", "")
_vercel_url = os.getenv("VERCEL_URL", "")

if _frontend_url:
    ALLOWED_ORIGINS.append(_frontend_url)
    
if _vercel_url:
    if not _vercel_url.startswith("http"):
        ALLOWED_ORIGINS.append(f"https://{_vercel_url}")
    else:
        ALLOWED_ORIGINS.append(_vercel_url)

# Allow all *.app.github.dev domains (Codespaces)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.app\.github\.dev",
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include route routers
app.include_router(students.router, prefix="/api")
app.include_router(participants.router, prefix="/api")
app.include_router(volunteers.router, prefix="/api")
app.include_router(faculty.router, prefix="/api")
app.include_router(voting.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}