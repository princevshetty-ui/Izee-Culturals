import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

def require_env(name: str) -> str:
	value = os.getenv(name)
	if not value:
		raise RuntimeError(f"Missing required environment variable: {name}")
	return value


SUPABASE_URL = require_env('SUPABASE_URL')
SUPABASE_KEY = require_env('SUPABASE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
