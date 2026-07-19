from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog


def remote_address(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:64]
    return request.client.host[:64] if request.client else ""


def audit(
    db: Session,
    request: Request,
    action: str,
    user_id: int | None,
    detail: str = "",
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            remote_addr=remote_address(request),
            detail=detail[:1000],
        )
    )
