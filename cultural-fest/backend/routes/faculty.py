from fastapi import APIRouter, HTTPException, Header, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from db import supabase
from qr_utils import generate_qr
from pass_generator import (
    generate_student_pass,
    generate_participant_pass,
    generate_volunteer_pass,
    generate_group_pass,
)
import os
import base64
import smtplib
import time
import csv
import re
from datetime import datetime, timezone
from io import StringIO
from uuid import UUID
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

router = APIRouter()


EVENT_LABELS = {
    "dance": "Dance",
    "standup_comedy": "Standup Comedy",
    "singing": "Singing",
    "skit": "Skit",
    "fashion_show": "Fashion Show",
    "rampwalk": "Rampwalk",
}

LOGO_PATH = "assets/logo.png"  # Relative to backend folder
SHORT_ID_REGEX = re.compile(r"^[0-9a-fA-F]{8}$")
VALIDATION_TABLES = [
    "students",
    "participants",
    "volunteers",
    "group_registrations",
]


class FacultyLoginRequest(BaseModel):
    password: str


class GateAccessLoginRequest(BaseModel):
    roll_no: str
    email: str


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


def format_datetime_for_export(value: str | None) -> str:
    """Normalize datetime values for Excel-friendly CSV output."""
    if not value:
        return ""

    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        return parsed.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        return str(value)


def event_id_to_label(event_id: str) -> str:
    if not event_id:
        return ""
    return EVENT_LABELS.get(event_id, event_id.replace("_", " ").strip().title())


def build_csv_content(headers: list[str], rows: list[list[str]]) -> str:
    """Return UTF-8 BOM prefixed CSV text so Excel reads encoding correctly."""
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    return "\ufeff" + output.getvalue()


def parse_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    normalized = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except Exception:
        return None


def is_approved_today(record: dict, today_date) -> bool:
    if not record.get("qr_code"):
        return False

    approved_at = parse_datetime(record.get("approved_at"))
    fallback_dt = parse_datetime(record.get("registered_at"))
    check_dt = approved_at or fallback_dt
    if check_dt is None:
        return False

    return check_dt.date() == today_date


def compute_summary(records: list[dict]) -> dict:
    today_date = datetime.now(timezone.utc).date()
    pending = 0
    approved_today = 0

    for record in records:
        if record.get("qr_code"):
            if is_approved_today(record, today_date):
                approved_today += 1
        else:
            pending += 1

    return {
        "total": len(records),
        "pending": pending,
        "approved_today": approved_today,
    }


def compute_approval_counts(records: list[dict]) -> dict:
    total = len(records)
    approved_count = sum(1 for record in records if record.get("qr_code"))
    return {
        "total": total,
        "approved_count": approved_count,
        "pending_count": total - approved_count,
    }


def fetch_summary_records(table_name: str) -> list[dict]:
    try:
        response = fetch_with_retry(
            lambda: supabase.table(table_name)
            .select("qr_code, registered_at, approved_at")
            .execute(),
            attempts=3,
        )
        return response.data or []
    except Exception:
        # Backward compatibility for databases that do not have approved_at yet.
        response = fetch_with_retry(
            lambda: supabase.table(table_name)
            .select("qr_code, registered_at")
            .execute(),
            attempts=3,
        )
        return response.data or []


def fetch_participant_events_map(participant_ids: list[str]) -> dict[str, list[str]]:
    """Return participant_id -> [event_id] map in one batched query."""
    if not participant_ids:
        return {}

    response = fetch_with_retry(
        lambda: supabase.table("participant_events")
        .select("participant_id, event_id")
        .in_("participant_id", participant_ids)
        .execute(),
        attempts=3,
    )

    events_map: dict[str, list[str]] = {participant_id: [] for participant_id in participant_ids}
    for row in response.data or []:
        participant_id = row.get("participant_id")
        event_id = row.get("event_id")
        if participant_id and event_id:
            events_map.setdefault(participant_id, []).append(event_id)

    return events_map


