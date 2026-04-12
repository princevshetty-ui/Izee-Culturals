from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from db import supabase
import uuid

router = APIRouter()


class ParticipantRegisterRequest(BaseModel):
    name: str
    roll_no: str
    course: str
    year: str
    email: str
    phone: str
    events: list[str]


@router.post("/register/participant")
async def register_participant(req: ParticipantRegisterRequest):
    """Register a participant and mark as pending until faculty approval."""
    try:
        # Validate events length
        if len(req.events) > 2:
            raise HTTPException(
                status_code=400,
                detail="Maximum 2 events allowed per participant"
            )
        
        if len(req.events) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least 1 event must be selected"
            )
        
        participant_id = str(uuid.uuid4())
        
        # Insert into participants table
        registered_at = datetime.utcnow().isoformat()
        supabase.table("participants").insert({
            "id": participant_id,
            "name": req.name,
            "roll_no": req.roll_no,
            "course": req.course,
            "year": req.year,
            "email": req.email,
            "phone": req.phone,
            "registered_at": registered_at,
            "qr_code": None,
        }).execute()
        
        # Insert each event into participant_events table
        for event_id in req.events:
            supabase.table("participant_events").insert({
                "participant_id": participant_id,
                "event_id": event_id
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
    """Public endpoint to check participant approval and QR status."""
    try:
        participant_response = supabase.table("participants").select(
            "id, name, roll_no, course, year, email, phone, registered_at, qr_code"
        ).eq("id", participant_id).limit(1).execute()

        if not participant_response.data:
            raise HTTPException(status_code=404, detail="Participant registration not found")

        participant = participant_response.data[0]
        events_response = supabase.table("participant_events").select("event_id").eq(
            "participant_id", participant_id
        ).execute()
        events = [event["event_id"] for event in events_response.data]
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
