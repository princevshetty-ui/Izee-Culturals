# REQUIRED SUPABASE TABLES:
#
# volunteers:
#   id          TEXT PRIMARY KEY
#   name        TEXT NOT NULL
#   roll_no     TEXT NOT NULL
#   course      TEXT NOT NULL
#   year        TEXT NOT NULL
#   email       TEXT NOT NULL
#   phone       TEXT NOT NULL
#   motivation  TEXT
#   team_id     TEXT  (null until faculty assigns)
#   team_label  TEXT  (null until faculty assigns)
#   registered_at TIMESTAMP
#   qr_code     TEXT  (null until approved)
#
# group_registrations:
#   id              TEXT PRIMARY KEY
#   team_name       TEXT NOT NULL
#   event_id        TEXT NOT NULL
#   event_name      TEXT NOT NULL
#   event_type      TEXT
#   category_id     TEXT
#   leader_name     TEXT NOT NULL
#   leader_roll_no  TEXT NOT NULL
#   leader_course   TEXT NOT NULL
#   leader_year     TEXT NOT NULL
#   leader_email    TEXT NOT NULL
#   leader_phone    TEXT NOT NULL
#   registered_at   TIMESTAMP
#   qr_code         TEXT  (null until approved)
#
# group_members:
#   id          TEXT PRIMARY KEY
#   group_id    TEXT NOT NULL (FK to group_registrations.id)
#   name        TEXT NOT NULL
#   roll_no     TEXT NOT NULL
#   course      TEXT NOT NULL
#   year        TEXT NOT NULL

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
from db import supabase
from utils.duplicate_check import check_duplicate_roll
import uuid
import re

router = APIRouter()


class VolunteerRegisterRequest(BaseModel):
    name: str
    roll_no: str
    course: str
    year: str
    email: str
    phone: str
    motivation: str | None = None


class GroupMember(BaseModel):
    name: str
    roll_no: str
    course: str
    year: str


class GroupRegisterRequest(BaseModel):
    team_name: str
    event_id: str
    event_name: str
    event_type: str | None = None
    category_id: str | None = None
    leader: dict
    members: list[GroupMember]


