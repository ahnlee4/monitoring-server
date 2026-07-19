import smtplib
from email.message import EmailMessage
from typing import Protocol

from app.config import Settings


class EmailSendError(RuntimeError):
    pass


class VerificationEmailSender(Protocol):
    @property
    def configured(self) -> bool: ...

    def send_verification_code(
        self,
        recipient: str,
        code: str,
        expires_minutes: int,
    ) -> None: ...


class SmtpVerificationEmailSender:
    def __init__(self, settings: Settings) -> None:
        self.host = settings.smtp_host.strip()
        self.port = settings.smtp_port
        self.username = settings.smtp_username.strip()
        self.password = settings.smtp_password
        self.from_address = settings.smtp_from.strip() or self.username

    @property
    def configured(self) -> bool:
        return all(
            [
                self.host,
                self.port > 0,
                self.username,
                self.password,
                self.from_address,
            ]
        )

    def send_verification_code(
        self,
        recipient: str,
        code: str,
        expires_minutes: int,
    ) -> None:
        if not self.configured:
            raise EmailSendError("이메일 인증 발송 설정이 완료되지 않았습니다.")

        message = EmailMessage()
        message["Subject"] = "[더인테크 TMS] 회원가입 인증번호"
        message["From"] = self.from_address
        message["To"] = recipient
        message.set_content(
            "\n".join(
                [
                    "더인테크 TMS 회원가입 인증번호입니다.",
                    "",
                    f"인증번호: {code}",
                    f"유효시간: {expires_minutes}분",
                    "",
                    "본인이 요청하지 않았다면 이 메일을 무시하세요.",
                ]
            )
        )

        try:
            with smtplib.SMTP_SSL(self.host, self.port, timeout=8) as smtp:
                smtp.login(self.username, self.password)
                smtp.send_message(message)
        except (OSError, smtplib.SMTPException) as exc:
            raise EmailSendError("인증메일을 발송하지 못했습니다.") from exc
