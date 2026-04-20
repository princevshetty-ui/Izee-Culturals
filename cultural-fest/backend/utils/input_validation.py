import re

ROLL_NO_REGEX = re.compile(r"^[A-Za-z0-9]{12}$")


def normalize_roll_no(value: str) -> str:
    return (value or "").strip().upper()


def is_valid_roll_no(value: str) -> bool:
    return bool(ROLL_NO_REGEX.match(normalize_roll_no(value)))


def normalize_full_name(value: str) -> str:
    return " ".join((value or "").strip().split())
