import os
import smtplib
import socket
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL")


def send_email_via_smtp(
    to_email: str,
    subject: str,
    html_body: str,
    attachment_bytes: bytes = None,
    attachment_filename: str = None,
):
    try:
        if not SMTP_USER or not SMTP_PASSWORD:
            raise Exception("SMTP credentials missing")

        if SMTP_FROM_EMAIL != SMTP_USER:
            raise Exception("SMTP_FROM_EMAIL must match SMTP_USER")

        print("SMTP DEBUG:", SMTP_HOST, SMTP_PORT, SMTP_USER)

        msg = MIMEMultipart()
        msg["From"] = SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(html_body, "html"))

        if attachment_bytes and attachment_filename:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment_bytes)
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{attachment_filename}"'
            )
            msg.attach(part)

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()

        server.login(SMTP_USER, SMTP_PASSWORD)

        server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        server.quit()

        print("EMAIL SENT SUCCESS")
        return True, None

    except Exception as e:
        print("SMTP ERROR:", repr(e))
        return False, str(e)


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
    "group_members",
]

VOLUNTEER_TEAM_OPTIONS = {
    "Registration & Reception Team",
    "Program Coordination Team",
    "Discipline & Security Committee",
    "Hospitality & Welfare Team",
    "Technical Support Team",
}

ENTRY_SCAN_MEMORY: dict[str, str] = {}


class FacultyLoginRequest(BaseModel):
    password: str


class GateAccessLoginRequest(BaseModel):
    roll_no: str
    email: str


class VolunteerTeamAssignmentRequest(BaseModel):
    team_label: str


class FacultyOnspotStudentRequest(BaseModel):
    name: str
    roll_no: str
    course: str
    year: str
    email: str


class RegistrationConfigUpdateRequest(BaseModel):
    student_open: bool | None = None
    participant_open: bool | None = None
    volunteer_open: bool | None = None


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


def normalize_registration_config_row(row: dict | None) -> dict:
    row = row or {}
    return {
        "id": 1,
        "student_open": bool(row.get("student_open", True)),
        "participant_open": bool(row.get("participant_open", True)),
        "volunteer_open": bool(row.get("volunteer_open", True)),
        "updated_at": row.get("updated_at"),
    }


def fetch_registration_config() -> dict:
    response = (
        supabase.table("registration_config")
        .select("id, student_open, participant_open, volunteer_open, updated_at")
        .eq("id", 1)
        .limit(1)
        .execute()
    )

    if response.data:
        return normalize_registration_config_row(response.data[0])

    created = (
        supabase.table("registration_config")
        .insert({"id": 1, "student_open": True, "participant_open": True, "volunteer_open": True})
        .execute()
    )
    created_row = created.data[0] if created.data else None
    return normalize_registration_config_row(created_row)


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


def fetch_count_with_retry(fetch_fn, attempts: int = 3) -> int:
    response = fetch_with_retry(fetch_fn, attempts=attempts)
    return int(getattr(response, "count", 0) or 0)


def fetch_approved_ids_for_records(table_name: str, record_ids: list[str]) -> set[str]:
    """Return a set of approved IDs without loading heavy qr_code payloads."""
    if not record_ids:
        return set()

    response = fetch_with_retry(
        lambda: supabase.table(table_name)
        .select("id")
        .in_("id", record_ids)
        .not_.is_("qr_code", "null")
        .execute(),
        attempts=3,
    )

    return {
        str(row.get("id"))
        for row in (response.data or [])
        if row.get("id") is not None
    }


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


