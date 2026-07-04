import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from threading import Event, Thread

from app.config import Settings

KST = timezone(timedelta(hours=9))


class SmsSendError(RuntimeError):
    pass


class TwilioSmsClient:
    def __init__(self, settings: Settings) -> None:
        self.account_sid = settings.twilio_account_sid.strip()
        self.auth_token = settings.twilio_auth_token.strip()
        self.from_number = normalize_twilio_phone(settings.twilio_from)
        self.to_numbers = [normalize_twilio_phone(number) for number in settings.twilio_to_list]

    @property
    def configured(self) -> bool:
        return all(
            [
                self.account_sid,
                self.auth_token,
                self.from_number,
                self.to_numbers,
            ]
        )

    def send(self, content: str) -> None:
        if not self.configured:
            raise SmsSendError("Twilio SMS settings are incomplete")

        for to_number in self.to_numbers:
            self._send_one(to_number, content)

    def _send_one(self, to_number: str, content: str) -> None:
        data = urllib.parse.urlencode(
            {
                "From": self.from_number,
                "To": to_number,
                "Body": content[:1600],
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json",
            data=data,
            method="POST",
            headers={
                "Authorization": build_basic_auth(self.account_sid, self.auth_token),
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                if response.status < 200 or response.status >= 300:
                    raise SmsSendError(f"Twilio SMS failed with HTTP {response.status}")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise SmsSendError(f"Twilio SMS failed with HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise SmsSendError(f"Twilio SMS request failed: {exc.reason}") from exc


class DisconnectSmsMonitor:
    def __init__(
        self,
        settings: Settings,
        latest_seen_at: Callable[[list[str]], datetime | None],
        sender: TwilioSmsClient,
    ) -> None:
        self.settings = settings
        self.latest_seen_at = latest_seen_at
        self.sender = sender
        self.stop_event = Event()
        self.thread: Thread | None = None
        self.ever_online = False
        self.disconnected = False
        self.last_disconnect_sent_at: float | None = None

    def start(self) -> None:
        if not self.settings.sms_enabled:
            print("sms disconnect monitor disabled")
            return
        if not self.settings.sms_disconnect_enabled:
            print("sms disconnect alert disabled")
            return
        if not self.sender.configured:
            print("sms disconnect monitor disabled: Twilio settings are incomplete")
            return

        self.thread = Thread(target=self._run, name="disconnect-sms-monitor", daemon=True)
        self.thread.start()
        print("sms disconnect monitor started")

    def stop(self) -> None:
        self.stop_event.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2)

    def _run(self) -> None:
        interval = max(1.0, self.settings.sms_check_interval_seconds)
        while not self.stop_event.wait(interval):
            self._check_once()

    def _check_once(self) -> None:
        now = datetime.now(timezone.utc)
        latest = self.latest_seen_at(self.settings.sms_watch_keys_list)
        online = latest is not None and (now - latest).total_seconds() <= self.settings.sms_link_grace_seconds

        if online:
            if self.disconnected and self.settings.sms_recovery_enabled:
                self._send(f"[{self.settings.sms_factory_name}] 통신복구")
            self.ever_online = True
            self.disconnected = False
            return

        if not self.ever_online:
            return

        monotonic_now = time.monotonic()
        cooldown = max(60.0, self.settings.sms_cooldown_seconds)
        if self.disconnected and self.last_disconnect_sent_at is not None:
            if monotonic_now - self.last_disconnect_sent_at < cooldown:
                return

        last_seen_text = latest.astimezone(KST).strftime("%m-%d %H:%M:%S") if latest else "없음"
        self._send(f"[{self.settings.sms_factory_name}] DISCONNECT 최근수신 {last_seen_text}")
        self.disconnected = True
        self.last_disconnect_sent_at = monotonic_now

    def _send(self, content: str) -> None:
        try:
            self.sender.send(content)
            print(f"sms alert sent: {content}")
        except SmsSendError as exc:
            print(f"sms alert failed: {exc}")


def normalize_twilio_phone(value: str) -> str:
    stripped = re.sub(r"[\s-]", "", value.strip())
    digits = re.sub(r"\D", "", stripped)
    if not digits:
        return ""
    if stripped.startswith("+"):
        return f"+{digits}"
    if digits.startswith("00"):
        return f"+{digits[2:]}"
    if digits.startswith("0"):
        return f"+82{digits[1:]}"
    return f"+{digits}"


def build_basic_auth(account_sid: str, auth_token: str) -> str:
    import base64

    token = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"
