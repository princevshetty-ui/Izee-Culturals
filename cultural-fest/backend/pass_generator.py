from PIL import Image, ImageDraw, ImageFont
import qrcode
import base64
import io
import os
from typing import Optional, Dict, Any


# ━━━ TEMPLATE PATHS ━━━
TEMPLATES = {
    'participant': 'assets/templates/participant_template.png',
    'volunteer': 'assets/templates/volunteer_template.png',
    'student': 'assets/templates/student_template.png',
    'group': 'assets/templates/participant_template.png',
}

LOGO_PATH_DEFAULT = 'assets/logo.png'

# ━━━ COORDINATE CONSTANTS ━━━
TW = 1536  # template width
TH = 1024  # template height

# Header
HEADER_BOTTOM = 119

# Logo placement
LOGO_X = 52
LOGO_Y = 28
LOGO_SIZE = 72

# College name
COLLEGE_NAME_X = 140
COLLEGE_NAME_Y = 52

# Event title
EVENT_TITLE_RIGHT_X = 830

# Separator
SEPARATOR_X = 857

# Badge box
BADGE_X = 89
BADGE_Y = 200  # Moved slightly down
BADGE_W = 390
BADGE_H = 85

# Main content zone
CONTENT_X = 89
NAME_Y = 300  # Adjusted for new spacing
NAME_FONT_MAX_SIZE = 72  # Max font size for name (refined luxury theme)
NAME_FONT_MIN_SIZE = 48  # Min font size for name
DETAILS_Y_OFFSET = 40  # Increased spacing between name and details
SECTION_LABEL_OFFSET = 60  # Increased spacing between details and events
EVENT_LIST_OFFSET = 24  # Slightly increased spacing between event rows

# QR zone
QR_BOX_X1 = 953
QR_BOX_Y1 = 273
QR_BOX_X2 = 1373
QR_BOX_Y2 = 653
QR_SIZE = 340

QR_CENTER_X = (QR_BOX_X1 + QR_BOX_X2) // 2
QR_LABEL_Y = QR_BOX_Y2 + 20
QR_ID_Y = QR_BOX_Y2 + 50

# Footer
FOOTER_Y = 967

# Watermark
WATERMARK_CENTER_X = 236
WATERMARK_CENTER_Y = 649


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """
    Load a dependable font with graceful fallback across common Linux images.
    """
    font_pairs = [
        (
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        ),
        (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ),
        (
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        ),
        (
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ),
        (
            "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
            "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf",
        ),
        (
            "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        ),
    ]

    for bold_path, regular_path in font_pairs:
        path = bold_path if bold else regular_path
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue

    return ImageFont.load_default()


def hex_to_rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, alpha)


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    r, g, b, _ = hex_to_rgba(hex_color, 255)
    return (r, g, b)


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, start_size: int, min_size: int, bold: bool) -> tuple[str, ImageFont.FreeTypeFont, int, int]:
    font = get_font(start_size, bold=bold)
    w, h = text_size(draw, text, font)

    if w > max_width and start_size > min_size:
        font = get_font(min_size, bold=bold)
        w, h = text_size(draw, text, font)

    if w <= max_width:
        return text, font, w, h

    trimmed = text
    while len(trimmed) > 1:
        candidate = trimmed.rstrip() + "..."
        cw, ch = text_size(draw, candidate, font)
        if cw <= max_width:
            return candidate, font, cw, ch
        trimmed = trimmed[:-1]

    fallback = "..."
    fw, fh = text_size(draw, fallback, font)
    return fallback, font, fw, fh


def parse_rgba_string(value: str, fallback_hex: str) -> tuple[int, int, int, int]:
    """Parse rgba(r,g,b,a) strings; fallback to fallback_hex when invalid."""
    if not isinstance(value, str):
        return hex_to_rgba(fallback_hex, 255)

    stripped = value.strip().lower()
    if not stripped.startswith("rgba(") or not stripped.endswith(")"):
        return hex_to_rgba(fallback_hex, 255)

    try:
        parts = [p.strip() for p in stripped[5:-1].split(",")]
        if len(parts) != 4:
            return hex_to_rgba(fallback_hex, 255)
        r = max(0, min(255, int(float(parts[0]))))
        g = max(0, min(255, int(float(parts[1]))))
        b = max(0, min(255, int(float(parts[2]))))
        alpha_float = max(0.0, min(1.0, float(parts[3])))
        return (r, g, b, int(alpha_float * 255))
    except Exception:
        return hex_to_rgba(fallback_hex, 255)