def get_pagination_bounds(total: int, page: int, page_size: int):
    total_pages = max(1, (total + page_size - 1) // page_size)
    current_page = min(max(page, 1), total_pages)
    start = (current_page - 1) * page_size
    end = start + page_size - 1
    return current_page, total_pages, start, end


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
                                        <p style="margin:0;font-size:12px;letter-spacing:2px;color:#C9A84C">IZEE GOT TALENT</p>
                                        <h1 style="margin:8px 0 0 0;font-size:24px;line-height:1.3;color:#F5F0E8">Registration Approved</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:24px;">
                                        <p style="margin:0 0 10px 0;font-size:15px;color:#F5F0E8">Hello {name},</p>
                                        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#F5F0E8">
                                            Your {user_type} registration has been approved by the Cultural Committee.
                                            Your digital admit pass is attached below. Save it and present at the entry gate.
                                        </p>
                                        <p style="margin:0 0 16px 0;font-size:13px;color:#C9A84C">Registration ID: {registration_id}</p>
                                        <div style="margin-top:16px;border-radius:10px;overflow:hidden;border:1px solid rgba(201,168,76,0.22)">
                                            <img src="cid:approval_pass" width="600" style="display:block;max-width:100%;height:auto;border-radius:8px;" alt="Admit Pass" />
                                        </div>
                                        <p style="margin:12px 0 0 0;font-size:12px;color:rgba(245,240,232,0.5);font-style:italic;">
                                            Save this image — it is your entry pass for the event. Show it at the entry gate for scanning.
                                        </p>
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
                message["Subject"] = "Izee Got Talent - Registration Approved"
                message["From"] = smtp_from
                message["To"] = to_email

                alternative = MIMEMultipart("alternative")
                alternative.attach(MIMEText("Your registration has been approved. Please use the attached QR code.", "plain"))
                alternative.attach(MIMEText(html, "html"))
                message.attach(alternative)

                qr_bytes = base64.b64decode(qr_code_base64)
                pass_image = MIMEImage(qr_bytes, _subtype="png")
                pass_image.add_header("Content-ID", "<approval_pass>")
                pass_image.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename="izee_gta_pass.png"
                )
                message.attach(pass_image)

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


@router.post("/validate/access/login")
async def validate_gate_access_login(req: GateAccessLoginRequest):
    """Public gate access login for registered volunteers only."""
    try:
        roll_no = (req.roll_no or "").strip()
        email = (req.email or "").strip().lower()

        if not roll_no or not email:
            return {
                "success": False,
                "data": None,
                "message": "Roll number and email are required.",
            }

        response = (
            supabase.table("volunteers")
            .select("id, name, roll_no, email, team_label, registered_at")
            .ilike("roll_no", roll_no)
            .ilike("email", email)
            .limit(1)
            .execute()
        )

        if not response.data:
            return {
                "success": False,
                "data": None,
                "message": "Access denied. Volunteer not found.",
            }

        volunteer = response.data[0]
        return {
            "success": True,
            "data": {
                "authorized": True,
                "volunteer": {
                    "id": volunteer.get("id"),
                    "name": volunteer.get("name"),
                    "roll_no": volunteer.get("roll_no"),
                    "email": volunteer.get("email"),
                    "team_label": volunteer.get("team_label") or "",
                },
            },
            "message": "Gate access granted.",
        }
    except Exception as e:
        return {
            "success": False,
            "data": None,
            "message": f"Access login error: {str(e)}",
        }


def resolve_validation_by_uuid(lookup_id: str):
    # Search students
    r = supabase.table("students").select("*").eq("id", lookup_id).limit(1).execute()
    if r.data:
        rec = r.data[0]
        if not rec.get("qr_code"):
            return {
                "success": True,
                "valid": False,
                "message": "Registration pending approval.",
            }
        return {
            "success": True,
            "valid": True,
            "data": {
                "name": rec.get("name"),
                "role": "Student",
                "course": rec.get("course"),
                "year": rec.get("year"),
                "roll_no": rec.get("roll_no"),
                "registration_id": rec.get("id"),
            },
        }

    # Search participants
    r = supabase.table("participants").select("*").eq("id", lookup_id).limit(1).execute()
    if r.data:
        rec = r.data[0]
        if not rec.get("qr_code"):
            return {
                "success": True,
                "valid": False,
                "message": "Registration pending approval.",
            }
        events = supabase.table("participant_events").select(
            "event_name, event_id"
        ).eq("participant_id", lookup_id).execute()
        event_names = []
        for event in (events.data or []):
            event_name = event.get("event_name") or event_id_to_label(event.get("event_id"))
            if event_name:
                event_names.append(event_name)
        return {
            "success": True,
            "valid": True,
            "data": {
                "name": rec.get("name"),
                "role": "Participant",
                "course": rec.get("course"),
                "year": rec.get("year"),
                "roll_no": rec.get("roll_no"),
                "events": event_names,
                "registration_id": rec.get("id"),
            },
        }

    # Search volunteers
    r = supabase.table("volunteers").select("*").eq("id", lookup_id).limit(1).execute()
    if r.data:
        rec = r.data[0]
        if not rec.get("qr_code"):
            return {
                "success": True,
                "valid": False,
                "message": "Registration pending approval.",
            }
        return {
            "success": True,
            "valid": True,
            "data": {
                "name": rec.get("name"),
                "role": "Volunteer",
                "course": rec.get("course"),
                "year": rec.get("year"),
                "roll_no": rec.get("roll_no"),
                "team_label": rec.get("team_label") or rec.get("volunteer_role") or "",
                "registration_id": rec.get("id"),
            },
        }

    # Search groups
    r = supabase.table("group_registrations").select("*").eq("id", lookup_id).limit(1).execute()
    if r.data:
        rec = r.data[0]
        if not rec.get("qr_code"):
            return {
                "success": True,
                "valid": False,
                "message": "Registration pending approval.",
            }
        return {
            "success": True,
            "valid": True,
            "data": {
                "name": rec.get("leader_name"),
                "role": "Group Leader",
                "course": rec.get("leader_course"),
                "year": rec.get("leader_year"),
                "roll_no": rec.get("leader_roll_no"),
                "team_label": rec.get("team_name", ""),
                "group_name": rec.get("team_name", ""),
                "registration_id": rec.get("id"),
            },
        }

    return {
        "success": True,
        "valid": False,
        "message": "Invalid ID. Not registered.",
    }


