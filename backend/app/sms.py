import hashlib
import hmac
import json
import re
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from threading import Event, Thread
from uuid import uuid4

from app.config import Settings

KST = timezone(timedelta(hours=9))


class SmsSendError(RuntimeError):
    pass


class SolapiSmsClient:
    def __init__(self, settings: Settings) -> None:
        self.api_key = settings.solapi_api_key.strip()
        self.api_secret = settings.solapi_api_secret.strip()
        self.from_number = normalize_domestic_phone(settings.solapi_from)
        self.to_numbers = [normalize_domestic_phone(number) for number in settings.solapi_to_list]

    @property
    def configured(self) -> bool:
        return all(
            [
                self.api_key,
                self.api_secret,
                self.from_number,
                self.to_numbers,
            ]
        )

    def send(self, content: str) -> None:
        if not self.configured:
            raise SmsSendError("Solapi SMS settings are incomplete")

        for to_number in self.to_numbers:
            self._send_one(to_number, content)

    def _send_one(self, to_number: str, content: str) -> None:
        body = {
            "message": {
                "to": to_number,
                "from": self.from_number,
                "text": content[:2000],
            }
        }
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(
            "https://api.solapi.com/messages/v4/send",
            data=data,
            method="POST",
            headers={
                "Authorization": self._authorization(),
                "Content-Type": "application/json; charset=utf-8",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                if response.status < 200 or response.status >= 300:
                    raise SmsSendError(f"Solapi SMS failed with HTTP {response.status}")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise SmsSendError(f"Solapi SMS failed with HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise SmsSendError(f"Solapi SMS request failed: {exc.reason}") from exc

    def _authorization(self) -> str:
        salt = uuid4().hex
        date = datetime.now(timezone.utc).isoformat(timespec="seconds")
        signature = hmac.new(
            self.api_secret.encode("utf-8"),
            f"{date}{salt}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return (
            f"HMAC-SHA256 apiKey={self.api_key}, "
            f"date={date}, salt={salt}, signature={signature}"
        )


class DisconnectSmsMonitor:
    def __init__(
        self,
        settings: Settings,
        latest_seen_at: Callable[[list[str]], datetime | None],
        sender: SolapiSmsClient,
    ) -> None:
        self.settings = settings
        self.latest_seen_at = latest_seen_at
        self.sender = sender
        self.stop_event = Event()
        self.thread: Thread | None = None
        self.ever_online = False
        self.disconnected = False
        self.started_at = time.monotonic()
        self.last_disconnect_sent_at: float | None = None

    def start(self) -> None:
        if not self.settings.sms_enabled:
            print("sms disconnect monitor disabled")
            return
        if not self.settings.sms_disconnect_enabled:
            print("sms disconnect alert disabled")
            return
        if not self.sender.configured:
            print("sms disconnect monitor disabled: Solapi settings are incomplete")
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

        monotonic_now = time.monotonic()
        if not self.ever_online and monotonic_now - self.started_at < self.settings.sms_link_grace_seconds:
            return

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


def normalize_domestic_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value.strip())
    if digits.startswith("82") and not digits.startswith("820"):
        return f"0{digits[2:]}"
    if digits.startswith("820"):
        return f"0{digits[3:]}"
    return digits