def draw_radial_glow(
    base_img: Image.Image,
    center: tuple[int, int],
    radius: int,
    color_rgb: tuple[int, int, int],
    max_alpha: int,
) -> None:
    """Render a soft radial glow using layered translucent circles."""
    glow = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow, "RGBA")
    cx, cy = center
    for r in range(radius, 0, -3):
        t = 1.0 - (r / max(1, radius))
        alpha = int(max_alpha * (t ** 1.8))
        if alpha <= 0:
            continue
        gdraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color_rgb, alpha))
    base_img.alpha_composite(glow)


def generate_qr_code(data: Dict[str, Any], size: int = 200) -> Image.Image:
    """
    Generate a QR code from a dictionary with transparent background.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(str(data))
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="#000000", back_color="#FFFFFF").convert("RGBA")
    qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)

    # Convert white background to transparent.
    pixels = list(qr_img.getdata())
    transparent_pixels = []
    for r, g, b, a in pixels:
        if r > 245 and g > 245 and b > 245:
            transparent_pixels.append((255, 255, 255, 0))
        else:
            transparent_pixels.append((0, 0, 0, 255))
    qr_img.putdata(transparent_pixels)
    return qr_img


def get_color_scheme(role: str) -> dict:
    """Return role-specific color palette for template-based passes."""
    schemes = {
        'participant': {
            'accent': '#C9A84C',
            'accent_rgb': (201, 168, 76),
            'badge_fill': (139, 26, 26, 220),
            'badge_text': (255, 255, 255, 255),
            'badge_label': 'PARTICIPANT',
            'text_primary': (245, 237, 216, 255),
            'text_secondary': (245, 237, 216, 170),
            'text_dim': (245, 237, 216, 100),
            'section_label': (201, 168, 76, 180),
        },
        'volunteer': {
            'accent': '#2DD4BF',
            'accent_rgb': (45, 212, 191),
            'badge_fill': (13, 92, 82, 220),
            'badge_text': (255, 255, 255, 255),
            'badge_label': 'VOLUNTEER',
            'text_primary': (224, 250, 247, 255),
            'text_secondary': (224, 250, 247, 170),
            'text_dim': (224, 250, 247, 100),
            'section_label': (45, 212, 191, 180),
        },
        'student': {
            'accent': '#C9A84C',
            'accent_rgb': (201, 168, 76),
            'badge_fill': (155, 27, 48, 220),
            'badge_text': (255, 255, 255, 255),
            'badge_label': 'AUDIENCE',
            'text_primary': (245, 237, 216, 255),
            'text_secondary': (245, 237, 216, 170),
            'text_dim': (245, 237, 216, 100),
            'section_label': (201, 168, 76, 180),
        },
        'group': {
            'accent': '#C9A84C',
            'accent_rgb': (201, 168, 76),
            'badge_fill': (139, 26, 26, 220),
            'badge_text': (255, 255, 255, 255),
            'badge_label': 'GROUP EVENT',
            'text_primary': (245, 237, 216, 255),
            'text_secondary': (245, 237, 216, 170),
            'text_dim': (245, 237, 216, 100),
            'section_label': (201, 168, 76, 180),
        },
    }
    return schemes.get(role, schemes['participant'])


def generate_admit_pass(
    role: str,
    data: Dict[str, Any],
    logo_path: Optional[str] = None
) -> str:
    """
    Generate a digital admit pass using a template PNG as background.
    Overlays text, logo, and QR code on the template.
    """
    role = (role or 'participant').lower()
    colors = get_color_scheme(role)
    accent_rgb = colors['accent_rgb']

    # ── STEP 1: LOAD TEMPLATE ──
    template_file = TEMPLATES.get(role, TEMPLATES['participant'])
    
    if not os.path.exists(template_file):
        # Fallback: create plain dark background
        img = Image.new('RGBA', (TW, TH), (13, 10, 4, 255))
    else:
        img = Image.open(template_file).convert('RGBA')
        # Ensure correct size
        if img.size != (TW, TH):
            img = img.resize((TW, TH), Image.Resampling.LANCZOS)

    draw = ImageDraw.Draw(img, 'RGBA')

    # ── STEP 2: OVERLAY LOGO ──
    actual_logo = logo_path or LOGO_PATH_DEFAULT
    
    if actual_logo and os.path.exists(actual_logo):
        try:
            logo = Image.open(actual_logo).convert('RGBA')
            logo = logo.resize((LOGO_SIZE, LOGO_SIZE), Image.Resampling.LANCZOS)
            img.alpha_composite(logo, (LOGO_X, LOGO_Y))
        except Exception:
            pass

    # ── STEP 3: COLLEGE NAME ──
    college_font = get_font(22, bold=False)
    draw.text(
        (COLLEGE_NAME_X, COLLEGE_NAME_Y),
        "IZee Business School",
        font=college_font,
        fill=colors['text_secondary']
    )

    # ── STEP 4: EVENT TITLE ──
    event_title = "IZEE CULTURALS 2026"
    event_font = get_font(28, bold=True)
    etw, eth = text_size(draw, event_title, event_font)
    draw.text(
        (EVENT_TITLE_RIGHT_X - etw, 48),
        event_title,
        font=event_font,
        fill=(*accent_rgb, 255)
    )

    # ── STEP 5: ROLE BADGE ──
    badge_label = colors['badge_label']
    badge_font = get_font(28, bold=True)
    
    draw.rectangle(
        [BADGE_X, BADGE_Y, BADGE_X + BADGE_W, BADGE_Y + BADGE_H],
        fill=colors['badge_fill']
    )
    
    blw, blh = text_size(draw, badge_label, badge_font)
    badge_text_x = BADGE_X + (BADGE_W - blw) // 2
    badge_text_y = BADGE_Y + (BADGE_H - blh) // 2
    draw.text(
        (badge_text_x, badge_text_y),
        badge_label,
        font=badge_font,
        fill=colors['badge_text']
    )

    # ── STEP 6: MAIN NAME ──
    if role == 'group':
        raw_name = str(data.get('team_name') or 'N/A')
    else:
        raw_name = str(data.get('name') or 'N/A')

    display_name, name_font, name_w, name_h = fit_text(
        draw,
        raw_name,
        max_width=700,
        start_size=NAME_FONT_MAX_SIZE,
        min_size=NAME_FONT_MIN_SIZE,
        bold=True,
    )

    draw.text(
        (CONTENT_X, NAME_Y),
        display_name,
        font=name_font,
        fill=colors['text_primary']
    )
    name_bottom = NAME_Y + name_h

    # ── STEP 7: DETAILS ROW ──
    details_y = name_bottom + DETAILS_Y_OFFSET

    bold_font = get_font(30, bold=True)
    reg_font = get_font(30, bold=False)
    sep_font = get_font(30, bold=False)

    if role == 'group':
        roll = str(data.get('leader_roll_no') or 'N/A')
        course = "Group Leader"
        year = str(data.get('event_name') or '')
    else:
        roll = str(data.get('roll_no') or 'N/A')
        course = str(data.get('course') or 'N/A')
        year = str(data.get('year') or 'N/A')
        if not year.lower().endswith('year'):
            year = year + ' Year'

    cursor_x = CONTENT_X

    # Roll No
    draw.text((cursor_x, details_y), roll,
              font=bold_font, fill=colors['text_primary'])
    rw, rh = text_size(draw, roll, bold_font)
    cursor_x += rw

    # Separator 1
    sep = "  ·  "
    draw.text((cursor_x, details_y), sep,
              font=sep_font, fill=(*accent_rgb, 200))
    sw, _ = text_size(draw, sep, sep_font)
    cursor_x += sw

    # Course
    draw.text((cursor_x, details_y), course,
              font=reg_font, fill=colors['text_secondary'])
    cw, _ = text_size(draw, course, reg_font)
    cursor_x += cw

    # Separator 2
    draw.text((cursor_x, details_y), sep,
              font=sep_font, fill=(*accent_rgb, 200))
    cursor_x += sw

    # Year
    draw.text((cursor_x, details_y), year,
              font=reg_font, fill=colors['text_secondary'])

    details_bottom = details_y + rh

    # ── STEP 8: ROLE-SPECIFIC CONTENT ──
    label_font = get_font(22, bold=True)
    event_name_font = get_font(32, bold=False)
    cat_font = get_font(22, bold=False)
    value_font = get_font(36, bold=True)
    note_font = get_font(24, bold=False)

    section_y = details_bottom + SECTION_LABEL_OFFSET

    if role == 'participant':
        label_text = "R E G I S T E R E D   E V E N T S"
        draw.text(
            (CONTENT_X, section_y),
            label_text,
            font=label_font,
            fill=colors['section_label']
        )
        _, label_h = text_size(draw, label_text, label_font)

        events = data.get('events', []) or []
        regular_events = []
        others_event = None

        for ev in events:
            eid = str(ev.get('event_id') or ev.get('id') or '').lower()
            ename = str(ev.get('event_name') or ev.get('name') or '').strip()
            if eid == 'others' or ename.lower() == 'others':
                others_event = ev
            elif ename:
                regular_events.append(ev)

        row_y = section_y + label_h + EVENT_LIST_OFFSET

        for ev in regular_events[:3]:
            ename = str(ev.get('event_name') or ev.get('name') or 'Event')
            category = str(ev.get('category_label') or '').strip()

            # Small filled square bullet
            sq_y = row_y + 10
            draw.rectangle(
                [CONTENT_X, sq_y, CONTENT_X + 12, sq_y + 12],
                fill=(*accent_rgb, 200)
            )

            # Event name
            draw.text(
                (CONTENT_X + 24, row_y),
                ename,
                font=event_name_font,
                fill=colors['text_primary']
            )
            enw, enh = text_size(draw, ename, event_name_font)

            # Category label
            if category and category.lower() != 'others':
                draw.text(
                    (CONTENT_X + 24 + enw + 20, row_y + 5),
                    category,
                    font=cat_font,
                    fill=colors['text_dim']
                )

            row_y += enh + 16

        if others_event:
            desc = str(others_event.get('others_description') or '').strip()
            draw.rectangle(
                [CONTENT_X, row_y + 10, CONTENT_X + 12, row_y + 22],
                fill=(*accent_rgb, 150)
            )
            others_label = f"Others" + (f": {desc[:40]}" if desc else "")
            draw.text(
                (CONTENT_X + 24, row_y),
                others_label,
                font=event_name_font,
                fill=colors['text_secondary']
            )

    elif role == 'volunteer':
        label_text = "T E A M   A S S I G N M E N T"
        draw.text(
            (CONTENT_X, section_y),
            label_text,
            font=label_font,
            fill=colors['section_label']
        )
        _, label_h = text_size(draw, label_text, label_font)

        team = str(data.get('team_label') or '').strip()
        team_text = team if team else "Pending Assignment"

        draw.text(
            (CONTENT_X, section_y + label_h + EVENT_LIST_OFFSET),
            team_text,
            font=value_font,
            fill=colors['text_primary']
        )

        if not team:
            _, vh = text_size(draw, team_text, value_font)
            draw.text(
                (CONTENT_X, section_y + label_h + EVENT_LIST_OFFSET + vh + 12),
                "Faculty will confirm your team assignment",
                font=note_font,
                fill=colors['text_dim']
            )

    elif role == 'student':
        label_text = "P A S S   T Y P E"
        draw.text(
            (CONTENT_X, section_y),
            label_text,
            font=label_font,
            fill=colors['section_label']
        )
        _, label_h = text_size(draw, label_text, label_font)

        draw.text(
            (CONTENT_X, section_y + label_h + EVENT_LIST_OFFSET),
            "General Audience",
            font=value_font,
            fill=colors['text_primary']
        )
        _, vh = text_size(draw, "General Audience", value_font)

        draw.text(
            (CONTENT_X, section_y + label_h + EVENT_LIST_OFFSET + vh + 12),
            "Full Access  ·  Main Auditorium  ·  24 April 2026",
            font=note_font,
            fill=colors['text_dim']
        )

    elif role == 'group':
        label_text = "G R O U P   R E G I S T R A T I O N"
        draw.text(
            (CONTENT_X, section_y),
            label_text,
            font=label_font,
            fill=colors['section_label']
        )
        _, label_h = text_size(draw, label_text, label_font)

        event_nm = str(data.get('event_name') or 'Event')
        team_nm = str(data.get('team_name') or 'N/A')
        member_count = int(data.get('member_count') or 0)

        base_y = section_y + label_h + EVENT_LIST_OFFSET
        draw.text((CONTENT_X, base_y), event_nm,
                  font=value_font, fill=(*accent_rgb, 255))
        _, evh = text_size(draw, event_nm, value_font)

        draw.text((CONTENT_X, base_y + evh + 10), team_nm,
                  font=event_name_font, fill=colors['text_secondary'])
        _, tnh = text_size(draw, team_nm, event_name_font)

        draw.text(
            (CONTENT_X, base_y + evh + 10 + tnh + 10),
            f"Team of {member_count + 1} members",
            font=note_font,
            fill=colors['text_dim']
        )

    # ── STEP 9: WATERMARK LOGO ──
    actual_logo = logo_path or LOGO_PATH_DEFAULT
    if actual_logo and os.path.exists(actual_logo):
        try:
            wm = Image.open(actual_logo).convert('RGBA')
            wm_size = 280
            wm = wm.resize((wm_size, wm_size), Image.Resampling.LANCZOS)

            # Make very faint
            wm_pixels = list(wm.getdata())
            faint = [(r, g, b, int(a * 0.07)) for r, g, b, a in wm_pixels]
            wm.putdata(faint)

            # Position: centered on watermark coordinates
            wm_x = WATERMARK_CENTER_X - wm_size // 2
            wm_y = WATERMARK_CENTER_Y - wm_size // 2
            img.alpha_composite(wm, (max(0, wm_x), max(0, wm_y)))
        except Exception:
            pass

    # ── STEP 10: QR CODE ──
    qr_data = {
        'type': role,
        'id': str(data.get('id') or ''),
        'name': raw_name,
        'verified': True
    }

    qr_img = generate_qr_code(qr_data, size=QR_SIZE)

    # Center QR in the box
    qr_center_x = (QR_BOX_X1 + QR_BOX_X2) // 2
    qr_center_y = (QR_BOX_Y1 + QR_BOX_Y2) // 2

    qr_paste_x = qr_center_x - QR_SIZE // 2
    qr_paste_y = qr_center_y - QR_SIZE // 2

    # White background behind QR
    padding = 20
    draw.rectangle(
        [
            qr_paste_x - padding,
            qr_paste_y - padding,
            qr_paste_x + QR_SIZE + padding,
            qr_paste_y + QR_SIZE + padding
        ],
        fill=(255, 255, 255, 255)
    )

    # Paste QR
    img.alpha_composite(qr_img, (qr_paste_x, qr_paste_y))

    # ── STEP 11: QR LABELS ──
    scan_font = get_font(20, bold=False)
    id_font = get_font(22, bold=True)

    scan_text = "SCAN TO VERIFY"
    stw, _ = text_size(draw, scan_text, scan_font)
    draw.text(
        (QR_CENTER_X - stw // 2, QR_LABEL_Y),
        scan_text,
        font=scan_font,
        fill=colors['text_dim']
    )

    pass_id = str(data.get('id') or 'N/A')[:8].upper()
    id_text = f"ID: {pass_id}"
    idw, _ = text_size(draw, id_text, id_font)
    draw.text(
        (QR_CENTER_X - idw // 2, QR_ID_Y),
        id_text,
        font=id_font,
        fill=(*accent_rgb, 160)
    )

    # ── STEP 12: SAVE AND RETURN ──
    final = img.convert('RGB')
    buffer = io.BytesIO()
    final.save(buffer, format='PNG', optimize=False, compress_level=1)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def generate_participant_pass(data: Dict[str, Any], logo_path: Optional[str] = None) -> str:
    return generate_admit_pass("participant", data, logo_path)


def generate_volunteer_pass(data: Dict[str, Any], logo_path: Optional[str] = None) -> str:
    return generate_admit_pass("volunteer", data, logo_path)


def generate_student_pass(data: Dict[str, Any], logo_path: Optional[str] = None) -> str:
    return generate_admit_pass("student", data, logo_path)


def generate_group_pass(data: Dict[str, Any], logo_path: Optional[str] = None) -> str:
    return generate_admit_pass("group", data, logo_path)
