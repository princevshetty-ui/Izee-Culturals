from PIL import Image, ImageDraw, ImageFont
import qrcode
import base64
import io
import os
from typing import Optional, Dict, Any


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


def get_color_scheme(role: str) -> Dict[str, str]:
    """Return role-specific premium color palette."""
    schemes = {
        "participant": {
            "bg": "#0D0A04",
            "bg_secondary": "#1A1100",
            "accent1": "#C9A84C",
            "accent2": "#E8D07A",
            "accent3": "#6B4F0A",
            "crimson": "#8B1A1A",
            "crimson_light": "#C41E3A",
            "text_primary": "#F5EDD8",
            "text_secondary": "rgba(245,237,216,0.68)",
            "text_dim": "rgba(245,237,216,0.38)",
            "badge_text": "PARTICIPANT",
            "badge_bg": "crimson",
        },
        "volunteer": {
            "bg": "#030F0E",
            "bg_secondary": "#071815",
            "accent1": "#2DD4BF",
            "accent2": "#5EEAD4",
            "accent3": "#0D5C52",
            "crimson": "#0D5C52",
            "crimson_light": "#14B8A6",
            "text_primary": "#E0FAF7",
            "text_secondary": "rgba(224,250,247,0.68)",
            "text_dim": "rgba(224,250,247,0.38)",
            "badge_text": "VOLUNTEER",
            "badge_bg": "teal",
        },
        "student": {
            "bg": "#060408",
            "bg_secondary": "#0F080E",
            "accent1": "#C9A84C",
            "accent2": "#E8D07A",
            "accent3": "#4A1528",
            "crimson": "#9B1B30",
            "crimson_light": "#C41E3A",
            "text_primary": "#F0EBF5",
            "text_secondary": "rgba(240,235,245,0.68)",
            "text_dim": "rgba(240,235,245,0.38)",
            "badge_text": "AUDIENCE",
            "badge_bg": "crimson",
        },
        "group": {
            "bg": "#0D0A04",
            "bg_secondary": "#1A1100",
            "accent1": "#C9A84C",
            "accent2": "#E8D07A",
            "accent3": "#6B4F0A",
            "crimson": "#8B1A1A",
            "crimson_light": "#C41E3A",
            "text_primary": "#F5EDD8",
            "text_secondary": "rgba(245,237,216,0.68)",
            "text_dim": "rgba(245,237,216,0.38)",
            "badge_text": "GROUP EVENT",
            "badge_bg": "crimson",
        },
    }
    return schemes.get((role or "participant").lower(), schemes["participant"])


