from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from db import supabase
from qr_utils import generate_qr
import os
import csv
from io import StringIO

router = APIRouter()


class FacultyLoginRequest(BaseModel):
    password: str


def verify_faculty_token(authorization: str = Header(None)):
    """Verify faculty token from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        bearer_token = authorization.split(" ")[1]
    except (IndexError, AttributeError):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    faculty_password = os.getenv("FACULTY_PASSWORD")
    
    if bearer_token != faculty_password:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/faculty/login")
async def faculty_login(req: FacultyLoginRequest):
    """Faculty login endpoint."""
    faculty_password = os.getenv("FACULTY_PASSWORD")
    
    if req.password != faculty_password:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    return {
        "success": True,
        "data": {"token": "ok"},
        "message": "Login successful"
    }


@router.get("/faculty/students")
async def get_all_students(authorization: str = Header(None)):
    """Get all student registrations."""
    verify_faculty_token(authorization)
    
    try:
        response = supabase.table("students").select("*").order(
            "registered_at", desc=True
        ).execute()
        
        for student in response.data:
            student["approved"] = bool(student.get("qr_code"))

        return {
            "success": True,
            "data": response.data,
            "message": "Students retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/participants")
async def get_all_participants(authorization: str = Header(None)):
    """Get all participant registrations with their events."""
    verify_faculty_token(authorization)
    
    try:
        # Get all participants
        participants_response = supabase.table("participants").select("*").order(
            "registered_at", desc=True
        ).execute()
        
        participants = participants_response.data
        
        # For each participant, fetch their events
        for participant in participants:
            events_response = supabase.table("participant_events").select(
                "event_id"
            ).eq("participant_id", participant["id"]).execute()
            
            participant["events"] = [e["event_id"] for e in events_response.data]
            participant["approved"] = bool(participant.get("qr_code"))
        
        return {
            "success": True,
            "data": participants,
            "message": "Participants retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/faculty/approve/student/{student_id}")
async def approve_student(student_id: str, authorization: str = Header(None)):
    """Approve a student registration and generate QR code."""
    verify_faculty_token(authorization)

    try:
        student_response = supabase.table("students").select(
            "id, name, roll_no, course, year, email, phone, registered_at, qr_code"
        ).eq("id", student_id).limit(1).execute()

        if not student_response.data:
            raise HTTPException(status_code=404, detail="Student registration not found")

        student = student_response.data[0]
        existing_qr = student.get("qr_code")

        if existing_qr:
            return {
                "success": True,
                "data": {
                    "id": student_id,
                    "approved": True,
                    "qr_code": existing_qr,
                },
                "message": "Student already approved",
            }

        qr_payload = {
            "id": str(student.get("id")),
            "type": "student",
            "name": student.get("name"),
            "roll_no": student.get("roll_no"),
            "course": student.get("course"),
            "year": student.get("year"),
            "phone": student.get("phone"),
            "registered_at": str(student.get("registered_at")),
        }

        qr_code = generate_qr(qr_payload)
        supabase.table("students").update({"qr_code": qr_code}).eq("id", student_id).execute()

        return {
            "success": True,
            "data": {
                "id": student_id,
                "approved": True,
                "qr_code": qr_code,
            },
            "message": "Student approved successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/faculty/approve/participant/{participant_id}")
async def approve_participant(participant_id: str, authorization: str = Header(None)):
    """Approve a participant registration and generate QR code."""
    verify_faculty_token(authorization)

    try:
        participant_response = supabase.table("participants").select(
            "id, name, roll_no, course, year, email, phone, registered_at, qr_code"
        ).eq("id", participant_id).limit(1).execute()

        if not participant_response.data:
            raise HTTPException(status_code=404, detail="Participant registration not found")

        participant = participant_response.data[0]
        existing_qr = participant.get("qr_code")

        if existing_qr:
            return {
                "success": True,
                "data": {
                    "id": participant_id,
                    "approved": True,
                    "qr_code": existing_qr,
                },
                "message": "Participant already approved",
            }

        events_response = supabase.table("participant_events").select("event_id").eq(
            "participant_id", participant_id
        ).execute()
        event_ids = [event.get("event_id") for event in events_response.data]

        qr_payload = {
            "id": str(participant.get("id")),
            "type": "participant",
            "name": participant.get("name"),
            "roll_no": participant.get("roll_no"),
            "course": participant.get("course"),
            "year": participant.get("year"),
            "phone": participant.get("phone"),
            "events": event_ids,
            "registered_at": str(participant.get("registered_at")),
        }

        qr_code = generate_qr(qr_payload)
        supabase.table("participants").update({"qr_code": qr_code}).eq("id", participant_id).execute()

        return {
            "success": True,
            "data": {
                "id": participant_id,
                "approved": True,
                "qr_code": qr_code,
            },
            "message": "Participant approved successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/export/students")
async def export_students_csv(authorization: str = Header(None)):
    """Export all students as CSV."""
    verify_faculty_token(authorization)
    
    try:
        response = supabase.table("students").select("*").order(
            "registered_at", desc=True
        ).execute()
        
        students = response.data
        
        # Create CSV in memory
        output = StringIO()
        if students:
            writer = csv.DictWriter(output, fieldnames=students[0].keys())
            writer.writeheader()
            writer.writerows(students)
        
        csv_content = output.getvalue()
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=students.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/export/participants")
async def export_participants_csv(authorization: str = Header(None)):
    """Export all participants as CSV with events."""
    verify_faculty_token(authorization)
    
    try:
        # Get all participants
        participants_response = supabase.table("participants").select("*").order(
            "registered_at", desc=True
        ).execute()
        
        participants = participants_response.data
        
        # For each participant, fetch their events
        for participant in participants:
            events_response = supabase.table("participant_events").select(
                "event_id"
            ).eq("participant_id", participant["id"]).execute()
            
            event_ids = [e["event_id"] for e in events_response.data]
            participant["events"] = ", ".join(event_ids)
        
        # Create CSV in memory
        output = StringIO()
        if participants:
            writer = csv.DictWriter(output, fieldnames=participants[0].keys())
            writer.writeheader()
            writer.writerows(participants)
        
        csv_content = output.getvalue()
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=participants.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