def fetch_table_summary(table_name: str, include_approved_today: bool = False) -> dict:
    """Compute dashboard summary using lightweight count queries first, with fallback."""
    try:
        total = fetch_count_with_retry(
            lambda: supabase.table(table_name).select("id", count="exact", head=True).execute(),
            attempts=3,
        )
        approved_count = fetch_count_with_retry(
            lambda: supabase.table(table_name)
            .select("id", count="exact", head=True)
            .not_.is_("qr_code", "null")
            .execute(),
            attempts=3,
        )

        summary = {
            "total": total,
            "approved_count": approved_count,
            "pending_count": max(total - approved_count, 0),
        }

        if include_approved_today:
            approved_today = 0
            day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            try:
                approved_today = fetch_count_with_retry(
                    lambda: supabase.table(table_name)
                    .select("id", count="exact", head=True)
                    .gte("approved_at", day_start.isoformat())
                    .lt("approved_at", day_end.isoformat())
                    .execute(),
                    attempts=3,
                )
            except Exception:
                approved_today = 0

            summary["pending"] = summary["pending_count"]
            summary["approved_today"] = approved_today

        return summary
    except Exception:
        summary_records = fetch_summary_records(table_name)
        if include_approved_today:
            legacy = compute_summary(summary_records)
            return {
                "total": legacy["total"],
                "approved_count": max(legacy["total"] - legacy["pending"], 0),
                "pending_count": legacy["pending"],
                "pending": legacy["pending"],
                "approved_today": legacy["approved_today"],
            }

        legacy = compute_approval_counts(summary_records)
        return legacy