def generate_admit_pass(
    role: str,
    data: Dict[str, Any],
    logo_path: Optional[str] = None
) -> str:
    """
    Generate a digital admit pass as base64-encoded PNG.
    """
    role = (role or "participant").lower()
    colors = get_color_scheme(role)

    W, H = 1100, 620
    LEFT_W = 720
    RIGHT_X = 740
    GAP = 20
    separator_x = LEFT_W + (GAP // 2)
    resolved_logo_path = logo_path or "assets/logo.png"

    accent1_rgb = hex_to_rgb(colors["accent1"])
    accent2_rgb = hex_to_rgb(colors["accent2"])
    accent3_rgb = hex_to_rgb(colors["accent3"])
    crimson_rgb = hex_to_rgb(colors.get("crimson", colors["accent1"]))

    text_primary_rgba = hex_to_rgba(colors["text_primary"], 255)
    text_secondary_rgba = parse_rgba_string(colors.get("text_secondary", ""), colors["text_primary"])
    text_dim_rgba = parse_rgba_string(colors.get("text_dim", ""), colors["text_primary"])

    # STEP 1 — BASE BACKGROUND
    img = Image.new("RGBA", (W, H), hex_to_rgba(colors["bg"], 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # STEP 2 — RICH BACKGROUND GRADIENT
    bg_rgb = hex_to_rgb(colors["bg"])
    for y in range(H):
        ratio = y / max(1, H)
        warm = int(10 * (1.0 - abs(ratio - 0.25) * 3))
        warm = max(0, min(10, warm))
        row_r = min(255, bg_rgb[0] + warm)
        row_g = min(255, bg_rgb[1] + warm // 2)
        row_b = min(255, bg_rgb[2] + max(0, warm // 4))
        draw.line([(0, y), (LEFT_W, y)], fill=(row_r, row_g, row_b, 8), width=1)

    # STEP 3 — ORNAMENTAL BORDER FRAME
    draw.rectangle([2, 2, W - 2, H - 2], outline=(*accent1_rgb, 120), width=1)
    draw.rectangle([8, 8, W - 8, H - 8], outline=(*accent1_rgb, 60), width=1)

    tl = (8, 8)
    tr = (W - 8, 8)
    bl = (8, H - 8)
    br = (W - 8, H - 8)

    for cx, cy, sx, sy in [
        (tl[0], tl[1], 1, 1),
        (tr[0], tr[1], -1, 1),
        (bl[0], bl[1], 1, -1),
        (br[0], br[1], -1, -1),
    ]:
        draw.line([(cx, cy), (cx + (16 * sx), cy)], fill=(*accent1_rgb, 120), width=1)
        draw.line([(cx, cy), (cx, cy + (16 * sy))], fill=(*accent1_rgb, 120), width=1)
        draw.polygon(
            [(cx, cy - 3), (cx + 3, cy), (cx, cy + 3), (cx - 3, cy)],
            fill=(*accent1_rgb, 200),
        )

    # STEP 4 — VERTICAL SEPARATOR
    draw.line([(separator_x, 40), (separator_x, H - 40)], fill=(*accent1_rgb, 50), width=1)
    draw.polygon(
        [
            (separator_x, (H // 2) - 3),
            (separator_x + 3, H // 2),
            (separator_x, (H // 2) + 3),
            (separator_x - 3, H // 2),
        ],
        fill=(*accent1_rgb, 150),
    )

    # STEP 5 — LEFT ZONE SUBTLE DOT GRID
    for grid_y in range(115, H - 50, 28):
        for grid_x in range(20, LEFT_W - 20, 28):
            draw.point((grid_x, grid_y), fill=(*accent1_rgb, 18))

    # STEP 6 — HEADER SECTION
    logo_x, logo_y, logo_size = 24, 20, 72
    if resolved_logo_path and os.path.exists(resolved_logo_path):
        try:
            logo = Image.open(resolved_logo_path).convert("RGBA")
            logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            img.alpha_composite(logo, (logo_x, logo_y))
        except Exception:
            shield = [
                (logo_x + 36, logo_y + 2),
                (logo_x + 66, logo_y + 18),
                (logo_x + 58, logo_y + 58),
                (logo_x + 36, logo_y + 70),
                (logo_x + 14, logo_y + 58),
                (logo_x + 6, logo_y + 18),
            ]
            draw.polygon(shield, fill=(*crimson_rgb, 210), outline=(*accent1_rgb, 220))
            iz_font = get_font(24, bold=True)
            iz_text = "IZ"
            izw, izh = text_size(draw, iz_text, iz_font)
            draw.text((logo_x + (logo_size - izw) // 2, logo_y + (logo_size - izh) // 2), iz_text, font=iz_font, fill=(*accent1_rgb, 255))
    else:
        shield = [
            (logo_x + 36, logo_y + 2),
            (logo_x + 66, logo_y + 18),
            (logo_x + 58, logo_y + 58),
            (logo_x + 36, logo_y + 70),
            (logo_x + 14, logo_y + 58),
            (logo_x + 6, logo_y + 18),
        ]
        draw.polygon(shield, fill=(*crimson_rgb, 210), outline=(*accent1_rgb, 220))
        iz_font = get_font(24, bold=True)
        iz_text = "IZ"
        izw, izh = text_size(draw, iz_text, iz_font)
        draw.text((logo_x + (logo_size - izw) // 2, logo_y + (logo_size - izh) // 2), iz_text, font=iz_font, fill=(*accent1_rgb, 255))

    college_font = get_font(15, bold=False)
    college_text = "IZee Business School"
    draw.text((108, 32), college_text, font=college_font, fill=text_secondary_rgba)

    trademark_font = get_font(11, bold=False)
    trademark_text = "Est. Cultural Excellence"
    draw.text((108, 54), trademark_text, font=trademark_font, fill=text_dim_rgba)

    title_font = get_font(20, bold=True)
    title_text = "IZEE CULTURALS 2026"
    title_w, _ = text_size(draw, title_text, title_font)
    draw.text((LEFT_W - 20 - title_w, 38), title_text, font=title_font, fill=(*accent1_rgb, 255))

    rule_y = 108
    mid_x = (20 + (LEFT_W - 20)) // 2
    left_start, left_end = 20, mid_x - 8
    right_start, right_end = mid_x + 8, LEFT_W - 20

    left_span = max(1, left_end - left_start)
    for x in range(left_start, left_end + 1):
        rel = (x - left_start) / left_span
        draw.point((x, rule_y), fill=(*accent1_rgb, int(220 * rel)))

    right_span = max(1, right_end - right_start)
    for x in range(right_start, right_end + 1):
        rel = (x - right_start) / right_span
        draw.point((x, rule_y), fill=(*accent1_rgb, int(220 * (1.0 - rel))))

    draw.polygon(
        [(mid_x, rule_y - 3), (mid_x + 4, rule_y), (mid_x, rule_y + 3), (mid_x - 4, rule_y)],
        fill=(*accent1_rgb, 180),
    )

    # STEP 7 — ROLE BADGE
    badge_x, badge_y = 24, 126
    badge_label = colors["badge_text"]
    badge_font = get_font(11, bold=True)
    bdw, bdh = text_size(draw, badge_label, badge_font)
    badge_w, badge_h = bdw + 32, 28

    if role in {"participant", "group", "student"}:
        badge_fill = crimson_rgb
        badge_text_color = (255, 255, 255, 255)
    else:
        badge_fill = accent1_rgb
        badge_text_color = hex_to_rgba(colors["bg"], 255)

    draw.rectangle(
        [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
        fill=(*badge_fill, 230),
        outline=(*accent1_rgb, 180),
        width=1,
    )
    draw.rectangle(
        [badge_x + 2, badge_y + 2, badge_x + badge_w - 2, badge_y + badge_h - 2],
        outline=(*accent1_rgb, 60),
        width=1,
    )
    draw.text(
        (badge_x + (badge_w - bdw) // 2, badge_y + (badge_h - bdh) // 2),
        badge_label,
        font=badge_font,
        fill=badge_text_color,
    )

    subtitle_font = get_font(12, bold=False)
    subtitle_text = "· IZee Culturals 2026"
    _, subtitle_h = text_size(draw, subtitle_text, subtitle_font)
    draw.text(
        (badge_x + badge_w + 14, badge_y + (badge_h - subtitle_h) // 2),
        subtitle_text,
        font=subtitle_font,
        fill=(*accent1_rgb, 140),
    )

    # STEP 8 — MAIN NAME
    if role == "group":
        name_text = str(data.get("team_name") or "N/A")
    else:
        name_text = str(data.get("name") or "N/A")

    year_raw = str(data.get("year") or "N/A").strip()
    if year_raw and year_raw.lower() != "n/a" and "year" not in year_raw.lower():
        year_text = f"{year_raw} Year"
    else:
        year_text = year_raw or "N/A"

    # Estimate content height to avoid overlap and adjust name sizing if needed.
    content_block_estimate = 0
    if role == "participant":
        events = data.get("events", []) or []
        regular_count = 0
        has_others = False
        for ev in events:
            e_name = str(ev.get("event_name") or ev.get("name") or "").strip()
            e_id = str(ev.get("event_id") or ev.get("id") or "").strip().lower()
            if e_id == "others" or e_name.lower() == "others":
                has_others = True
            elif e_name:
                regular_count += 1
        regular_count = min(3, regular_count)
        content_block_estimate = 26 + (regular_count * 30) + (36 if has_others else 0)
    elif role == "volunteer":
        content_block_estimate = 78
    elif role == "student":
        content_block_estimate = 76
    else:
        content_block_estimate = 88

    name_x = 24
    name_y = badge_y + badge_h + 22
    start_size = 52
    min_size = 38

    display_name, name_font, name_w, name_h = fit_text(
        draw,
        name_text,
        max_width=620,
        start_size=start_size,
        min_size=min_size,
        bold=True,
    )

    projected_bottom = name_y + name_h + 6 + 20 + 16 + 18 + 16 + content_block_estimate
    if projected_bottom > 520:
        display_name, name_font, name_w, name_h = fit_text(
            draw,
            name_text,
            max_width=620,
            start_size=44,
            min_size=34,
            bold=True,
        )

    draw.text((name_x, name_y), display_name, font=name_font, fill=text_primary_rgba)
    name_bottom = name_y + name_h

    # Decorative underline (3 lines)
    underline_y = name_bottom + 6
    underline_len = min(name_w, 200)
    for i in range(max(1, underline_len)):
        alpha_main = int(200 * (1.0 - i / max(1, underline_len - 1)))
        alpha_side = int(80 * (1.0 - i / max(1, underline_len - 1)))
        draw.rectangle([name_x + i, underline_y, name_x + i, underline_y + 1], fill=(*accent1_rgb, alpha_main))
        draw.point((name_x + i, underline_y - 3), fill=(*accent1_rgb, alpha_side))
        draw.point((name_x + i, underline_y + 3), fill=(*accent1_rgb, alpha_side))

    # STEP 9 — DETAILS ROW
    details_y = name_bottom + 20
    details_bold_font = get_font(16, bold=True)
    details_font = get_font(16, bold=False)
    sep_text = " · "

    if role == "group":
        roll_text = str(data.get("leader_roll_no") or "N/A")
        course_text = str(data.get("event_name") or "Group Event")
    else:
        roll_text = str(data.get("roll_no") or "N/A")
        course_text = str(data.get("course") or "N/A")

    cursor_x = 24
    draw.text((cursor_x, details_y), roll_text, font=details_bold_font, fill=text_primary_rgba)
    rw, rh = text_size(draw, roll_text, details_bold_font)
    cursor_x += rw

    draw.text((cursor_x, details_y), sep_text, font=details_font, fill=(*accent1_rgb, 180))
    sw, sh = text_size(draw, sep_text, details_font)
    cursor_x += sw

    draw.text((cursor_x, details_y), course_text, font=details_font, fill=text_secondary_rgba)
    cw, ch = text_size(draw, course_text, details_font)
    cursor_x += cw

    draw.text((cursor_x, details_y), sep_text, font=details_font, fill=(*accent1_rgb, 180))
    sw2, sh2 = text_size(draw, sep_text, details_font)
    cursor_x += sw2

    draw.text((cursor_x, details_y), year_text, font=details_font, fill=text_secondary_rgba)
    _, yh = text_size(draw, year_text, details_font)
    details_bottom = details_y + max(rh, sh, ch, sh2, yh)

    # STEP 10 — CONTENT DIVIDER
    divider_y = details_bottom + 18
    d_start, d_end = 24, LEFT_W - 24
    d_mid = (d_start + d_end) // 2

    for x in range(d_start, d_mid - 6):
        rel = (x - d_start) / max(1, (d_mid - 6 - d_start))
        alpha = int(170 * (1.0 - rel))
        draw.point((x, divider_y), fill=(*accent1_rgb, alpha))

    for x in range(d_mid + 6, d_end + 1):
        rel = (x - (d_mid + 6)) / max(1, (d_end - (d_mid + 6)))
        alpha = int(170 * rel)
        draw.point((x, divider_y), fill=(*accent1_rgb, alpha))

    draw.polygon(
        [(d_mid, divider_y - 2), (d_mid + 2, divider_y), (d_mid, divider_y + 2), (d_mid - 2, divider_y)],
        fill=(*accent1_rgb, 180),
    )

    # STEP 11 — ROLE CONTENT SECTION
    section_y = divider_y + 16
    section_label_font = get_font(10, bold=True)

    if role == "participant":
        label_text = " ".join(list("REGISTERED EVENTS"))
        _, label_h = text_size(draw, label_text, section_label_font)
        draw.text((24, section_y), label_text, font=section_label_font, fill=(*accent1_rgb, 160))

        y_cursor = section_y + label_h + 10
        events = data.get("events", []) or []
        regular_events = []
        others_event = None
        for ev in events:
            e_name = str(ev.get("event_name") or ev.get("name") or "").strip()
            e_id = str(ev.get("event_id") or ev.get("id") or "").strip().lower()
            if e_id == "others" or e_name.lower() == "others":
                others_event = ev
            elif e_name:
                regular_events.append(ev)

        event_font = get_font(17, bold=False)
        category_font = get_font(12, bold=False)

        for ev in regular_events[:3]:
            event_name = str(ev.get("event_name") or ev.get("name") or "").strip()
            category = str(ev.get("category_label") or "").strip()
            enw, eh = text_size(draw, event_name, event_font)

            cy = y_cursor + (eh // 2)
            draw.polygon([(24, cy - 2), (26, cy), (24, cy + 2), (22, cy)], fill=(*accent1_rgb, 200))
            draw.text((36, y_cursor), event_name, font=event_font, fill=text_primary_rgba)

            if category:
                sep_w, _ = text_size(draw, "  ·  ", category_font)
                draw.text((36 + enw + 8, y_cursor + 2), "·", font=category_font, fill=(*accent1_rgb, 170))
                draw.text((36 + enw + 8 + sep_w, y_cursor + 2), category, font=category_font, fill=text_dim_rgba)

            y_cursor += eh + 10

        if others_event:
            o_title = "Others"
            o_font = get_font(16, bold=True)
            _, oh = text_size(draw, o_title, o_font)
            cy = y_cursor + (oh // 2)
            draw.polygon([(24, cy - 2), (26, cy), (24, cy + 2), (22, cy)], fill=(*accent1_rgb, 200))
            draw.text((36, y_cursor), o_title, font=o_font, fill=text_primary_rgba)

            o_desc = str(others_event.get("others_description") or others_event.get("description") or "").strip()
            if o_desc:
                italic_candidates = [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
                    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
                    "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
                ]
                italic_font = None
                for path in italic_candidates:
                    if os.path.exists(path):
                        try:
                            italic_font = ImageFont.truetype(path, 12)
                            break
                        except Exception:
                            continue
                if italic_font is None:
                    italic_font = get_font(12, bold=False)
                draw.text((36, y_cursor + oh + 4), o_desc, font=italic_font, fill=text_dim_rgba)

    elif role == "volunteer":
        label_text = " ".join(list("TEAM ASSIGNMENT"))
        _, label_h = text_size(draw, label_text, section_label_font)
        draw.text((24, section_y), label_text, font=section_label_font, fill=(*accent1_rgb, 160))

        team = str(data.get("team_label") or "").strip()
        team_display = team if team else "Pending Assignment"
        team_font = get_font(21, bold=True)
        _, team_h = text_size(draw, team_display, team_font)
        team_y = section_y + label_h + 10
        draw.text((24, team_y), team_display, font=team_font, fill=text_primary_rgba if team else text_secondary_rgba)

        if not team:
            note_font = get_font(13, bold=False)
            note_text = "Faculty will confirm your team assignment"
            draw.text((24, team_y + team_h + 8), note_text, font=note_font, fill=text_dim_rgba)

    elif role == "student":
        label_text = " ".join(list("PASS TYPE"))
        _, label_h = text_size(draw, label_text, section_label_font)
        draw.text((24, section_y), label_text, font=section_label_font, fill=(*accent1_rgb, 160))

        value_text = "General Audience"
        value_font = get_font(21, bold=True)
        _, value_h = text_size(draw, value_text, value_font)
        value_y = section_y + label_h + 10
        draw.text((24, value_y), value_text, font=value_font, fill=text_primary_rgba)

        sub_text = "Full Access · Main Auditorium · 24 April 2026"
        sub_font = get_font(13, bold=False)
        draw.text((24, value_y + value_h + 8), sub_text, font=sub_font, fill=text_dim_rgba)

    elif role == "group":
        label_text = " ".join(list("GROUP REGISTRATION"))
        _, label_h = text_size(draw, label_text, section_label_font)
        draw.text((24, section_y), label_text, font=section_label_font, fill=(*accent1_rgb, 160))

        event_name = str(data.get("event_name") or "Event")
        team_name = str(data.get("team_name") or "N/A")
        raw_members = data.get("member_count")
        if raw_members is None:
            raw_members = len(data.get("members") or [])
        try:
            member_count = int(raw_members)
        except Exception:
            member_count = 0

        event_font = get_font(21, bold=True)
        team_font = get_font(17, bold=False)
        meta_font = get_font(13, bold=False)

        _, event_h = text_size(draw, event_name, event_font)
        _, team_h = text_size(draw, team_name, team_font)
        event_y = section_y + label_h + 10
        team_y = event_y + event_h + 6
        meta_y = team_y + team_h + 8

        draw.text((24, event_y), event_name, font=event_font, fill=(*accent1_rgb, 255))
        draw.text((24, team_y), team_name, font=team_font, fill=text_secondary_rgba)
        draw.text((24, meta_y), f"Team of {member_count + 1}", font=meta_font, fill=text_dim_rgba)

    # STEP 12 — BOTTOM CONTENT AREA WATERMARK TEXT
    wm_font = get_font(90, bold=True)
    wm_text = colors["badge_text"]
    wm_w, _ = text_size(draw, wm_text, wm_font)
    wm_x = (LEFT_W - wm_w) // 2
    wm_y = 390
    draw.text((wm_x, wm_y), wm_text, font=wm_font, fill=(*accent1_rgb, 5))

    # STEP 13 — RIGHT ZONE (QR PANEL)
    draw.rectangle([RIGHT_X, 12, W - 12, H - 12], fill=(*accent3_rgb, 40))

    for i in range(-H, 400, 20):
        draw.line(
            [(RIGHT_X + i, 12), (RIGHT_X + i + H, H - 12)],
            fill=(*accent1_rgb, 5),
            width=1,
        )

    panel_cx = (RIGHT_X + (W - 12)) // 2

    entry_label = "E N T R Y   P A S S"
    entry_font = get_font(11, bold=True)
    entry_w, entry_h = text_size(draw, entry_label, entry_font)
    entry_y = 36
    draw.text((panel_cx - entry_w // 2, entry_y), entry_label, font=entry_font, fill=(*accent1_rgb, 180))

    line_w = 60
    line_y = entry_y + entry_h + 8
    draw.line([(panel_cx - line_w // 2, line_y), (panel_cx + line_w // 2, line_y)], fill=(*accent1_rgb, 80), width=1)

    qr_size = 230
    padding = 14
    box_size = qr_size + (padding * 2)
    box_x = panel_cx - box_size // 2
    box_y = (H - box_size) // 2

    draw.rectangle([box_x, box_y, box_x + box_size, box_y + box_size], fill=(255, 255, 255, 255))

    mark_len = 16
    mark_w = 2
    off = 4
    # top-left
    draw.line([(box_x - off - mark_len, box_y - off), (box_x - off, box_y - off)], fill=(*accent1_rgb, 160), width=mark_w)
    draw.line([(box_x - off, box_y - off - mark_len), (box_x - off, box_y - off)], fill=(*accent1_rgb, 160), width=mark_w)
    # top-right
    draw.line([(box_x + box_size + off, box_y - off), (box_x + box_size + off + mark_len, box_y - off)], fill=(*accent1_rgb, 160), width=mark_w)
    draw.line([(box_x + box_size + off, box_y - off - mark_len), (box_x + box_size + off, box_y - off)], fill=(*accent1_rgb, 160), width=mark_w)
    # bottom-left
    draw.line([(box_x - off - mark_len, box_y + box_size + off), (box_x - off, box_y + box_size + off)], fill=(*accent1_rgb, 160), width=mark_w)
    draw.line([(box_x - off, box_y + box_size + off), (box_x - off, box_y + box_size + off + mark_len)], fill=(*accent1_rgb, 160), width=mark_w)
    # bottom-right
    draw.line([(box_x + box_size + off, box_y + box_size + off), (box_x + box_size + off + mark_len, box_y + box_size + off)], fill=(*accent1_rgb, 160), width=mark_w)
    draw.line([(box_x + box_size + off, box_y + box_size + off), (box_x + box_size + off, box_y + box_size + off + mark_len)], fill=(*accent1_rgb, 160), width=mark_w)

    qr_data = {
        "type": role,
        "id": str(data.get("id") or ""),
        "name": name_text,
        "event": str(data.get("event_name") or ""),
        "verified": True,
    }
    qr_img = generate_qr_code(qr_data, size=230)
    img.alpha_composite(qr_img, (box_x + padding, box_y + padding))

    scan_text = "SCAN TO VERIFY"
    scan_font = get_font(10, bold=False)
    scan_w, scan_h = text_size(draw, scan_text, scan_font)
    scan_y = box_y + box_size + 14
    draw.text((panel_cx - scan_w // 2, scan_y), scan_text, font=scan_font, fill=text_dim_rgba)

    short_id = str(data.get("id") or "N/A")[:8].upper()
    id_text = f"ID: {short_id}"
    id_font = get_font(12, bold=True)
    id_w, id_h = text_size(draw, id_text, id_font)
    id_y = scan_y + 18
    draw.text((panel_cx - id_w // 2, id_y), id_text, font=id_font, fill=(*accent1_rgb, 120))

    role_font = get_font(10, bold=False)
    role_text = colors["badge_text"]
    role_w, _ = text_size(draw, role_text, role_font)
    draw.text((panel_cx - role_w // 2, id_y + id_h + 8), role_text, font=role_font, fill=text_dim_rgba)

    # STEP 14 — FOOTER BAR
    footer_h = 46
    footer_y = H - footer_h
    draw.rectangle([0, footer_y, W, H], fill=(*accent3_rgb, 180))

    for x in range(W):
        rel = x / max(1, W - 1)
        if rel < 0.5:
            alpha = int(220 * (rel / 0.5))
        else:
            alpha = int(220 * ((1.0 - rel) / 0.5))
        draw.point((x, footer_y), fill=(*accent1_rgb, max(0, alpha)))

    footer_text = "✦  IZEE CULTURALS 2026  ·  24 APRIL 2026  ·  MAIN AUDITORIUM & OPEN ARENA  ✦"
    footer_font = get_font(12, bold=False)
    ftw, _ = text_size(draw, footer_text, footer_font)
    draw.text(((W - ftw) // 2, footer_y + 16), footer_text, font=footer_font, fill=(*accent1_rgb, 220))

    # STEP 15 — FINAL LOGO WATERMARK ON RIGHT ZONE
    if resolved_logo_path and os.path.exists(resolved_logo_path):
        try:
            wm_logo = Image.open(resolved_logo_path).convert("RGBA")
            wm_size = 140
            wm_logo = wm_logo.resize((wm_size, wm_size), Image.Resampling.LANCZOS)

            wm_pixels = list(wm_logo.getdata())
            faint_pixels = []
            for r, g, b, a in wm_pixels:
                faint_pixels.append((r, g, b, int(a * 0.05)))
            wm_logo.putdata(faint_pixels)

            wm_x = panel_cx - (wm_size // 2)
            wm_y = H - footer_h - wm_size - 10
            img.alpha_composite(wm_logo, (wm_x, wm_y))
        except Exception:
            pass

    # STEP 16 — SAVE
    final = img.convert("RGB")
    buffer = io.BytesIO()
    final.save(buffer, format="PNG", optimize=False, compress_level=1)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def generate_participant_pass(data: Dict[str, Any], logo_path: Optional[str] = None) -> str:
    return generate_admit_pass("participant", data, logo_path)


def generate_volunteer_pass(data: Dict[str, Any], logo_path: Optional[str] = None) -> str:
    return generate_admit_pass("volunteer", data, logo_path)


def generate_student_pass(data: Dict[str, Any], logo_path: Optional[str] = None) -> str:
    return generate_admit_pass("student", data, logo_path)


def generate_group_pass(data: Dict[str, Any], logo_path: Optional[str] = None) -> str:
    return generate_admit_pass("group", data, logo_path)
