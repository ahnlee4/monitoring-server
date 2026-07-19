from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import audit, remote_address
from app.config import Settings
from app.database import get_db
from app.email_sender import EmailSendError, VerificationEmailSender
from app.models import EmailVerification, User
from app.registration import (
    EMAIL_CODE_PATTERN,
    PRIVACY_VERSION,
    new_email_code,
    normalize_contact,
    normalize_email,
)
from app.schemas import (
    EmailVerificationConfirmIn,
    EmailVerificationRequestIn,
    SignupIn,
)
from app.security import (
    USERNAME_PATTERN,
    hash_password,
    new_session_token,
    normalize_db_datetime,
    token_digest,
    utcnow,
    verify_password,
)


router = APIRouter(prefix="/api/signup", tags=["signup"])


def registration_settings(request: Request) -> Settings:
    return request.app.state.settings


def email_sender(request: Request) -> VerificationEmailSender:
    return request.app.state.email_sender


def ensure_registration_enabled(settings: Settings) -> None:
    if not settings.registration_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="현재 회원가입을 받을 수 없습니다.",
        )


def invalid_contact_error(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.get("/options")
def signup_options(
    request: Request,
    settings: Settings = Depends(registration_settings),
    sender: VerificationEmailSender = Depends(email_sender),
) -> dict:
    return {
        "registrationEnabled": settings.registration_enabled,
        "emailVerificationAvailable": sender.configured,
        "privacyVersion": PRIVACY_VERSION,
    }


@router.post("/email/send")
def send_email_verification(
    payload: EmailVerificationRequestIn,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(registration_settings),
    sender: VerificationEmailSender = Depends(email_sender),
) -> dict:
    ensure_registration_enabled(settings)
    if not sender.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="이메일 인증 발송 설정이 완료되지 않았습니다. 휴대전화 번호로 가입하거나 관리자에게 문의하세요.",
        )
    try:
        email = normalize_email(payload.email)
    except ValueError as exc:
        raise invalid_contact_error(exc) from exc

    if db.scalar(select(User.id).where(User.contact_value == email)):
        raise HTTPException(status_code=409, detail="이미 가입 또는 신청된 이메일입니다.")

    now = utcnow()
    address = remote_address(request)
    cooldown_at = now - timedelta(seconds=settings.email_verification_cooldown_seconds)
    too_recent = db.scalar(
        select(EmailVerification.id)
        .where(
            or_(
                EmailVerification.email == email,
                EmailVerification.remote_addr == address,
            ),
            EmailVerification.created_at >= cooldown_at,
        )
        .limit(1)
    )
    if too_recent:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{settings.email_verification_cooldown_seconds}초 후 다시 요청하세요.",
        )

    hourly_at = now - timedelta(hours=1)
    hourly_count = db.scalar(
        select(func.count(EmailVerification.id)).where(
            or_(
                EmailVerification.email == email,
                EmailVerification.remote_addr == address,
            ),
            EmailVerification.created_at >= hourly_at,
        )
    )
    if int(hourly_count or 0) >= settings.email_verification_hourly_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="인증메일 요청 횟수를 초과했습니다. 잠시 후 다시 시도하세요.",
        )

    db.execute(
        delete(EmailVerification).where(
            EmailVerification.expires_at < now - timedelta(days=1)
        )
    )
    code = new_email_code()
    verification = EmailVerification(
        email=email,
        code_hash=hash_password(code),
        expires_at=now + timedelta(minutes=settings.email_verification_ttl_minutes),
        remote_addr=address,
    )
    db.add(verification)
    audit(
        db,
        request,
        "signup_email_sent",
        None,
        f"contact_hash={token_digest(email)[:16]}",
    )
    try:
        sender.send_verification_code(
            email,
            code,
            settings.email_verification_ttl_minutes,
        )
    except EmailSendError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    db.commit()
    return {
        "email": email,
        "expiresInSeconds": settings.email_verification_ttl_minutes * 60,
        "resendAfterSeconds": settings.email_verification_cooldown_seconds,
    }