def sanitize_filename(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", str(value or "")).strip("_")
    return cleaned or fallback


def pass_png_base64_to_pdf_bytes(pass_base64: str) -> bytes:
    raw_bytes = base64.b64decode(pass_base64)
    with Image.open(BytesIO(raw_bytes)) as image:
        rgb_image = image.convert("RGB")
        output = BytesIO()
        rgb_image.save(output, format="PDF", resolution=110.0)
        return output.getvalue()


def build_zip_bundle(files: list[tuple[str, bytes]]) -> bytes:
    output = BytesIO()
    with ZipFile(output, mode="w", compression=ZIP_DEFLATED) as zip_file:
        for filename, payload in files:
            zip_file.writestr(filename, payload)
    output.seek(0)
    return output.read()


def send_group_bundle_email(
    to_email: str,
    leader_name: str,
    registration_id: str,
    team_name: str,
    event_name: str,
    bundle_bytes: bytes,
    total_passes: int,
):
    """Send leader-only zip bundle containing all team member passes as PDFs via SMTP."""
    if not SMTP_USER or not SMTP_PASSWORD:
        return False, "SMTP credentials not set"
    if not to_email:
        return False, "Recipient email missing"

    short_id = str(registration_id or "")[:8].upper()
    subject = "Izee Got Talent - Group Pass Bundle"
    plain = (
        f"Hello {leader_name},\n\n"
        f"Your team '{team_name}' for {event_name} is approved.\n"
        f"Attached is a ZIP bundle containing {total_passes} individual pass PDF files.\n"
        f"Registration ID: {registration_id}\n"
        f"Short ID: {short_id}\n\n"
        "Share each PDF with the respective team member.\n"
    )

    html = f"""
    <html>
      <body style=\"margin:0;padding:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;color:#F5F0E8;\">
        <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:24px;background:#0A0A0A;\">
          <tr>
            <td align=\"center\">
              <table role=\"presentation\" width=\"640\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:640px;background:#111111;border:1px solid rgba(201,168,76,0.32);border-radius:14px;overflow:hidden;\">
                <tr>
                  <td style=\"padding:22px 24px;background:linear-gradient(90deg,#0A0A0A,#181818);border-bottom:1px solid rgba(201,168,76,0.22)\">
                    <p style=\"margin:0;font-size:12px;letter-spacing:2px;color:#C9A84C\">IZEE GOT TALENT</p>
                    <h1 style=\"margin:8px 0 0 0;font-size:24px;line-height:1.3;color:#F5F0E8\">Group Approved · Pass Bundle Ready</h1>
                  </td>
                </tr>
                <tr>
                  <td style=\"padding:24px;\">
                    <p style=\"margin:0 0 10px 0;font-size:15px;color:#F5F0E8\">Hello {leader_name},</p>
                    <p style=\"margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#F5F0E8\">
                      Team <strong>{team_name}</strong> has been approved for <strong>{event_name}</strong>.
                    </p>
                    <p style=\"margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#F5F0E8\">
                      Attached ZIP contains <strong>{total_passes}</strong> individual pass PDFs for your entire team.
                    </p>
                    <p style=\"margin:0;font-size:13px;color:#C9A84C\">Registration ID: {registration_id}</p>
                    <p style=\"margin:4px 0 0 0;font-size:13px;color:#C9A84C\">Short ID: {short_id}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

    zip_name = f"group_pass_bundle_{short_id or 'TEAM'}.zip"

    try:
        send_email_via_smtp(
            to_email=to_email,
            subject=subject,
            html_body=html,
            attachment_bytes=bundle_bytes,
            attachment_filename=zip_name,
        )
        return True, None
    except Exception as exc:
        return False, str(exc)


def format_scan_timestamp(value: str | None) -> str:
    parsed = parse_datetime(value)
    if not parsed:
        return "Unknown Time"
    return parsed.astimezone(timezone.utc).strftime("%d %b %Y, %I:%M:%S %p UTC")


def track_scan_timestamp(table_name: str, record_id: str) -> tuple[str | None, str]:
    """Track entry scans with DB persistence when available, else in-memory fallback."""
    now_iso = datetime.now(timezone.utc).isoformat()
    cache_key = f"{table_name}:{record_id}"

    try:
        existing = (
            supabase.table(table_name)
            .select("last_scanned_at, scan_count")
            .eq("id", record_id)
            .limit(1)
            .execute()
        )

        previous = None
        previous_count = 0
        if existing.data:
            row = existing.data[0]
            previous = row.get("last_scanned_at")
            try:
                previous_count = int(row.get("scan_count") or 0)
            except Exception:
                previous_count = 0

            supabase.table(table_name).update(
                {
                    "last_scanned_at": now_iso,
                    "scan_count": previous_count + 1,
                }
            ).eq("id", record_id).execute()

            return previous, now_iso
    except Exception:
        # Schema may not contain scan columns yet; fallback to memory.
        pass

    previous = ENTRY_SCAN_MEMORY.get(cache_key)
    ENTRY_SCAN_MEMORY[cache_key] = now_iso
    return previous, now_iso


def build_validation_success(data: dict, table_name: str, record_id: str) -> dict:
    previous_scan, current_scan = track_scan_timestamp(table_name, record_id)

    payload = {
        **data,
        "already_scanned": bool(previous_scan),
        "scanned_at": current_scan,
    }
    if previous_scan:
        payload["already_scanned_at"] = previous_scan

    message = "Entry Valid."
    if previous_scan:
        message = f"Entry Valid. Already Scanned {format_scan_timestamp(previous_scan)}"

    return {
        "success": True,
        "valid": True,
        "data": payload,
        "message": message,
    }


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
        """Send approval email with branded HTML template and inline pass preview via SMTP."""
        if not SMTP_USER or not SMTP_PASSWORD:
                print(f"[EMAIL SKIPPED] SMTP credentials not set. Would send to: {to_email}")
                return False, "SMTP credentials not set"

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

        subject = "Izee Got Talent - Registration Approved"
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
                                            <img src="data:image/png;base64,{qr_code_base64}" width="600" style="display:block;max-width:100%;height:auto;border-radius:8px;" alt="Admit Pass" />
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
                send_email_via_smtp(
                        to_email=to_email,
                        subject=subject,
                        html_body=html,
                        attachment_bytes=base64.b64decode(qr_code_base64),
                        attachment_filename="izee_gta_pass.png",
                )
                print(f"[EMAIL SENT] {to_email} - {subject}")
                return True, None
        except Exception as exc:
                print("EMAIL ERROR FULL:", repr(exc))
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


@router.post("/faculty/onspot/student")
async def register_onspot_student(req: FacultyOnspotStudentRequest, authorization: str = Header(None)):
    """Faculty-only on-spot student registration with immediate approval and pass generation."""
    verify_faculty_token(authorization)

    try:
        normalized_name = normalize_full_name(req.name)
        normalized_roll_no = normalize_roll_no(req.roll_no)

        if not normalized_name:
            raise HTTPException(status_code=400, detail="Name is required")
        if not is_valid_roll_no(normalized_roll_no):
            raise HTTPException(status_code=400, detail="Roll No must be 12 alphanumeric characters")

        duplicate = await check_duplicate_roll(supabase, normalized_roll_no)
        if duplicate["is_duplicate"]:
            return {
                "success": False,
                "data": None,
                "message": "This roll number is already registered.",
            }

        student_id = str(uuid4())
        timestamp_iso = datetime.now(timezone.utc).isoformat()

        pass_base64 = generate_student_pass(
            {
                "id": student_id,
                "name": normalized_name,
                "roll_no": normalized_roll_no,
                "course": req.course,
                "year": req.year,
            },
            logo_path=LOGO_PATH,
        )

        supabase.table("students").insert(
            {
                "id": student_id,
                "name": normalized_name,
                "roll_no": normalized_roll_no,
                "course": req.course,
                "year": req.year,
                "email": req.email,
                "phone": "",
                "registered_at": timestamp_iso,
                "approved_at": timestamp_iso,
                "qr_code": pass_base64,
            }
        ).execute()

        return {
            "success": True,
            "data": {
                "id": student_id,
                "approved": True,
            },
            "message": "On-spot student registered and approved successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/registrations")
async def get_registration_config():
    try:
        config = fetch_registration_config()
        return {
            "success": True,
            "data": config,
            "message": "Registration config retrieved successfully",
        }
    except Exception as e:
        return {
            "success": False,
            "data": None,
            "message": f"Failed to fetch registration config: {str(e)}",
        }


@router.patch("/faculty/config/registrations")
async def update_registration_config(req: RegistrationConfigUpdateRequest, authorization: str = Header(None)):
    verify_faculty_token(authorization)

    try:
        current = fetch_registration_config()

        updates = {}
        if req.student_open is not None:
            updates["student_open"] = req.student_open
        if req.participant_open is not None:
            updates["participant_open"] = req.participant_open
        if req.volunteer_open is not None:
            updates["volunteer_open"] = req.volunteer_open

        if not updates:
            return {
                "success": True,
                "data": current,
                "message": "No registration config changes provided",
            }

        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        response = (
            supabase.table("registration_config")
            .update(updates)
            .eq("id", 1)
            .execute()
        )

        updated_row = response.data[0] if response.data else {**current, **updates}
        return {
            "success": True,
            "data": normalize_registration_config_row(updated_row),
            "message": "Registration config updated successfully",
        }
    except Exception as e:
        return {
            "success": False,
            "data": None,
            "message": f"Failed to update registration config: {str(e)}",
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
        return build_validation_success(
            {
                "name": rec.get("name"),
                "role": "Student",
                "course": rec.get("course"),
                "year": rec.get("year"),
                "roll_no": rec.get("roll_no"),
                "registration_id": rec.get("id"),
            },
            "students",
            str(rec.get("id")),
        )

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
        return build_validation_success(
            {
                "name": rec.get("name"),
                "role": "Participant",
                "course": rec.get("course"),
                "year": rec.get("year"),
                "roll_no": rec.get("roll_no"),
                "events": event_names,
                "registration_id": rec.get("id"),
            },
            "participants",
            str(rec.get("id")),
        )

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
        return build_validation_success(
            {
                "name": rec.get("name"),
                "role": "Volunteer",
                "course": rec.get("course"),
                "year": rec.get("year"),
                "roll_no": rec.get("roll_no"),
                "team_label": rec.get("team_label") or rec.get("volunteer_role") or "",
                "registration_id": rec.get("id"),
            },
            "volunteers",
            str(rec.get("id")),
        )

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
        return build_validation_success(
            {
                "name": rec.get("leader_name"),
                "role": "Group Leader",
                "course": rec.get("leader_course"),
                "year": rec.get("leader_year"),
                "roll_no": rec.get("leader_roll_no"),
                "team_label": rec.get("team_name", ""),
                "group_name": rec.get("team_name", ""),
                "registration_id": rec.get("id"),
            },
            "group_registrations",
            str(rec.get("id")),
        )

    # Search group members (inherits approval from parent group)
    r = supabase.table("group_members").select("*").eq("id", lookup_id).limit(1).execute()
    if r.data:
        rec = r.data[0]
        group_id = rec.get("group_id")
        group_response = (
            supabase.table("group_registrations")
            .select("id, team_name, event_name, event_id, qr_code, approved_at")
            .eq("id", group_id)
            .limit(1)
            .execute()
        )
        group_record = (group_response.data or [None])[0]

        if not group_record or not (group_record.get("qr_code") or group_record.get("approved_at")):
            return {
                "success": True,
                "valid": False,
                "message": "Registration pending approval.",
            }

        return build_validation_success(
            {
                "name": rec.get("name"),
                "role": "Group Participant",
                "course": rec.get("course"),
                "year": rec.get("year"),
                "roll_no": rec.get("roll_no"),
                "team_label": group_record.get("team_name", ""),
                "group_name": group_record.get("team_name", ""),
                "events": [group_record.get("event_name") or group_record.get("event_id") or ""],
                "registration_id": rec.get("id"),
                "group_id": group_id,
            },
            "group_members",
            str(rec.get("id")),
        )

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
        summary = fetch_table_summary("students", include_approved_today=True)
        current_page, total_pages, start, end = get_pagination_bounds(summary["total"], page, page_size)

        students = []
        if summary["total"] > 0:
            try:
                response = fetch_with_retry(
                    lambda: supabase.table("students")
                    .select("id, name, roll_no, course, year, email, phone, registered_at, approved_at")
                    .order("registered_at", desc=True)
                    .range(start, end)
                    .execute(),
                    attempts=3,
                )
            except Exception:
                response = fetch_with_retry(
                    lambda: supabase.table("students")
                    .select("id, name, roll_no, course, year, email, phone, registered_at")
                    .order("registered_at", desc=True)
                    .range(start, end)
                    .execute(),
                    attempts=3,
                )
            students = response.data or []

        student_ids = [str(student.get("id")) for student in students if student.get("id")]
        approved_ids = fetch_approved_ids_for_records("students", student_ids)

        for student in students:
            student_id = str(student.get("id") or "")
            student["is_approved"] = student_id in approved_ids
            student["approved"] = student["is_approved"]

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
        summary = fetch_table_summary("participants", include_approved_today=True)
        current_page, total_pages, start, end = get_pagination_bounds(summary["total"], page, page_size)

        participants = []
        if summary["total"] > 0:
            try:
                participants_response = fetch_with_retry(
                    lambda: supabase.table("participants")
                    .select("id, name, roll_no, course, year, email, phone, registered_at, approved_at")
                    .order("registered_at", desc=True)
                    .range(start, end)
                    .execute(),
                    attempts=3,
                )
            except Exception:
                participants_response = fetch_with_retry(
                    lambda: supabase.table("participants")
                    .select("id, name, roll_no, course, year, email, phone, registered_at")
                    .order("registered_at", desc=True)
                    .range(start, end)
                    .execute(),
                    attempts=3,
                )
            participants = participants_response.data or []
        
        participant_ids = [participant.get("id") for participant in participants if participant.get("id")]
        approved_ids = fetch_approved_ids_for_records("participants", [str(pid) for pid in participant_ids])
        events_map = fetch_participant_events_map(participant_ids)

        # Attach events to each participant using batched lookup map.
        for participant in participants:
            participant_id = participant.get("id")
            participant["events"] = events_map.get(participant_id, [])
            participant_id_str = str(participant_id or "")
            participant["is_approved"] = participant_id_str in approved_ids
            participant["approved"] = participant["is_approved"]
        
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
            members_response = (
                supabase.table("group_members")
                .select("id, name, roll_no, course, year")
                .eq("group_id", record.get("id"))
                .execute()
            )
            members = members_response.data or []
            member_count = len(members)

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

            group_event_name = str(record.get("event_name") or "").strip()
            group_event_id = str(record.get("event_id") or "").strip()

            bundle_files: list[tuple[str, bytes]] = []

            leader_pdf = pass_png_base64_to_pdf_bytes(pass_base64)
            leader_filename = f"00_leader_{sanitize_filename(record.get('leader_name'), 'leader')}.pdf"
            bundle_files.append((leader_filename, leader_pdf))

            for idx, member in enumerate(members, start=1):
                member_pass_base64 = generate_participant_pass(
                    {
                        "id": str(member.get("id")),
                        "name": member.get("name"),
                        "roll_no": member.get("roll_no"),
                        "course": member.get("course"),
                        "year": member.get("year"),
                        "events": [
                            {
                                "event_id": group_event_id,
                                "event_name": group_event_name,
                            }
                        ],
                    },
                    logo_path=LOGO_PATH,
                )

                try:
                    supabase.table("group_members").update(
                        {
                            "qr_code": member_pass_base64,
                            "approved_at": datetime.now(timezone.utc).isoformat(),
                        }
                    ).eq("id", member.get("id")).execute()
                except Exception:
                    # Backward compatibility when group_members does not have qr_code/approved_at columns.
                    pass

                member_pdf = pass_png_base64_to_pdf_bytes(member_pass_base64)
                safe_name = sanitize_filename(member.get("name"), f"member_{idx}")
                safe_roll = sanitize_filename(member.get("roll_no"), f"roll_{idx}")
                member_filename = f"{idx:02d}_{safe_name}_{safe_roll}.pdf"
                bundle_files.append((member_filename, member_pdf))

            zip_bundle = build_zip_bundle(bundle_files)
            send_group_bundle_email(
                to_email=record.get("leader_email"),
                leader_name=record.get("leader_name", "Group Leader"),
                registration_id=str(record.get("id")),
                team_name=str(record.get("team_name") or "Team"),
                event_name=group_event_name or "Group Event",
                bundle_bytes=zip_bundle,
                total_passes=len(bundle_files),
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
            "Roll No",
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
            "Roll No",
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
        summary = fetch_table_summary("volunteers")
        current_page, total_pages, start, end = get_pagination_bounds(summary["total"], page, page_size)

        volunteer_records = []
        if summary["total"] > 0:
            try:
                response = fetch_with_retry(
                    lambda: supabase.table("volunteers")
                    .select("id, name, roll_no, course, year, email, phone, motivation, volunteer_role, role, team_label, registered_at, approved_at")
                    .order("registered_at", desc=True)
                    .range(start, end)
                    .execute(),
                    attempts=3,
                )
            except Exception:
                try:
                    response = fetch_with_retry(
                        lambda: supabase.table("volunteers")
                        .select("id, name, roll_no, course, year, email, phone, motivation, role, team_label, registered_at")
                        .order("registered_at", desc=True)
                        .range(start, end)
                        .execute(),
                        attempts=3,
                    )
                except Exception:
                    response = fetch_with_retry(
                        lambda: supabase.table("volunteers")
                        .select("id, name, roll_no, course, year, email, phone, motivation, team_label, registered_at")
                        .order("registered_at", desc=True)
                        .range(start, end)
                        .execute(),
                        attempts=3,
                    )
            volunteer_records = response.data or []

        volunteer_ids = [str(volunteer.get("id")) for volunteer in volunteer_records if volunteer.get("id")]
        approved_ids = fetch_approved_ids_for_records("volunteers", volunteer_ids)

        data = []
        for volunteer in volunteer_records:
            role_value = volunteer.get("volunteer_role") or volunteer.get("role") or ""
            volunteer_id = str(volunteer.get("id") or "")
            data.append(
                {
                    "id": volunteer.get("id"),
                    "name": volunteer.get("name"),
                    "roll_no": volunteer.get("roll_no"),
                    "course": volunteer.get("course"),
                    "year": volunteer.get("year"),
                    "email": volunteer.get("email"),
                    "phone": volunteer.get("phone"),
                    "team_label": volunteer.get("team_label") or "",
                    "volunteer_role": role_value,
                    "registered_at": volunteer.get("registered_at"),
                    "approved_at": volunteer.get("approved_at"),
                    "is_approved": volunteer_id in approved_ids,
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
        summary = fetch_table_summary("group_registrations")
        current_page, total_pages, start, end = get_pagination_bounds(summary["total"], page, page_size)

        group_records = []
        if summary["total"] > 0:
            try:
                response = fetch_with_retry(
                    lambda: supabase.table("group_registrations")
                    .select("id, team_name, event_id, event_name, leader_name, leader_roll_no, leader_course, leader_year, leader_email, leader_phone, registered_at, approved_at")
                    .order("registered_at", desc=True)
                    .range(start, end)
                    .execute(),
                    attempts=3,
                )
            except Exception:
                response = fetch_with_retry(
                    lambda: supabase.table("group_registrations")
                    .select("id, team_name, event_id, leader_name, leader_roll_no, leader_course, leader_year, leader_email, leader_phone, registered_at")
                    .order("registered_at", desc=True)
                    .range(start, end)
                    .execute(),
                    attempts=3,
                )
            group_records = response.data or []

        group_ids = [str(group.get("id")) for group in group_records if group.get("id")]
        approved_ids = fetch_approved_ids_for_records("group_registrations", group_ids)

        data = []
        for group in group_records:
            group_id = str(group.get("id") or "")
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
                    "event_name": group.get("event_name") or event_id_to_label(group.get("event_id")),
                    "registered_at": group.get("registered_at"),
                    "approved_at": group.get("approved_at"),
                    "is_approved": group_id in approved_ids,
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

        try:
            supabase.table("group_members").update(
                {"approved_at": approval_timestamp}
            ).eq("group_id", group_id).execute()
        except Exception:
            # Backward compatibility for schemas where approved_at does not exist on group_members.
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


@router.post("/faculty/volunteer/{volunteer_id}/assign-team")
async def assign_volunteer_team(
    volunteer_id: str,
    req: VolunteerTeamAssignmentRequest,
    authorization: str = Header(None),
):
    """Assign or update a volunteer team label from faculty dashboard."""
    verify_faculty_token(authorization)

    try:
        team_label = (req.team_label or "").strip()
        if not team_label:
            raise HTTPException(status_code=400, detail="Team label is required")

        if team_label not in VOLUNTEER_TEAM_OPTIONS:
            raise HTTPException(status_code=400, detail="Invalid team label selected")

        existing = (
            supabase.table("volunteers")
            .select("id, name, roll_no, course, year, email, team_label, qr_code")
            .eq("id", volunteer_id)
            .limit(1)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Volunteer registration not found")

        volunteer = existing.data[0]

        team_id = re.sub(r"[^a-z0-9]+", "-", team_label.lower()).strip("-")

        try:
            update_payload = {"team_label": team_label, "team_id": team_id or None}
            supabase.table("volunteers").update(update_payload).eq("id", volunteer_id).execute()
        except Exception:
            # Backward compatibility for schemas without team_id.
            supabase.table("volunteers").update({"team_label": team_label}).eq("id", volunteer_id).execute()

        pass_updated = False
        if volunteer.get("qr_code"):
            updated_pass = generate_volunteer_pass(
                {
                    "id": str(volunteer_id),
                    "name": volunteer.get("name"),
                    "roll_no": volunteer.get("roll_no"),
                    "course": volunteer.get("course"),
                    "year": volunteer.get("year"),
                    "team_label": team_label,
                },
                logo_path=LOGO_PATH,
            )
            supabase.table("volunteers").update({"qr_code": updated_pass}).eq("id", volunteer_id).execute()
            pass_updated = True

        return {
            "success": True,
            "data": {
                "id": volunteer_id,
                "team_label": team_label,
                "team_id": team_id,
                "pass_updated": pass_updated,
            },
            "message": "Volunteer team assigned successfully",
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
            "id, team_name, event_id, event_name, leader_name, leader_roll_no, leader_course, leader_year, leader_email, qr_code"
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

        members_response = (
            supabase.table("group_members")
            .select("id, name, roll_no, course, year")
            .eq("group_id", group_id)
            .execute()
        )
        members = members_response.data or []

        event_name = str(group.get("event_name") or "").strip()
        event_id = str(group.get("event_id") or "").strip()

        bundle_files: list[tuple[str, bytes]] = []
        leader_pdf = pass_png_base64_to_pdf_bytes(qr_code)
        leader_filename = f"00_leader_{sanitize_filename(group.get('leader_name'), 'leader')}.pdf"
        bundle_files.append((leader_filename, leader_pdf))

        for idx, member in enumerate(members, start=1):
            member_pass_base64 = generate_participant_pass(
                {
                    "id": str(member.get("id")),
                    "name": member.get("name"),
                    "roll_no": member.get("roll_no"),
                    "course": member.get("course"),
                    "year": member.get("year"),
                    "events": [
                        {
                            "event_id": event_id,
                            "event_name": event_name,
                        }
                    ],
                },
                logo_path=LOGO_PATH,
            )

            member_pdf = pass_png_base64_to_pdf_bytes(member_pass_base64)
            safe_name = sanitize_filename(member.get("name"), f"member_{idx}")
            safe_roll = sanitize_filename(member.get("roll_no"), f"roll_{idx}")
            member_filename = f"{idx:02d}_{safe_name}_{safe_roll}.pdf"
            bundle_files.append((member_filename, member_pdf))

        zip_bundle = build_zip_bundle(bundle_files)
        email_sent, email_error = send_group_bundle_email(
            to_email=group.get("leader_email"),
            leader_name=group.get("leader_name", "Group Leader"),
            registration_id=group_id,
            team_name=str(group.get("team_name") or "Team"),
            event_name=event_name or "Group Event",
            bundle_bytes=zip_bundle,
            total_passes=len(bundle_files),
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
            "Registration ID",
            "Name",
            "Roll No",
            "Course",
            "Year",
            "Team Label",
            "Motivation",
            "Email",
            "Phone",
            "Registered At",
            "Status",
        ]

        rows = []
        for volunteer in volunteers:
            rows.append([
                str(volunteer.get("id") or ""),
                str(volunteer.get("name") or ""),
                str(volunteer.get("roll_no") or ""),
                str(volunteer.get("course") or ""),
                str(volunteer.get("year") or ""),
                str(volunteer.get("team_label") or volunteer.get("volunteer_role") or volunteer.get("role") or ""),
                str(volunteer.get("motivation") or ""),
                str(volunteer.get("email") or ""),
                str(volunteer.get("phone") or ""),
                format_datetime_for_export(volunteer.get("registered_at")),
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
            "Registration ID",
            "Team Name",
            "Event Name",
            "Leader Name",
            "Leader Roll No",
            "Leader Course",
            "Leader Year",
            "Leader Email",
            "Leader Phone",
            "Registered At",
            "Status",
        ]

        rows = []
        for group in groups:
            rows.append([
                str(group.get("id") or ""),
                str(group.get("team_name") or group.get("group_name") or ""),
                str(group.get("event_name") or event_id_to_label(group.get("event_id") or "")),
                str(group.get("leader_name") or group.get("name") or ""),
                str(group.get("leader_roll_no") or group.get("roll_no") or ""),
                str(group.get("leader_course") or group.get("course") or ""),
                str(group.get("leader_year") or group.get("year") or ""),
                str(group.get("leader_email") or group.get("email") or ""),
                str(group.get("leader_phone") or group.get("phone") or ""),
                format_datetime_for_export(group.get("registered_at")),
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
