import hashlib
import ipaddress
import re
import secrets
from datetime import datetime, timezone

from pwdlib import PasswordHash


password_hash = PasswordHash.recommended()
SLUG_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{3,64}$")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    return password_hash.verify(password, encoded)


def new_session_token() -> str:
    return secrets.token_urlsafe(48)


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_db_datetime(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def validate_target(host: str, port: int, allowed_ports: set[int]) -> None:
    try:
        address = ipaddress.ip_address(host)
    except ValueError as exc:
        raise ValueError("대상 서버는 내부 IP 주소로 입력해야 합니다.") from exc

    if not isinstance(address, ipaddress.IPv4Address):
        raise ValueError("대상 서버는 사설망 IPv4 주소여야 합니다.")
    if not address.is_private or address.is_loopback or address.is_link_local or address.is_multicast:
        raise ValueError("대상 서버는 접근 가능한 사설망 IPv4 주소여야 합니다.")
    if port not in allowed_ports:
        raise ValueError("허용되지 않은 대상 포트입니다.")