def fetch_all_ids_for_table(table_name: str, batch_size: int = 1000, max_batches: int = 20):
    """Fetch IDs in pages to support short-id lookup without table-wide full-row reads."""
    all_rows = []
    offset = 0

    for _ in range(max_batches):
        response = supabase.table(table_name).select("id").range(offset, offset + batch_size - 1).execute()
        rows = response.data or []
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < batch_size:
            break
        offset += batch_size

    return all_rows


@router.get("/validate/short/{short_id}")
async def validate_entry_by_short_id(short_id: str):
    """Public endpoint to validate by short id (first 8 chars shown on pass)."""
    try:
        lookup_short = (short_id or "").strip().lower()
        if not SHORT_ID_REGEX.match(lookup_short):
            return {
                "success": True,
                "valid": False,
                "message": "Short ID must be 8 hex characters.",
            }

        matches = []
        for table_name in VALIDATION_TABLES:
            rows = fetch_all_ids_for_table(table_name)
            for row in rows:
                row_id = str(row.get("id") or "").lower()
                if row_id.startswith(lookup_short):
                    matches.append(row_id)
                    if len(matches) > 1:
                        return {
                            "success": True,
                            "valid": False,
                            "message": "Multiple registrations match this short ID. Please scan QR or enter full ID.",
                        }

        if not matches:
            return {
                "success": True,
                "valid": False,
                "message": "Invalid ID. Not registered.",
            }

        return resolve_validation_by_uuid(matches[0])

    except Exception as e:
        return {
            "success": False,
            "valid": False,
            "message": f"Validation error: {str(e)}",
        }


@router.get("/validate/{qr_id}")
async def validate_entry(qr_id: str):
    """Public endpoint used at entry gate to validate a registration id."""
    try:
        lookup_id = (qr_id or "").strip()
        if not lookup_id:
            return {
                "success": True,
                "valid": False,
                "message": "Invalid ID. Not registered.",
            }

        try:
            UUID(lookup_id)
        except ValueError:
            return {
                "success": True,
                "valid": False,
                "message": "Invalid ID. Not registered.",
            }
        return resolve_validation_by_uuid(lookup_id)

    except Exception as e:
        return {
            "success": False,
            "valid": False,
            "message": f"Validation error: {str(e)}",
        }


