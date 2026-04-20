from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
from db import supabase
from utils.duplicate_check import check_duplicate_roll
from utils.input_validation import is_valid_roll_no, normalize_full_name, normalize_roll_no
import uuid

router = APIRouter()


class StudentRegisterRequest(BaseModel):
    name: str
    roll_no: str
    course: str
    year: str
    email: str
    phone: str | None = None


@router.post("/register/student")
async def register_student(req: StudentRegisterRequest):
    """Register a student and mark as pending until faculty approval."""
    try:
        normalized_name = normalize_full_name(req.name)
        normalized_roll_no = normalize_roll_no(req.roll_no)

        if not normalized_name:
            raise HTTPException(status_code=400, detail="Name is required")
        if not is_valid_roll_no(normalized_roll_no):
            raise HTTPException(status_code=400, detail="Roll No must be 12 alphanumeric characters")

        # Check for duplicate roll number
        duplicate = await check_duplicate_roll(supabase, normalized_roll_no)
        if duplicate["is_duplicate"]:
            return JSONResponse(status_code=400, content={
                "success": False,
                "message": "This roll number is already registered."
            })
        
        student_id = str(uuid.uuid4())
        
        # Insert into students table
        registered_at = datetime.utcnow().isoformat()
        supabase.table("students").insert({
            "id": student_id,
            "name": normalized_name,
            "roll_no": normalized_roll_no,
            "course": req.course,
            "year": req.year,
            "email": req.email,
            "phone": (req.phone or "").strip(),
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
    
    except HTTPException:
        raise
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
