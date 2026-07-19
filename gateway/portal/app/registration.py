import re
import secrets

from email_validator import EmailNotValidError, validate_email


PRIVACY_VERSION = "2026-07-19"
PHONE_PATTERN = re.compile(r"^01(?:0|1|6|7|8|9)\d{7,8}$")
EMAIL_CODE_PATTERN = re.compile(r"^\d{6}$")


def normalize_email(value: str) -> str:
    try:
        return validate_email(
            value.strip(),
            check_deliverability=False,
        ).normalized.lower()
    except EmailNotValidError as exc:
        raise ValueError("올바른 이메일 주소를 입력하세요.") from exc


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value.strip())
    if digits.startswith("82"):
        digits = f"0{digits[2:]}"
    if not PHONE_PATTERN.fullmatch(digits):
        raise ValueError("올바른 휴대전화 번호를 입력하세요.") from None
    return digits


def normalize_contact(contact_type: str, value: str) -> str:
    if contact_type == "email":
        return normalize_email(value)
    if contact_type == "phone":
        return normalize_phone(value)
    raise ValueError("가입 연락처 유형이 올바르지 않습니다.")


def new_email_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"