@router.post("/email/verify")
def verify_email_code(
    payload: EmailVerificationConfirmIn,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(registration_settings),
) -> dict:
    ensure_registration_enabled(settings)
    try:
        email = normalize_email(payload.email)
    except ValueError as exc:
        raise invalid_contact_error(exc) from exc
    code = payload.code.strip()
    if not EMAIL_CODE_PATTERN.fullmatch(code):
        raise HTTPException(status_code=422, detail="6자리 인증번호를 입력하세요.")

    now = utcnow()
    verification = db.scalar(
        select(EmailVerification)
        .where(
            EmailVerification.email == email,
            EmailVerification.consumed_at.is_(None),
        )
        .order_by(EmailVerification.created_at.desc())
        .limit(1)
    )
    if not verification or normalize_db_datetime(verification.expires_at) <= now:
        raise HTTPException(
            status_code=400,
            detail="인증번호가 만료되었습니다. 새 인증번호를 요청하세요.",
        )
    if verification.attempt_count >= settings.email_verification_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="인증번호 확인 횟수를 초과했습니다. 새 인증번호를 요청하세요.",
        )

    verification.attempt_count += 1
    if not verify_password(code, verification.code_hash):
        db.commit()
        raise HTTPException(status_code=400, detail="인증번호가 올바르지 않습니다.")

    raw_token = new_session_token()
    verification.verified_at = now
    verification.verification_token_hash = token_digest(raw_token)
    audit(
        db,
        request,
        "signup_email_verified",
        None,
        f"contact_hash={token_digest(email)[:16]}",
    )
    db.commit()
    return {"verificationToken": raw_token, "email": email}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_account(
    payload: SignupIn,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(registration_settings),
) -> dict:
    ensure_registration_enabled(settings)
    username = payload.username.strip().lower()
    if not USERNAME_PATTERN.fullmatch(username):
        raise HTTPException(status_code=422, detail="아이디 형식이 올바르지 않습니다.")
    if not payload.privacy_agreed:
        raise HTTPException(status_code=422, detail="개인정보 수집·이용 동의가 필요합니다.")
    try:
        contact_value = normalize_contact(payload.contact_type, payload.contact_value)
    except ValueError as exc:
        raise invalid_contact_error(exc) from exc

    now = utcnow()
    verification: EmailVerification | None = None
    if payload.contact_type == "email":
        if not payload.email_verification_token:
            raise HTTPException(status_code=422, detail="이메일 인증을 완료하세요.")
        verification = db.scalar(
            select(EmailVerification).where(
                EmailVerification.email == contact_value,
                EmailVerification.verification_token_hash
                == token_digest(payload.email_verification_token),
                EmailVerification.verified_at.is_not(None),
                EmailVerification.consumed_at.is_(None),
            )
        )
        if (
            not verification
            or normalize_db_datetime(verification.expires_at) <= now
        ):
            raise HTTPException(
                status_code=400,
                detail="이메일 인증이 만료되었습니다. 다시 인증하세요.",
            )

    user = User(
        username=username,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip(),
        is_admin=False,
        is_active=False,
        contact_type=payload.contact_type,
        contact_value=contact_value,
        contact_verified_at=now if payload.contact_type == "email" else None,
        approval_status="pending",
        signup_requested_at=now,
        privacy_agreed_at=now,
        privacy_version=PRIVACY_VERSION,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="이미 사용 중인 아이디 또는 연락처입니다.",
        ) from exc

    if verification:
        verification.consumed_at = now
    audit(
        db,
        request,
        "signup_requested",
        user.id,
        f"contact_type={payload.contact_type}",
    )
    db.commit()
    return {
        "ok": True,
        "status": "pending",
        "message": "가입 신청이 접수되었습니다. 관리자가 서버 권한을 배정하고 승인하면 로그인할 수 있습니다.",
    }
