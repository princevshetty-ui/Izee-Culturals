from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from db import supabase
from qr_utils import generate_qr
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
    """Register a participant for competition."""
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
            "registered_at": registered_at
        }).execute()
        
        # Insert each event into participant_events table
        for event_id in req.events:
            supabase.table("participant_events").insert({
                "participant_id": participant_id,
                "event_id": event_id
            }).execute()
        
        # Generate QR code with full participant details
        qr_data = {
            "id": participant_id,
            "type": "participant",
            "name": req.name,
            "roll_no": req.roll_no,
            "course": req.course,
            "year": req.year,
            "phone": req.phone,
            "events": req.events,
            "registered_at": registered_at
        }
        qr_code = generate_qr(qr_data)
        
        # Update participant record with QR code
        supabase.table("participants").update({
            "qr_code": qr_code
        }).eq("id", participant_id).execute()
        
        return {
            "success": True,
            "data": {
                "id": participant_id,
                "qr_code": qr_code
            },
            "message": "Registered successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
