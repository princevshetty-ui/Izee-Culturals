from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from db import supabase
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
    """Register a student and mark as pending until faculty approval."""
    try:
        student_id = str(uuid.uuid4())
        
        # Insert into students table
        registered_at = datetime.utcnow().isoformat()
        supabase.table("students").insert({
            "id": student_id,
            "name": req.name,
            "roll_no": req.roll_no,
            "course": req.course,
            "year": req.year,
            "email": req.email,
            "phone": req.phone,
            "registered_at": registered_at,
            "qr_code": None,
        }).execute()
        
        return {
            "success": True,
            "data": {
                "id": student_id,
                "approved": False,
                "qr_code": None,
            },
            "message": "Registration submitted for faculty approval"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/register/student/{student_id}/status")
async def get_student_status(student_id: str):
    """Public endpoint to check student approval and QR status."""
    try:
        response = supabase.table("students").select(
            "id, name, roll_no, course, year, email, phone, registered_at, qr_code"
        ).eq("id", student_id).limit(1).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Student registration not found")

        student = response.data[0]
        approved = bool(student.get("qr_code"))

        return {
            "success": True,
            "data": {
                **student,
                "approved": approved,
            },
            "message": "Student registration status retrieved successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