@router.post("/register/volunteer")
async def register_volunteer(req: VolunteerRegisterRequest):
    """Register a volunteer and mark as pending until faculty approval."""
    try:
        # Validations
        if not req.name.strip():
            raise HTTPException(status_code=400, detail="Name is required")
        if not req.roll_no.strip():
            raise HTTPException(status_code=400, detail="Roll No is required")
        if not req.course.strip():
            raise HTTPException(status_code=400, detail="Course is required")
        if not req.year.strip():
            raise HTTPException(status_code=400, detail="Year is required")
        if not req.email.strip() or '@' not in req.email or '.' not in req.email:
            raise HTTPException(status_code=400, detail="Valid email is required")
        if not re.match(r'^\d{10}$', req.phone.strip()):
            raise HTTPException(status_code=400, detail="Phone must be 10 digits")

        duplicate_check = await check_duplicate_roll(supabase, req.roll_no.strip())
        if duplicate_check["is_duplicate"]:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "This roll number is already registered. Please contact the coordinator if this is an error.",
                },
            )

        volunteer_id = str(uuid.uuid4())
        registered_at = datetime.utcnow().isoformat()

        # Insert into volunteers table
        supabase.table("volunteers").insert({
            "id": volunteer_id,
            "name": req.name.strip(),
            "roll_no": req.roll_no.strip(),
            "course": req.course.strip(),
            "year": req.year.strip(),
            "email": req.email.strip().lower(),
            "phone": req.phone.strip(),
            "motivation": req.motivation or "",
            "team_id": None,
            "team_label": None,
            "registered_at": registered_at,
            "qr_code": None
        }).execute()

        return {
            "success": True,
            "data": {
                "id": volunteer_id,
                "approved": False,
                "qr_code": None
            },
            "message": "Volunteer application submitted for faculty review"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/register/volunteer/{volunteer_id}/status")
async def get_volunteer_status(volunteer_id: str):
    """Public endpoint to check volunteer approval and QR status."""
    try:
        volunteer_response = supabase.table("volunteers").select(
            "id, name, roll_no, course, year, email, phone, motivation, team_id, team_label, registered_at, qr_code"
        ).eq("id", volunteer_id).limit(1).execute()

        if not volunteer_response.data:
            raise HTTPException(status_code=404, detail="Volunteer registration not found")

        volunteer = volunteer_response.data[0]
        approved = bool(volunteer.get("qr_code"))

        return {
            "success": True,
            "data": {
                **volunteer,
                "approved": approved
            },
            "message": "Volunteer status retrieved"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register/group-participant")
async def register_group(req: GroupRegisterRequest):
    """Register a group for an event and mark as pending until faculty approval."""
    try:
        # Validate team_name
        if not req.team_name.strip():
            raise HTTPException(status_code=400, detail="Team name is required")

        # Validate leader fields
        required_leader = ['name', 'roll_no', 'course', 'year', 'email', 'phone']
        for field in required_leader:
            if not req.leader.get(field, '').strip():
                raise HTTPException(status_code=400, detail=f"Leader {field} is required")

        # Validate members list
        if len(req.members) < 1:
            raise HTTPException(status_code=400, detail="At least 1 member is required")

        # Validate each member
        for idx, member in enumerate(req.members):
            if not member.name.strip():
                raise HTTPException(status_code=400, detail=f"Member {idx + 1} name is required")
            if not member.roll_no.strip():
                raise HTTPException(status_code=400, detail=f"Member {idx + 1} roll_no is required")
            if not member.course.strip():
                raise HTTPException(status_code=400, detail=f"Member {idx + 1} course is required")
            if not member.year.strip():
                raise HTTPException(status_code=400, detail=f"Member {idx + 1} year is required")

        group_id = str(uuid.uuid4())
        registered_at = datetime.utcnow().isoformat()

        # Insert into group_registrations
        supabase.table("group_registrations").insert({
            "id": group_id,
            "team_name": req.team_name.strip(),
            "event_id": req.event_id,
            "event_name": req.event_name,
            "event_type": req.event_type or "",
            "category_id": req.category_id or "",
            "leader_name": req.leader["name"].strip(),
            "leader_roll_no": req.leader["roll_no"].strip(),
            "leader_course": req.leader["course"].strip(),
            "leader_year": req.leader["year"].strip(),
            "leader_email": req.leader["email"].strip().lower(),
            "leader_phone": req.leader["phone"].strip(),
            "registered_at": registered_at,
            "qr_code": None
        }).execute()

        # Insert each member into group_members
        for member in req.members:
            member_id = str(uuid.uuid4())
            supabase.table("group_members").insert({
                "id": member_id,
                "group_id": group_id,
                "name": member.name.strip(),
                "roll_no": member.roll_no.strip(),
                "course": member.course.strip(),
                "year": member.year.strip()
            }).execute()

        return {
            "success": True,
            "data": {
                "id": group_id,
                "approved": False,
                "qr_code": None
            },
            "message": "Group registration submitted for faculty approval"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/register/group/{group_id}/status")
async def get_group_status(group_id: str):
    """Public endpoint to check group registration approval and QR status."""
    try:
        # Query group_registrations
        group_response = supabase.table("group_registrations").select(
            "id, team_name, event_id, event_name, event_type, category_id, leader_name, leader_roll_no, leader_course, leader_year, leader_email, leader_phone, registered_at, qr_code"
        ).eq("id", group_id).limit(1).execute()

        if not group_response.data:
            raise HTTPException(status_code=404, detail="Group registration not found")

        group = group_response.data[0]

        # Query group_members
        members_response = supabase.table("group_members").select(
            "id, name, roll_no, course, year"
        ).eq("group_id", group_id).execute()

        members = members_response.data or []
        approved = bool(group.get("qr_code"))

        return {
            "success": True,
            "data": {
                **group,
                "members": members,
                "approved": approved
            },
            "message": "Group registration status retrieved"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
