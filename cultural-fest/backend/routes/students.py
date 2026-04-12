from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from db import supabase
from qr_utils import generate_qr
import uuid

router = APIRouter()


class StudentRegisterRequest(BaseModel):
    name: str
    roll_no: str
    course: str
    year: str
    email: str
    phone: str


@router.post("/register/student")
async def register_student(req: StudentRegisterRequest):
    """Register a student (audience attendee)."""
    try:
        student_id = str(uuid.uuid4())
        
        # Insert into students table
        registered_at = datetime.utcnow().isoformat()
        response = supabase.table("students").insert({
            "id": student_id,
            "name": req.name,
            "roll_no": req.roll_no,
            "course": req.course,
            "year": req.year,
            "email": req.email,
            "phone": req.phone,
            "registered_at": registered_at
        }).execute()
        
        # Generate QR code with full student details
        qr_data = {
            "id": student_id,
            "type": "student",
            "name": req.name,
            "roll_no": req.roll_no,
            "course": req.course,
            "year": req.year,
            "phone": req.phone,
            "registered_at": registered_at
        }
        qr_code = generate_qr(qr_data)
        
        # Update student record with QR code
        supabase.table("students").update({
            "qr_code": qr_code
        }).eq("id", student_id).execute()
        
        return {
            "success": True,
            "data": {
                "id": student_id,
                "qr_code": qr_code
            },
            "message": "Registered successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
