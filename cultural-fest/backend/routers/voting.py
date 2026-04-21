from datetime import datetime, timedelta, timezone
import os
import uuid as uuid_module
from typing import Any
import bcrypt

from fastapi import APIRouter, Header, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel

from db import supabase
from routes.faculty import verify_faculty_token

router = APIRouter()
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 12
ALLOWED_VOTER_ROLES = {"judge", "staff", "student"}


class VotingLoginRequest(BaseModel):
    roll_no: str
    password: str


class JudgeScoreRequest(BaseModel):
    performance_id: str
    score: float
    idempotency_key: str


class AudienceVoteRequest(BaseModel):
    performance_id: str
    category_id: str
    idempotency_key: str


class VotingConfigPatchRequest(BaseModel):
    voting_open: bool | None = None
    judge_weight: float | None = None
    audience_weight: float | None = None
    reveal_triggered: bool | None = None


class AwardConfigPatchRequest(BaseModel):
    award_label: str


class StudentImportResponse(BaseModel):
    imported: int
    skipped: int


class PerformanceCreateRequest(BaseModel):
    title: str
    performer_name: str
    category_id: str
    category_label: str
    event_id: str
    event_name: str


class PerformancePatchRequest(BaseModel):
    is_withdrawn: bool | None = None
    is_active: bool | None = None


class VoterCreateRequest(BaseModel):
    name: str
    roll_no: str
    role: str
    password: str


def api_response(success: bool, data: Any, message: str) -> dict[str, Any]:
    return {
        "success": success,
        "data": data,
        "message": message,
    }


def _parse_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")

    parts = authorization.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return parts[1]


def _get_jwt_secret() -> str:
    secret = os.getenv("VOTING_JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="VOTING_JWT_SECRET is not configured")
    return secret


def _build_voter_token(voter_id: str, role: str, name: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "voter_id": voter_id,
        "role": role,
        "name": name,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXP_HOURS)).timestamp()),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def _decode_voter_token(token: str) -> dict[str, str]:
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    voter_id = str(payload.get("voter_id") or "").strip()
    role = str(payload.get("role") or "").strip().lower()
    name = str(payload.get("name") or "").strip()

    if not voter_id or role not in ALLOWED_VOTER_ROLES or not name:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return {
        "voter_id": voter_id,
        "role": role,
        "name": name,
    }


def _get_current_voter(authorization: str | None) -> dict[str, str]:
    token = _parse_bearer_token(authorization)
    return _decode_voter_token(token)


def _authorize_voter_or_faculty(authorization: str | None) -> dict[str, str]:
    token = _parse_bearer_token(authorization)
    faculty_password = os.getenv("FACULTY_PASSWORD")

    if faculty_password and token == faculty_password:
        return {
            "auth_type": "faculty",
            "role": "faculty",
            "name": "Faculty",
            "voter_id": "",
        }

    voter = _decode_voter_token(token)
    return {
        "auth_type": "voter",
        **voter,
    }


def _ensure_role(voter: dict[str, str], allowed_roles: set[str]) -> None:
    if voter.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden")


def _fetch_voting_config() -> dict[str, Any]:
    response = (
        supabase.table("voting_config")
        .select("*")
        .eq("id", 1)
        .limit(1)
        .execute()
    )
    config = (response.data or [])
    if not config:
        raise HTTPException(status_code=404, detail="Voting configuration not found")
    return config[0]


