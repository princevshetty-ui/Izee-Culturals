from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from db import supabase
from qr_utils import generate_qr
import os
import base64
import smtplib
import time
import csv
from io import StringIO
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

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


def fetch_with_retry(fetch_fn, attempts: int = 2, delay_seconds: float = 0.25):
    """Retry transient Supabase failures for dashboard list endpoints."""
    last_error = None
    for attempt in range(attempts):
        try:
            response = fetch_fn()
            if response is None or response.data is None:
                raise Exception("Supabase returned an empty response")
            return response
        except Exception as exc:
            last_error = exc
            if attempt < attempts - 1:
                time.sleep(delay_seconds)
    raise last_error


def send_approval_email(
        to_email: str,
        name: str,
        qr_code_base64: str,
        registration_id: str,
        user_type: str,
        events: list[str] | None = None,
):
        """Send approval email with branded HTML template and inline QR image."""
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user)
        smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}

        if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
                return False, "SMTP configuration missing"

        if not to_email:
                return False, "Recipient email missing"

        events_html = ""
        if events:
                rendered = "".join(f"<li style='margin-bottom:6px'>{event}</li>" for event in events)
                events_html = (
                        "<div style='margin-top:20px'>"
                        "<p style='margin:0 0 8px 0;font-size:14px;color:#F5F0E8'>Approved Events:</p>"
                        f"<ul style='margin:0;padding-left:20px;color:#F5F0E8;font-size:14px'>{rendered}</ul>"
                        "</div>"
                )

        html = f"""
        <html>
            <body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;color:#F5F0E8;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;background:#0A0A0A;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#111111;border:1px solid rgba(201,168,76,0.32);border-radius:14px;overflow:hidden;">
                                <tr>
                                    <td style="padding:22px 24px;background:linear-gradient(90deg,#0A0A0A,#181818);border-bottom:1px solid rgba(201,168,76,0.22)">
                                        <p style="margin:0;font-size:12px;letter-spacing:2px;color:#C9A84C">IZEE CULTURALS</p>
                                        <h1 style="margin:8px 0 0 0;font-size:24px;line-height:1.3;color:#F5F0E8">Registration Approved</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:24px;">
                                        <p style="margin:0 0 10px 0;font-size:15px;color:#F5F0E8">Hello {name},</p>
                                        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#F5F0E8">
                                            Your {user_type} registration has been approved by the Cultural Committee.
                                            Please carry the QR pass below during the event.
                                        </p>
                                        <p style="margin:0 0 16px 0;font-size:13px;color:#C9A84C">Registration ID: {registration_id}</p>
                                        <div style="display:inline-block;padding:10px;border-radius:10px;background:#0A0A0A;border:1px solid rgba(201,168,76,0.28)">
                                            <img src="cid:approval_qr" width="220" height="220" alt="QR Code" style="display:block" />
                                        </div>
                                        {events_html}
                                        <p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:#F5F0E8">
                                            Keep this email or take a screenshot of your QR code. It is required at entry.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
        """

        try:
                message = MIMEMultipart("related")
                message["Subject"] = "Izee Culturals - Registration Approved"
                message["From"] = smtp_from
                message["To"] = to_email

                alternative = MIMEMultipart("alternative")
                alternative.attach(MIMEText("Your registration has been approved. Please use the attached QR code.", "plain"))
                alternative.attach(MIMEText(html, "html"))
                message.attach(alternative)

                qr_bytes = base64.b64decode(qr_code_base64)
                qr_image = MIMEImage(qr_bytes, _subtype="png")
                qr_image.add_header("Content-ID", "<approval_qr>")
                qr_image.add_header("Content-Disposition", "inline", filename="qr.png")
                message.attach(qr_image)

                server = smtplib.SMTP(smtp_host, smtp_port, timeout=25)
                if smtp_use_tls:
                        server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, [to_email], message.as_string())
                server.quit()
                return True, None
        except Exception as exc:
                return False, str(exc)


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
        response = fetch_with_retry(
            lambda: supabase.table("students").select("*").order("registered_at", desc=True).execute(),
            attempts=3,
        )
        
        for student in response.data or []:
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
        participants_response = fetch_with_retry(
            lambda: supabase.table("participants").select("*").order("registered_at", desc=True).execute(),
            attempts=3,
        )
        
        participants = participants_response.data or []
        
        # For each participant, fetch their events
        for participant in participants:
            events_response = supabase.table("participant_events").select(
                "event_id"
            ).eq("participant_id", participant["id"]).execute()
            
            participant["events"] = [e["event_id"] for e in (events_response.data or [])]
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
                    "email_sent": False,
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

        email_sent, email_error = send_approval_email(
            to_email=student.get("email"),
            name=student.get("name", "Participant"),
            qr_code_base64=qr_code,
            registration_id=student_id,
            user_type="student",
        )

        return {
            "success": True,
            "data": {
                "id": student_id,
                "approved": True,
                "qr_code": qr_code,
                "email_sent": email_sent,
                "email_error": email_error,
            },
            "message": "Student approved successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/faculty/resend/student/{student_id}")
async def resend_student_approval_email(student_id: str, authorization: str = Header(None)):
    """Resend approval email with QR to an already approved student."""
    verify_faculty_token(authorization)

    try:
        student_response = supabase.table("students").select(
            "id, name, email, qr_code"
        ).eq("id", student_id).limit(1).execute()

        if not student_response.data:
            raise HTTPException(status_code=404, detail="Student registration not found")

        student = student_response.data[0]
        qr_code = student.get("qr_code")

        if not qr_code:
            raise HTTPException(
                status_code=400,
                detail="Student is not approved yet. QR code not available.",
            )

        email_sent, email_error = send_approval_email(
            to_email=student.get("email"),
            name=student.get("name", "Participant"),
            qr_code_base64=qr_code,
            registration_id=student_id,
            user_type="student",
        )

        if not email_sent:
            raise HTTPException(status_code=500, detail=f"Unable to send email: {email_error}")

        return {
            "success": True,
            "data": {
                "id": student_id,
                "email_sent": True,
            },
            "message": "Approval email sent successfully",
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


@router.delete("/faculty/student/{student_id}")
async def delete_student(student_id: str, authorization: str = Header(None)):
    """Delete a student registration."""
    verify_faculty_token(authorization)

    try:
        existing = supabase.table("students").select("id").eq("id", student_id).limit(1).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Student registration not found")

        supabase.table("students").delete().eq("id", student_id).execute()

        return {
            "success": True,
            "data": {"id": student_id},
            "message": "Student deleted successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/faculty/participant/{participant_id}")
async def delete_participant(participant_id: str, authorization: str = Header(None)):
    """Delete a participant registration and linked participant_events rows."""
    verify_faculty_token(authorization)

    try:
        existing = supabase.table("participants").select("id").eq("id", participant_id).limit(1).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Participant registration not found")

        supabase.table("participant_events").delete().eq("participant_id", participant_id).execute()
        supabase.table("participants").delete().eq("id", participant_id).execute()

        return {
            "success": True,
            "data": {"id": participant_id},
            "message": "Participant deleted successfully",
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
