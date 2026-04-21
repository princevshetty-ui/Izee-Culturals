from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
from db import supabase
from utils.input_validation import is_valid_roll_no, normalize_full_name, normalize_roll_no
import uuid

router = APIRouter()

INDIVIDUAL_CATEGORY = "individual"
GROUP_CATEGORY = "group"
GROUP_EVENT_IDS = {"singing-band", "dance-crew"}


class EventSelection(BaseModel):
    event_id: str
    event_name: str
    category_id: str | None = None
    category_label: str | None = None
    is_group: bool = False


class ParticipantRegisterRequest(BaseModel):
    name: str
    roll_no: str
    course: str
    year: str
    email: str
    phone: str | None = None
    events: list[EventSelection]
    others_selected: bool = False
    others_description: str | None = None


def resolve_event_category(event: EventSelection) -> str:
    event_id = str(event.event_id or "").strip().lower()
    if event.is_group or event_id in GROUP_EVENT_IDS:
        return GROUP_CATEGORY
    return INDIVIDUAL_CATEGORY


def fetch_existing_participant_categories(roll_no: str) -> set[str]:
    existing_participants = (
        supabase.table("participants")
        .select("id")
        .eq("roll_no", roll_no)
        .execute()
    )

    participant_ids = [row.get("id") for row in (existing_participants.data or []) if row.get("id")]
    if not participant_ids:
        return set()

    existing_events = (
        supabase.table("participant_events")
        .select("event_id")
        .in_("participant_id", participant_ids)
        .execute()
    )

    categories: set[str] = set()
    for row in (existing_events.data or []):
        event_id = str(row.get("event_id") or "").strip().lower()
        if event_id in GROUP_EVENT_IDS:
            categories.add(GROUP_CATEGORY)
        else:
            categories.add(INDIVIDUAL_CATEGORY)

    group_leader_registration = (
        supabase.table("group_registrations")
        .select("id")
        .eq("leader_roll_no", roll_no)
        .limit(1)
        .execute()
    )
    if group_leader_registration.data:
        categories.add(GROUP_CATEGORY)

    group_member_registration = (
        supabase.table("group_members")
        .select("id")
        .eq("roll_no", roll_no)
        .limit(1)
        .execute()
    )
    if group_member_registration.data:
        categories.add(GROUP_CATEGORY)

    return categories


@router.post("/register/participant")
async def register_participant(req: ParticipantRegisterRequest):
    """Register a participant and mark as pending until faculty approval."""
    try:
        normalized_name = normalize_full_name(req.name)
        normalized_roll_no = normalize_roll_no(req.roll_no)

        if not normalized_name:
            raise HTTPException(status_code=400, detail="Name is required")
        if not is_valid_roll_no(normalized_roll_no):
            raise HTTPException(status_code=400, detail="Roll No must be 12 alphanumeric characters")

        # Validate selections
        event_count = len(req.events)

        if event_count < 1:
            raise HTTPException(
                status_code=400,
                detail="Select at least 1 event or choose Others"
            )

        if event_count > 2:
            raise HTTPException(
                status_code=400,
                detail="Maximum 2 event slots allowed"
            )
        
        if req.others_selected and not (req.others_description or "").strip():
            raise HTTPException(
                status_code=400,
                detail="Please describe your talent for Others"
            )

        participant_id = str(uuid.uuid4())
        
        # Insert into participants table
        registered_at = datetime.utcnow().isoformat()
        supabase.table("participants").insert({
            "id": participant_id,
            "name": normalized_name,
            "roll_no": normalized_roll_no,
            "course": req.course,
            "year": req.year,
            "email": req.email,
            "phone": (req.phone or "").strip(),
            "registered_at": registered_at,
            "qr_code": None,
        }).execute()
        
        # Insert each event into participant_events table
        for event in req.events:
            supabase.table("participant_events").insert({
                "participant_id": participant_id,
                "event_id": event.event_id,
                "event_name": event.event_name,
                "category_id": event.category_id or "",
                "category_label": event.category_label or ""
            }).execute()
        
        # Insert Others if selected
        if req.others_selected:
            supabase.table("participant_events").insert({
                "participant_id": participant_id,
                "event_id": "others",
                "event_name": "Others",
                "category_id": "",
                "category_label": "Others",
                "others_description": req.others_description or ""
            }).execute()
        
        return {
            "success": True,
            "data": {
                "id": participant_id,
                "approved": False,
                "qr_code": None,
            },
            "message": "Registration submitted for faculty approval"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/register/participant/{participant_id}/status")
async def get_participant_status(participant_id: str):
    """
    Public endpoint to check participant approval and QR status.
    
    NOTE: participant_events table requires these columns (add in Supabase if missing):
      - event_name TEXT
      - category_id TEXT
      - category_label TEXT
      - others_description TEXT
    """
    try:
        participant_response = supabase.table("participants").select(
            "id, name, roll_no, course, year, email, phone, registered_at, qr_code"
        ).eq("id", participant_id).limit(1).execute()

        if not participant_response.data:
            raise HTTPException(status_code=404, detail="Participant registration not found")

        participant = participant_response.data[0]
        events_response = supabase.table("participant_events").select(
            "event_id, event_name, category_id, category_label, others_description"
        ).eq(
            "participant_id", participant_id
        ).execute()
        events = events_response.data  # Return full objects not just IDs
        approved = bool(participant.get("qr_code"))

        return {
            "success": True,
            "data": {
                **participant,
                "events": events,
                "approved": approved,
            },
            "message": "Participant registration status retrieved successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