@router.post("/voting/login")
async def voting_login(req: VotingLoginRequest):
    response = (
        supabase.table("voters")
        .select("id, name, role, password_hash")
        .eq("roll_no", req.roll_no)
        .limit(1)
        .execute()
    )
    voters = response.data or []

    if not voters:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    voter = voters[0]
    role = str(voter.get("role") or "").strip().lower()
    if role not in ALLOWED_VOTER_ROLES:
        raise HTTPException(status_code=403, detail="Role is not allowed for voting")

    password_hash = str(voter.get("password_hash") or "")
    try:
        password_ok = bcrypt.checkpw(req.password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        password_ok = False

    if not password_ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _build_voter_token(
        voter_id=str(voter.get("id")),
        role=role,
        name=str(voter.get("name") or ""),
    )

    return api_response(
        True,
        {
            "token": token,
            "voter": {
                "voter_id": str(voter.get("id")),
                "role": role,
                "name": str(voter.get("name") or ""),
            },
        },
        "Voting login successful",
    )


@router.get("/voting/config")
async def get_voting_config():
    config = _fetch_voting_config()
    return api_response(True, config, "Voting config fetched")


@router.post("/voting/config")
async def post_voting_config_alias():
    # Compatibility alias for POST-based smoke checks.
    config = _fetch_voting_config()
    return api_response(True, config, "Voting config fetched")


@router.get("/voting/performances")
async def get_voting_performances(authorization: str | None = Header(None)):
    auth_context = _authorize_voter_or_faculty(authorization)

    query = supabase.table("performances").select("*")
    if auth_context.get("auth_type") != "faculty":
        query = query.eq("is_active", True).eq("is_withdrawn", False)

    response = query.order("created_at").execute()
    message = "Performances fetched" if auth_context.get("auth_type") == "faculty" else "Active performances fetched"
    return api_response(True, response.data or [], message)


@router.patch("/faculty/voting/config")
async def patch_voting_config(req: VotingConfigPatchRequest, authorization: str | None = Header(None)):
    verify_faculty_token(authorization)

    updates: dict[str, Any] = {}
    if req.voting_open is not None:
        updates["voting_open"] = req.voting_open
    if req.judge_weight is not None:
        updates["judge_weight"] = req.judge_weight
    if req.audience_weight is not None:
        updates["audience_weight"] = req.audience_weight
    if req.reveal_triggered is not None:
        updates["reveal_triggered"] = req.reveal_triggered

    if not updates:
        raise HTTPException(status_code=400, detail="No config fields provided")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = (
        supabase.table("voting_config")
        .update(updates)
        .eq("id", 1)
        .execute()
    )
    updated_rows = response.data or []
    if not updated_rows:
        updated_rows = [_fetch_voting_config()]

    return api_response(True, updated_rows[0], "Voting config updated")


@router.post("/faculty/voting/performance")
async def create_voting_performance(req: PerformanceCreateRequest, authorization: str | None = Header(None)):
    verify_faculty_token(authorization)

    payload = {
        "title": req.title.strip(),
        "performer_name": req.performer_name.strip(),
        "category_id": req.category_id.strip(),
        "category_label": req.category_label.strip(),
        "event_id": req.event_id.strip(),
        "event_name": req.event_name.strip(),
    }

    response = supabase.table("performances").insert(payload).execute()
    rows = response.data or []
    return api_response(True, rows[0] if rows else payload, "Performance created")


@router.patch("/faculty/voting/performance/{performance_id}")
async def patch_voting_performance(
    performance_id: str,
    req: PerformancePatchRequest,
    authorization: str | None = Header(None),
):
    verify_faculty_token(authorization)

    updates: dict[str, Any] = {}
    if req.is_withdrawn is not None:
        updates["is_withdrawn"] = req.is_withdrawn
    if req.is_active is not None:
        updates["is_active"] = req.is_active

    if not updates:
        raise HTTPException(status_code=400, detail="No performance fields provided")

    response = (
        supabase.table("performances")
        .update(updates)
        .eq("id", performance_id)
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Performance not found")

    return api_response(True, rows[0], "Performance updated")


@router.post("/faculty/voting/voter")
async def create_voter(req: VoterCreateRequest, authorization: str | None = Header(None)):
    verify_faculty_token(authorization)

    normalized_role = req.role.strip().lower()
    if normalized_role not in ALLOWED_VOTER_ROLES:
        raise HTTPException(status_code=422, detail="Role must be judge, staff, or student")

    password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    payload = {
        "name": req.name.strip(),
        "roll_no": req.roll_no.strip(),
        "role": normalized_role,
        "password_hash": password_hash,
    }

    try:
        response = supabase.table("voters").insert(payload).execute()
    except Exception as exc:
        message = str(exc)
        if "voters_roll_no_key" in message or "duplicate" in message.lower():
            raise HTTPException(status_code=409, detail="Voter with this roll number already exists")
        raise

    rows = response.data or []
    created = rows[0] if rows else payload
    created.pop("password_hash", None)
    return api_response(True, created, "Voter created")


@router.get("/faculty/voting/voters")
async def list_voters(authorization: str | None = Header(None)):
    verify_faculty_token(authorization)

    response = (
        supabase.table("voters")
        .select("id, name, roll_no, role, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return api_response(True, response.data or [], "Voters fetched")


@router.delete("/faculty/voting/voter/{voter_id}")
async def delete_voter(voter_id: str, authorization: str | None = Header(None)):
    verify_faculty_token(authorization)

    response = (
        supabase.table("voters")
        .delete()
        .eq("id", voter_id)
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Voter not found")

    deleted = rows[0]
    deleted.pop("password_hash", None)
    return api_response(True, deleted, "Voter deleted")


@router.post("/voting/judge/score")
async def submit_judge_score(req: JudgeScoreRequest, authorization: str | None = Header(None)):
    voter = _get_current_voter(authorization)
    _ensure_role(voter, {"judge"})

    if req.score < 0 or req.score > 100:
        raise HTTPException(status_code=422, detail="Score must be between 0 and 100")

    existing_key = (
        supabase.table("judge_scores")
        .select("id")
        .eq("idempotency_key", req.idempotency_key)
        .limit(1)
        .execute()
    )
    if existing_key.data:
        return api_response(True, {"skipped": True}, "Duplicate idempotency key; request skipped")

    # TODO: block self-votes by checking if the judge belongs to the same performance team.
    payload = {
        "judge_id": voter["voter_id"],
        "performance_id": req.performance_id,
        "score": req.score,
        "idempotency_key": req.idempotency_key,
    }

    try:
        response = (
            supabase.table("judge_scores")
            .upsert(payload, on_conflict="judge_id,performance_id")
            .execute()
        )
    except Exception as exc:
        message = str(exc)
        if "idempotency_key" in message and "duplicate" in message.lower():
            return api_response(True, {"skipped": True}, "Duplicate idempotency key; request skipped")
        raise

    rows = response.data or []
    return api_response(True, rows[0] if rows else payload, "Judge score saved")


@router.post("/voting/audience/vote")
async def submit_audience_vote(req: AudienceVoteRequest, authorization: str | None = Header(None)):
    voter = _get_current_voter(authorization)
    _ensure_role(voter, {"staff", "student"})

    existing_key = (
        supabase.table("audience_votes")
        .select("id")
        .eq("idempotency_key", req.idempotency_key)
        .limit(1)
        .execute()
    )
    if existing_key.data:
        return api_response(True, {"skipped": True}, "Duplicate idempotency key; request skipped")

    existing_category_vote = (
        supabase.table("audience_votes")
        .select("id")
        .eq("voter_id", voter["voter_id"])
        .eq("category_id", req.category_id)
        .limit(1)
        .execute()
    )
    if existing_category_vote.data:
        raise HTTPException(status_code=409, detail="You have already voted in this category")

    payload = {
        "voter_id": voter["voter_id"],
        "performance_id": req.performance_id,
        "category_id": req.category_id,
        "idempotency_key": req.idempotency_key,
    }

    try:
        response = supabase.table("audience_votes").insert(payload).execute()
    except Exception as exc:
        message = str(exc)
        if "idempotency_key" in message and "duplicate" in message.lower():
            return api_response(True, {"skipped": True}, "Duplicate idempotency key; request skipped")
        if "audience_votes_unique" in message:
            raise HTTPException(status_code=409, detail="You have already voted in this category")
        raise

    rows = response.data or []
    return api_response(True, rows[0] if rows else payload, "Audience vote saved")


@router.get("/voting/results")
async def get_voting_results(authorization: str | None = Header(None)):
    # Public endpoint - no auth required for reveal display

    config = _fetch_voting_config()
    judge_weight = float(config.get("judge_weight") or 0.8)
    audience_weight = float(config.get("audience_weight") or 0.2)

    performances_response = (
        supabase.table("performances")
        .select("*")
        .eq("is_active", True)
        .eq("is_withdrawn", False)
        .execute()
    )
    performances = performances_response.data or []

    performance_ids = [str(item.get("id")) for item in performances if item.get("id")]

    judge_scores = []
    audience_votes = []
    if performance_ids:
        judge_scores_response = (
            supabase.table("judge_scores")
            .select("performance_id, score")
            .in_("performance_id", performance_ids)
            .execute()
        )
        judge_scores = judge_scores_response.data or []

        audience_votes_response = (
            supabase.table("audience_votes")
            .select("performance_id, category_id")
            .in_("performance_id", performance_ids)
            .execute()
        )
        audience_votes = audience_votes_response.data or []

    judge_score_buckets: dict[str, list[float]] = {}
    for item in judge_scores:
        performance_id = str(item.get("performance_id") or "")
        if not performance_id:
            continue
        judge_score_buckets.setdefault(performance_id, []).append(float(item.get("score") or 0))

    team_votes: dict[str, int] = {}
    total_category_votes: dict[str, int] = {}
    for item in audience_votes:
        performance_id = str(item.get("performance_id") or "")
        category_id = str(item.get("category_id") or "")
        if not performance_id or not category_id:
            continue

        team_votes[performance_id] = team_votes.get(performance_id, 0) + 1
        total_category_votes[category_id] = total_category_votes.get(category_id, 0) + 1

    grouped: dict[str, dict[str, Any]] = {}
    for performance in performances:
        performance_id = str(performance.get("id") or "")
        category_id = str(performance.get("category_id") or "")
        category_label = str(performance.get("category_label") or category_id)

        judge_values = judge_score_buckets.get(performance_id, [])
        avg_judge_score = sum(judge_values) / len(judge_values) if judge_values else 0.0

        votes_for_team = team_votes.get(performance_id, 0)
        votes_for_category = total_category_votes.get(category_id, 0)
        audience_component = 0.0
        if votes_for_category > 0:
            audience_component = (votes_for_team / votes_for_category) * 100.0 * audience_weight

        final_score = (avg_judge_score * judge_weight) + audience_component

        grouped.setdefault(
            category_id,
            {
                "category_id": category_id,
                "category_label": category_label,
                "performances": [],
            },
        )

        grouped[category_id]["performances"].append(
            {
                "id": performance_id,
                "title": performance.get("title"),
                "performer_name": performance.get("performer_name"),
                "event_id": performance.get("event_id"),
                "event_name": performance.get("event_name"),
                "avg_judge_score": round(avg_judge_score, 4),
                "team_votes": votes_for_team,
                "total_category_votes": votes_for_category,
                "audience_component": round(audience_component, 4),
                "final_score": round(final_score, 4),
            }
        )

    category_results = list(grouped.values())
    for category in category_results:
        category["performances"].sort(key=lambda row: row["final_score"], reverse=True)

    category_results.sort(key=lambda row: row["category_label"])

    return api_response(
        True,
        {
            "weights": {
                "judge_weight": judge_weight,
                "audience_weight": audience_weight,
            },
            "categories": category_results,
        },
        "Voting results calculated",
    )


@router.get("/voting/award-config")
async def get_award_config_public():
    try:
        response = supabase.table("award_config").select("*").execute()
        return api_response(True, response.data or [], "OK")
    except Exception as e:
        return api_response(False, [], str(e))


@router.get("/faculty/voting/award-config")
async def get_award_config_admin(authorization: str | None = Header(None)):
    verify_faculty_token(authorization)
    try:
        response = supabase.table("award_config").select("*").execute()
        return api_response(True, response.data or [], "OK")
    except Exception as e:
        return api_response(False, [], str(e))


@router.patch("/faculty/voting/award-config/{category_id}")
async def update_award_config(
    category_id: str,
    body: AwardConfigPatchRequest,
    authorization: str | None = Header(None),
):
    verify_faculty_token(authorization)
    try:
        response = (
            supabase.table("award_config")
            .update({"award_label": body.award_label})
            .eq("category_id", category_id)
            .execute()
        )
        return api_response(True, response.data, "Updated")
    except Exception as e:
        return api_response(False, None, str(e))


@router.post("/faculty/voting/import-students")
async def import_students(authorization: str | None = Header(None)):
    verify_faculty_token(authorization)
    try:
        students_res = (
            supabase.table("students")
            .select("id, name, roll_no")
            .not_.is_("approved_at", "null")
            .not_.is_("qr_code", "null")
            .execute()
        )
        students = students_res.data or []
        imported = 0
        skipped = 0

        for s in students:
            sid = str(s.get("id") or "")
            qr_id = sid.replace("-", "")[:8]
            roll = str(s.get("roll_no") or "")

            existing = (
                supabase.table("voters")
                .select("id")
                .eq("roll_no", roll)
                .execute()
            )
            if existing.data:
                skipped += 1
                continue

            pw_hash = bcrypt.hashpw(qr_id.encode(), bcrypt.gensalt()).decode()

            supabase.table("voters").insert(
                {
                    "id": str(uuid_module.uuid4()),
                    "name": str(s.get("name") or ""),
                    "roll_no": roll,
                    "role": "student",
                    "password_hash": pw_hash,
                }
            ).execute()
            imported += 1

        return api_response(
            True,
            {"imported": imported, "skipped": skipped},
            f"{imported} imported, {skipped} skipped",
        )
    except Exception as e:
        return api_response(False, None, str(e))