@router.get("/faculty/students")
async def get_all_students(
    authorization: str = Header(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
):
    """Get all student registrations."""
    verify_faculty_token(authorization)
    
    try:
        summary_records = fetch_summary_records("students")
        summary = compute_summary(summary_records)
        current_page, total_pages, start, end = get_pagination_bounds(summary["total"], page, page_size)

        students = []
        if summary["total"] > 0:
            response = fetch_with_retry(
                lambda: supabase.table("students").select("*").order("registered_at", desc=True).range(start, end).execute(),
                attempts=3,
            )
            students = response.data or []

        for student in students:
            student["approved"] = bool(student.get("qr_code"))

        return {
            "success": True,
            "data": students,
            "pagination": {
                "page": current_page,
                "page_size": page_size,
                "total": summary["total"],
                "total_pages": total_pages,
            },
            "summary": summary,
            "message": "Students retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/participants")
async def get_all_participants(
    authorization: str = Header(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
):
    """Get all participant registrations with their events."""
    verify_faculty_token(authorization)
    
    try:
        summary_records = fetch_summary_records("participants")
        summary = compute_summary(summary_records)
        current_page, total_pages, start, end = get_pagination_bounds(summary["total"], page, page_size)

        participants = []
        if summary["total"] > 0:
            participants_response = fetch_with_retry(
                lambda: supabase.table("participants").select("*").order("registered_at", desc=True).range(start, end).execute(),
                attempts=3,
            )
            participants = participants_response.data or []
        
        participant_ids = [participant.get("id") for participant in participants if participant.get("id")]
        events_map = fetch_participant_events_map(participant_ids)

        # Attach events to each participant using batched lookup map.
        for participant in participants:
            participant_id = participant.get("id")
            participant["events"] = events_map.get(participant_id, [])
            participant["approved"] = bool(participant.get("qr_code"))
        
        return {
            "success": True,
            "data": participants,
            "pagination": {
                "page": current_page,
                "page_size": page_size,
                "total": summary["total"],
                "total_pages": total_pages,
            },
            "summary": summary,
            "message": "Participants retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def send_pass_email_background(record: dict, record_type: str):
    """Background task to generate pass and send email."""
    try:
        pass_base64 = None
        table_name = None
        
        if record_type == "student":
            table_name = "students"
            pass_base64 = generate_student_pass(
                {
                    "id": str(record.get("id")),
                    "name": record.get("name"),
                    "roll_no": record.get("roll_no"),
                    "course": record.get("course"),
                    "year": record.get("year"),
                },
                logo_path=LOGO_PATH,
            )
            supabase.table(table_name).update({"qr_code": pass_base64}).eq("id", record.get("id")).execute()
            send_approval_email(
                to_email=record.get("email"),
                name=record.get("name", "Student"),
                qr_code_base64=pass_base64,
                registration_id=record.get("id"),
                user_type="student",
            )
        elif record_type == "participant":
            table_name = "participants"
            events_response = supabase.table("participant_events").select(
                "event_id, event_name, category_id, category_label"
            ).eq("participant_id", record.get("id")).execute()
            participant_events = [
                {
                    "event_id": e.get("event_id"),
                    "event_name": e.get("event_name"),
                    "category_id": e.get("category_id", ""),
                    "category_label": e.get("category_label", ""),
                }
                for e in (events_response.data or [])
            ]
            pass_base64 = generate_participant_pass(
                {
                    "id": str(record.get("id")),
                    "name": record.get("name"),
                    "roll_no": record.get("roll_no"),
                    "course": record.get("course"),
                    "year": record.get("year"),
                    "events": participant_events,
                },
                logo_path=LOGO_PATH,
            )
            supabase.table(table_name).update({"qr_code": pass_base64}).eq("id", record.get("id")).execute()
            event_labels = [
                ev.get("event_name", "")
                for ev in participant_events
                if ev.get("event_name")
            ]
            send_approval_email(
                to_email=record.get("email"),
                name=record.get("name", "Participant"),
                qr_code_base64=pass_base64,
                registration_id=record.get("id"),
                user_type="participant",
                events=event_labels,
            )
        elif record_type == "volunteer":
            table_name = "volunteers"
            pass_base64 = generate_volunteer_pass(
                {
                    "id": str(record.get("id")),
                    "name": record.get("name"),
                    "roll_no": record.get("roll_no"),
                    "course": record.get("course"),
                    "year": record.get("year"),
                    "team_label": record.get("team_label"),
                },
                logo_path=LOGO_PATH,
            )
            supabase.table(table_name).update({"qr_code": pass_base64}).eq("id", record.get("id")).execute()
            send_approval_email(
                to_email=record.get("email"),
                name=record.get("name", "Volunteer"),
                qr_code_base64=pass_base64,
                registration_id=record.get("id"),
                user_type="volunteer",
            )
        elif record_type == "group":
            table_name = "group_registrations"
            members_response = supabase.table("group_members").select("id").eq("group_id", record.get("id")).execute()
            member_count = len(members_response.data or [])
            pass_base64 = generate_group_pass(
                {
                    "id": str(record.get("id")),
                    "team_name": record.get("team_name"),
                    "event_name": record.get("event_name"),
                    "leader_roll_no": record.get("leader_roll_no"),
                    "member_count": member_count,
                },
                logo_path=LOGO_PATH,
            )
            supabase.table(table_name).update({"qr_code": pass_base64}).eq("id", record.get("id")).execute()
            event_name = str(record.get("event_name") or "").strip()
            send_approval_email(
                to_email=record.get("leader_email"),
                name=record.get("leader_name", "Group Leader"),
                qr_code_base64=pass_base64,
                registration_id=record.get("id"),
                user_type="group participant",
                events=[event_name] if event_name else None,
            )
    except Exception as e:
        print(f"Background pass/email error ({record_type}): {e}")


@router.post("/faculty/approve/student/{student_id}")
async def approve_student(student_id: str, authorization: str = Header(None), background_tasks: BackgroundTasks = None):
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

        # Update DB immediately with approved_at
        approval_timestamp = datetime.now(timezone.utc).isoformat()
        try:
            supabase.table("students").update({"approved_at": approval_timestamp}).eq("id", student_id).execute()
        except Exception:
            # Backward compatibility for databases where approved_at is not added yet.
            pass

        # Add background task for pass generation and email
        if background_tasks:
            background_tasks.add_task(send_pass_email_background, student, "student")

        return {
            "success": True,
            "data": {
                "id": student_id,
                "approved": True,
                "qr_code": None,
            },
            "message": "Student approved successfully. Pass will be generated and emailed shortly.",
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
async def approve_participant(participant_id: str, authorization: str = Header(None), background_tasks: BackgroundTasks = None):
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

        # Update DB immediately with approved_at
        approval_timestamp = datetime.now(timezone.utc).isoformat()
        try:
            supabase.table("participants").update({"approved_at": approval_timestamp}).eq("id", participant_id).execute()
        except Exception:
            # Backward compatibility for databases where approved_at is not added yet.
            pass

        # Add background task for pass generation and email
        if background_tasks:
            background_tasks.add_task(send_pass_email_background, participant, "participant")

        return {
            "success": True,
            "data": {
                "id": participant_id,
                "approved": True,
                "qr_code": None,
            },
            "message": "Participant approved successfully. Pass will be generated and emailed shortly.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/faculty/resend/participant/{participant_id}")
async def resend_participant_approval_email(participant_id: str, authorization: str = Header(None)):
    """Resend approval email with QR to an already approved participant."""
    verify_faculty_token(authorization)

    try:
        participant_response = supabase.table("participants").select(
            "id, name, email, qr_code"
        ).eq("id", participant_id).limit(1).execute()

        if not participant_response.data:
            raise HTTPException(status_code=404, detail="Participant registration not found")

        participant = participant_response.data[0]
        qr_code = participant.get("qr_code")

        if not qr_code:
            raise HTTPException(
                status_code=400,
                detail="Participant is not approved yet. QR code not available.",
            )

        events_response = supabase.table("participant_events").select("event_id").eq(
            "participant_id", participant_id
        ).execute()
        event_ids = [item.get("event_id") for item in (events_response.data or [])]
        event_labels = [event_id_to_label(event_id) for event_id in event_ids if event_id]

        email_sent, email_error = send_approval_email(
            to_email=participant.get("email"),
            name=participant.get("name", "Participant"),
            qr_code_base64=qr_code,
            registration_id=participant_id,
            user_type="participant",
            events=event_labels,
        )

        if not email_sent:
            raise HTTPException(status_code=500, detail=f"Unable to send email: {email_error}")

        return {
            "success": True,
            "data": {
                "id": participant_id,
                "email_sent": True,
            },
            "message": "Approval email sent successfully",
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
        
        students = response.data or []

        headers = [
            "Registration ID",
            "Name",
            "Roll Number",
            "Course",
            "Year",
            "Email",
            "Status",
            "Registered At",
        ]

        rows = []
        for student in students:
            rows.append([
                str(student.get("id") or ""),
                str(student.get("name") or ""),
                str(student.get("roll_no") or ""),
                str(student.get("course") or ""),
                str(student.get("year") or ""),
                str(student.get("email") or ""),
                "Approved" if student.get("qr_code") else "Pending",
                format_datetime_for_export(student.get("registered_at")),
            ])

        csv_content = build_csv_content(headers, rows)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=students-report.csv"}
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
        
        participants = participants_response.data or []
        
        participant_ids = [participant.get("id") for participant in participants if participant.get("id")]
        events_map = fetch_participant_events_map(participant_ids)

        # Populate event labels using batched participant event map.
        for participant in participants:
            event_ids = events_map.get(participant.get("id"), [])
            event_labels = [event_id_to_label(event_id) for event_id in event_ids if event_id]
            participant["event_1"] = event_labels[0] if len(event_labels) > 0 else ""
            participant["event_2"] = event_labels[1] if len(event_labels) > 1 else ""

        headers = [
            "Registration ID",
            "Name",
            "Roll Number",
            "Course",
            "Year",
            "Email",
            "Event1",
            "Event2",
            "Status",
            "Registered At",
        ]

        rows = []
        for participant in participants:
            rows.append([
                str(participant.get("id") or ""),
                str(participant.get("name") or ""),
                str(participant.get("roll_no") or ""),
                str(participant.get("course") or ""),
                str(participant.get("year") or ""),
                str(participant.get("email") or ""),
                str(participant.get("event_1") or ""),
                str(participant.get("event_2") or ""),
                "Approved" if participant.get("qr_code") else "Pending",
                format_datetime_for_export(participant.get("registered_at")),
            ])

        csv_content = build_csv_content(headers, rows)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=participants-report.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/volunteers")
async def get_all_volunteers(
    authorization: str = Header(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
):
    """Get paginated volunteer registrations for faculty dashboard."""
    verify_faculty_token(authorization)

    try:
        summary_records = fetch_summary_records("volunteers")
        summary = compute_approval_counts(summary_records)
        current_page, total_pages, start, end = get_pagination_bounds(summary["total"], page, page_size)

        volunteer_records = []
        if summary["total"] > 0:
            response = fetch_with_retry(
                lambda: supabase.table("volunteers").select("*").order("registered_at", desc=True).range(start, end).execute(),
                attempts=3,
            )
            volunteer_records = response.data or []

        data = []
        for volunteer in volunteer_records:
            role_value = volunteer.get("volunteer_role") or volunteer.get("role") or ""
            data.append(
                {
                    "id": volunteer.get("id"),
                    "name": volunteer.get("name"),
                    "roll_no": volunteer.get("roll_no"),
                    "course": volunteer.get("course"),
                    "year": volunteer.get("year"),
                    "email": volunteer.get("email"),
                    "phone": volunteer.get("phone"),
                    "volunteer_role": role_value,
                    "registered_at": volunteer.get("registered_at"),
                    "approved_at": volunteer.get("approved_at"),
                    "is_approved": bool(volunteer.get("qr_code")),
                }
            )

        return {
            "success": True,
            "data": data,
            "pagination": {
                "page": current_page,
                "page_size": page_size,
                "total": summary["total"],
                "total_pages": total_pages,
            },
            "summary": summary,
            "message": "Volunteers retrieved successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/groups")
async def get_all_groups(
    authorization: str = Header(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
):
    """Get paginated group registrations for faculty dashboard."""
    verify_faculty_token(authorization)

    try:
        summary_records = fetch_summary_records("group_registrations")
        summary = compute_approval_counts(summary_records)
        current_page, total_pages, start, end = get_pagination_bounds(summary["total"], page, page_size)

        group_records = []
        if summary["total"] > 0:
            response = fetch_with_retry(
                lambda: supabase.table("group_registrations").select("*").order("registered_at", desc=True).range(start, end).execute(),
                attempts=3,
            )
            group_records = response.data or []

        data = []
        for group in group_records:
            data.append(
                {
                    "id": group.get("id"),
                    "name": group.get("leader_name") or group.get("name"),
                    "roll_no": group.get("leader_roll_no") or group.get("roll_no"),
                    "course": group.get("leader_course") or group.get("course"),
                    "year": group.get("leader_year") or group.get("year"),
                    "email": group.get("leader_email") or group.get("email"),
                    "phone": group.get("leader_phone") or group.get("phone"),
                    "group_name": group.get("team_name") or group.get("group_name"),
                    "event_id": group.get("event_id"),
                    "registered_at": group.get("registered_at"),
                    "approved_at": group.get("approved_at"),
                    "is_approved": bool(group.get("qr_code")),
                }
            )

        return {
            "success": True,
            "data": data,
            "pagination": {
                "page": current_page,
                "page_size": page_size,
                "total": summary["total"],
                "total_pages": total_pages,
            },
            "summary": summary,
            "message": "Groups retrieved successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/faculty/approve/volunteer/{volunteer_id}")
async def approve_volunteer(volunteer_id: str, authorization: str = Header(None), background_tasks: BackgroundTasks = None):
    """Approve a volunteer registration and generate digital pass."""
    verify_faculty_token(authorization)

    try:
        volunteer_response = supabase.table("volunteers").select("*").eq("id", volunteer_id).limit(1).execute()

        if not volunteer_response.data:
            raise HTTPException(status_code=404, detail="Volunteer registration not found")

        volunteer = volunteer_response.data[0]
        existing_qr = volunteer.get("qr_code")
        if existing_qr:
            return {
                "success": True,
                "data": {
                    "id": volunteer_id,
                    "approved": True,
                    "qr_code": existing_qr,
                    "email_sent": False,
                },
                "message": "Volunteer already approved",
            }

        # Update DB immediately with approved_at
        approval_timestamp = datetime.now(timezone.utc).isoformat()
        try:
            supabase.table("volunteers").update(
                {"approved_at": approval_timestamp}
            ).eq("id", volunteer_id).execute()
        except Exception:
            # Backward compatibility for databases where approved_at is not added yet.
            pass

        # Add background task for pass generation and email
        if background_tasks:
            background_tasks.add_task(send_pass_email_background, volunteer, "volunteer")

        return {
            "success": True,
            "data": {
                "id": volunteer_id,
                "approved": True,
                "qr_code": None,
            },
            "message": "Volunteer approved successfully. Pass will be generated and emailed shortly.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/faculty/approve/group/{group_id}")
async def approve_group(group_id: str, authorization: str = Header(None), background_tasks: BackgroundTasks = None):
    """Approve a group registration and generate digital pass."""
    verify_faculty_token(authorization)

    try:
        group_response = supabase.table("group_registrations").select("*").eq("id", group_id).limit(1).execute()

        if not group_response.data:
            raise HTTPException(status_code=404, detail="Group registration not found")

        group = group_response.data[0]
        existing_qr = group.get("qr_code")
        if existing_qr:
            return {
                "success": True,
                "data": {
                    "id": group_id,
                    "approved": True,
                    "qr_code": existing_qr,
                    "email_sent": False,
                },
                "message": "Group participant already approved",
            }

        # Update DB immediately with approved_at
        approval_timestamp = datetime.now(timezone.utc).isoformat()
        try:
            supabase.table("group_registrations").update(
                {"approved_at": approval_timestamp}
            ).eq("id", group_id).execute()
        except Exception:
            # Backward compatibility for databases where approved_at is not added yet.
            pass

        # Add background task for pass generation and email
        if background_tasks:
            background_tasks.add_task(send_pass_email_background, group, "group")

        return {
            "success": True,
            "data": {
                "id": group_id,
                "approved": True,
                "qr_code": None,
            },
            "message": "Group approved successfully. Pass will be generated and emailed shortly.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/faculty/resend/volunteer/{volunteer_id}")
async def resend_volunteer_approval_email(volunteer_id: str, authorization: str = Header(None)):
    """Resend approval email with pass to an already approved volunteer."""
    verify_faculty_token(authorization)

    try:
        volunteer_response = supabase.table("volunteers").select(
            "id, name, email, qr_code"
        ).eq("id", volunteer_id).limit(1).execute()

        if not volunteer_response.data:
            raise HTTPException(status_code=404, detail="Volunteer registration not found")

        volunteer = volunteer_response.data[0]
        qr_code = volunteer.get("qr_code")

        if not qr_code:
            raise HTTPException(
                status_code=400,
                detail="Volunteer is not approved yet. QR code not available.",
            )

        email_sent, email_error = send_approval_email(
            to_email=volunteer.get("email"),
            name=volunteer.get("name", "Volunteer"),
            qr_code_base64=qr_code,
            registration_id=volunteer_id,
            user_type="volunteer",
        )

        if not email_sent:
            raise HTTPException(status_code=500, detail=f"Unable to send email: {email_error}")

        return {
            "success": True,
            "data": {
                "id": volunteer_id,
                "email_sent": True,
            },
            "message": "Email resent",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/faculty/resend/group/{group_id}")
async def resend_group_approval_email(group_id: str, authorization: str = Header(None)):
    """Resend approval email with pass to an already approved group leader."""
    verify_faculty_token(authorization)

    try:
        group_response = supabase.table("group_registrations").select(
            "id, leader_name, leader_email, event_name, qr_code"
        ).eq("id", group_id).limit(1).execute()

        if not group_response.data:
            raise HTTPException(status_code=404, detail="Group registration not found")

        group = group_response.data[0]
        qr_code = group.get("qr_code")

        if not qr_code:
            raise HTTPException(
                status_code=400,
                detail="Group participant is not approved yet. QR code not available.",
            )

        event_name = str(group.get("event_name") or "").strip()
        email_sent, email_error = send_approval_email(
            to_email=group.get("leader_email"),
            name=group.get("leader_name", "Group Leader"),
            qr_code_base64=qr_code,
            registration_id=group_id,
            user_type="group participant",
            events=[event_name] if event_name else None,
        )

        if not email_sent:
            raise HTTPException(status_code=500, detail=f"Unable to send email: {email_error}")

        return {
            "success": True,
            "data": {
                "id": group_id,
                "email_sent": True,
            },
            "message": "Email resent",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/faculty/volunteer/{volunteer_id}")
async def delete_volunteer(volunteer_id: str, authorization: str = Header(None)):
    """Delete a volunteer registration."""
    verify_faculty_token(authorization)

    try:
        existing = supabase.table("volunteers").select("id").eq("id", volunteer_id).limit(1).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Volunteer registration not found")

        supabase.table("volunteers").delete().eq("id", volunteer_id).execute()

        return {
            "success": True,
            "data": {"id": volunteer_id},
            "message": "Volunteer record deleted",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/faculty/group/{group_id}")
async def delete_group(group_id: str, authorization: str = Header(None)):
    """Delete a group registration and linked group members."""
    verify_faculty_token(authorization)

    try:
        existing = supabase.table("group_registrations").select("id").eq("id", group_id).limit(1).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Group registration not found")

        supabase.table("group_members").delete().eq("group_id", group_id).execute()
        supabase.table("group_registrations").delete().eq("id", group_id).execute()

        return {
            "success": True,
            "data": {"id": group_id},
            "message": "Group record deleted",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/export/volunteers")
async def export_volunteers_csv(authorization: str = Header(None)):
    """Export all volunteers as CSV."""
    verify_faculty_token(authorization)

    try:
        response = supabase.table("volunteers").select("*").order(
            "registered_at", desc=True
        ).execute()

        volunteers = response.data or []

        headers = [
            "id",
            "name",
            "roll_no",
            "course",
            "year",
            "email",
            "phone",
            "volunteer_role",
            "registered_at",
            "approved_at",
            "status",
        ]

        rows = []
        for volunteer in volunteers:
            role_value = volunteer.get("volunteer_role") or volunteer.get("role") or ""
            rows.append([
                str(volunteer.get("id") or ""),
                str(volunteer.get("name") or ""),
                str(volunteer.get("roll_no") or ""),
                str(volunteer.get("course") or ""),
                str(volunteer.get("year") or ""),
                str(volunteer.get("email") or ""),
                str(volunteer.get("phone") or ""),
                str(role_value),
                format_datetime_for_export(volunteer.get("registered_at")),
                format_datetime_for_export(volunteer.get("approved_at")),
                "Approved" if volunteer.get("qr_code") else "Pending",
            ])

        csv_content = build_csv_content(headers, rows)

        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=volunteers-report.csv"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/faculty/export/groups")
async def export_groups_csv(authorization: str = Header(None)):
    """Export all group registrations as CSV."""
    verify_faculty_token(authorization)

    try:
        response = supabase.table("group_registrations").select("*").order(
            "registered_at", desc=True
        ).execute()

        groups = response.data or []

        headers = [
            "id",
            "name",
            "roll_no",
            "course",
            "year",
            "email",
            "phone",
            "group_name",
            "event_id",
            "registered_at",
            "approved_at",
            "status",
        ]

        rows = []
        for group in groups:
            rows.append([
                str(group.get("id") or ""),
                str(group.get("leader_name") or group.get("name") or ""),
                str(group.get("leader_roll_no") or group.get("roll_no") or ""),
                str(group.get("leader_course") or group.get("course") or ""),
                str(group.get("leader_year") or group.get("year") or ""),
                str(group.get("leader_email") or group.get("email") or ""),
                str(group.get("leader_phone") or group.get("phone") or ""),
                str(group.get("team_name") or group.get("group_name") or ""),
                str(group.get("event_id") or ""),
                format_datetime_for_export(group.get("registered_at")),
                format_datetime_for_export(group.get("approved_at")),
                "Approved" if group.get("qr_code") else "Pending",
            ])

        csv_content = build_csv_content(headers, rows)

        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=groups-report.csv"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
