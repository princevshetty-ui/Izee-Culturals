import json
import base64
from io import BytesIO
import qrcode
from qrcode.image.pure import PyPNGImage


def generate_qr(data: dict) -> str:
    """
    Generate a QR code from the provided data dictionary.
    
    Args:
        data: Dictionary containing full registration details:
              For participants: id, type, name, roll_no, course, year, events, registered_at
              For students: id, type, name, roll_no, course, year, registered_at
    
    Returns:
        Base64 encoded PNG string (no file saving, in-memory only)
    """
    json_str = json.dumps(data)
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(json_str)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color='#C9A84C', back_color='#0A0A0A')
    
    # Convert to bytes in-memory
    img_bytes = BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    # Encode to base64 string
    base64_str = base64.b64encode(img_bytes.getvalue()).decode('utf-8')
    
    return base64_str
