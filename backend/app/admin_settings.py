from __future__ import annotations

import json
import re
import threading
import time
from datetime import datetime
from typing import Callable
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AppSetting


SCHEDULE_SETTINGS_KEY = "schedule_settings"
PRODUCT_SETTINGS_KEY = "product_settings"
GSTECH_SETTINGS_KEY = "gstech_settings"
SEOUL = ZoneInfo("Asia/Seoul")


def default_schedule_settings() -> dict:
    slot = lambda: {"enabled": False, "time": "00:00", "run_units": 1}
    return {
        "days": [
            {"day": day, "run_slots": [slot() for _ in range(3)], "stop_slots": [slot() for _ in range(3)]}
            for day in range(7)
        ],
        "holidays": [],
    }


def default_product_settings() -> dict:
    return {
        "factory_password": "btfss0510",
        "admin_password": "471112",
        "user_password": "1234",
        "login_id": "admin",
        "login_password": "1234",
        "save_cycle_seconds": 2,
        "save_period_days": 30,
        "backlight_percent": 50,
        "screen_saver_seconds": 300,
        "alarm_sound_enabled": True,
        "alarm_visible": True,
        "camera1_ip": "0.0.0.0",
        "camera1_port": 0,
        "camera2_ip": "0.0.0.0",
        "camera2_port": 0,
    }


def default_gstech_settings() -> dict:
    return {
        "dio_bit0": 0,
        "dio_bit4": 1,
        "tcp_mode": 0,
        "cctv_enabled": False,
    }


def sanitize_schedule_settings(payload: dict | None) -> dict:
    defaults = default_schedule_settings()
    raw_days = payload.get("days") if isinstance(payload, dict) else None
    days: list[dict] = []
    for day_index in range(7):
        raw_day = raw_days[day_index] if isinstance(raw_days, list) and day_index < len(raw_days) else {}
        day: dict = {"day": day_index}
        for group in ("run_slots", "stop_slots"):
            raw_slots = raw_day.get(group) if isinstance(raw_day, dict) else None
            slots = []
            for slot_index in range(3):
                raw_slot = raw_slots[slot_index] if isinstance(raw_slots, list) and slot_index < len(raw_slots) else {}
                raw_time = str(raw_slot.get("time", "00:00")) if isinstance(raw_slot, dict) else "00:00"
                clock = raw_time if re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", raw_time) else "00:00"
                try:
                    run_units = int(raw_slot.get("run_units", 1)) if isinstance(raw_slot, dict) else 1
                except (TypeError, ValueError):
                    run_units = 1
                slots.append(
                    {
                        "enabled": bool(raw_slot.get("enabled", False)) if isinstance(raw_slot, dict) else False,
                        "time": clock,
                        "run_units": max(1, min(12, run_units)),
                    }
                )
            day[group] = slots
        days.append(day)

    raw_holidays = payload.get("holidays") if isinstance(payload, dict) else []
    holidays = []
    if isinstance(raw_holidays, list):
        for value in raw_holidays:
            match = re.search(r"(?:\d{4}-)?(\d{2}-\d{2})$", str(value))
            if match and match.group(1) not in holidays:
                holidays.append(match.group(1))
    return {"days": days, "holidays": holidays}


def sanitize_product_settings(payload: dict | None) -> dict:
    defaults = default_product_settings()
    source = payload if isinstance(payload, dict) else {}

    def integer(key: str, minimum: int, maximum: int) -> int:
        try:
            value = int(source.get(key, defaults[key]))
        except (TypeError, ValueError):
            value = int(defaults[key])
        return max(minimum, min(maximum, value))

    def text(key: str, fallback: str, max_length: int = 64) -> str:
        value = str(source.get(key, fallback)).strip()
        return (value or fallback)[:max_length]

    admin_password = re.sub(r"\D", "", text("admin_password", defaults["admin_password"]))
    user_password = re.sub(r"\D", "", text("user_password", defaults["user_password"]))
    screen_saver_seconds = integer("screen_saver_seconds", 0, 300)
    if 0 < screen_saver_seconds < 10:
        screen_saver_seconds = 10
    return {
        "factory_password": text("factory_password", defaults["factory_password"], 32),
        "admin_password": admin_password if len(admin_password) == 6 else defaults["admin_password"],
        "user_password": user_password if len(user_password) == 4 else defaults["user_password"],
        "login_id": text("login_id", defaults["login_id"], 32),
        "login_password": text("login_password", defaults["login_password"], 32),
        "save_cycle_seconds": integer("save_cycle_seconds", 1, 30),
        "save_period_days": integer("save_period_days", 1, 60),
        "backlight_percent": integer("backlight_percent", 0, 100),
        "screen_saver_seconds": screen_saver_seconds,
        "alarm_sound_enabled": bool(source.get("alarm_sound_enabled", defaults["alarm_sound_enabled"])),
        "alarm_visible": bool(source.get("alarm_visible", defaults["alarm_visible"])),
        "camera1_ip": text("camera1_ip", defaults["camera1_ip"], 45),
        "camera1_port": integer("camera1_port", 0, 65535),
        "camera2_ip": text("camera2_ip", defaults["camera2_ip"], 45),
        "camera2_port": integer("camera2_port", 0, 65535),
    }


def sanitize_gstech_settings(payload: dict | None) -> dict:
    defaults = default_gstech_settings()
    source = payload if isinstance(payload, dict) else {}

    def selected(key: str) -> int:
        try:
            value = int(source.get(key, defaults[key]))
        except (TypeError, ValueError):
            value = int(defaults[key])
        return max(0, min(7, value))

    dio_bit0 = selected("dio_bit0")
    dio_bit4 = selected("dio_bit4")
    if dio_bit0 == dio_bit4:
        dio_bit4 = 1 if dio_bit0 != 1 else 0
    return {
        "dio_bit0": dio_bit0,
        "dio_bit4": dio_bit4,
        "tcp_mode": 1 if int(source.get("tcp_mode", defaults["tcp_mode"]) or 0) == 1 else 0,
        "cctv_enabled": bool(source.get("cctv_enabled", defaults["cctv_enabled"])),
    }


def load_json_setting(
    db: Session,
    key: str,
    sanitizer: Callable[[dict | None], dict],
) -> tuple[dict, datetime | None]:
    setting = db.scalar(select(AppSetting).where(AppSetting.key == key))
    if not setting:
        return sanitizer(None), None
    try:
        payload = json.loads(setting.value_json)
    except (json.JSONDecodeError, TypeError):
        payload = None
    return sanitizer(payload), setting.updated_at


def save_json_setting(
    db: Session,
    key: str,
    payload: dict,
    sanitizer: Callable[[dict | None], dict],
) -> tuple[dict, datetime]:
    normalized = sanitizer(payload)
    setting = db.scalar(select(AppSetting).where(AppSetting.key == key))
    value_json = json.dumps(normalized, ensure_ascii=False)
    if not setting:
        setting = AppSetting(key=key, value_json=value_json)
        db.add(setting)
    else:
        setting.value_json = value_json
    db.commit()
    db.refresh(setting)
    return normalized, setting.updated_at


def due_schedule_events(payload: dict, now: datetime) -> list[dict]:
    schedule = sanitize_schedule_settings(payload)
    local_now = now.astimezone(SEOUL)
    if local_now.strftime("%m-%d") in schedule["holidays"]:
        return []
    day_index = (local_now.weekday() + 1) % 7
    clock = local_now.strftime("%H:%M")
    day = schedule["days"][day_index]
    events = []
    for action, group in (("run", "run_slots"), ("stop", "stop_slots")):
        for slot_index, slot in enumerate(day[group]):
            if slot["enabled"] and slot["time"] == clock:
                events.append(
                    {
                        "action": action,
                        "run_units": slot["run_units"],
                        "event_key": f"{local_now.date()}:{day_index}:{action}:{slot_index}:{clock}",
                    }
                )
    return events


class ScheduleRunner:
    def __init__(self, load_schedule: Callable[[], dict], dispatch: Callable[[dict], None]) -> None:
        self.load_schedule = load_schedule
        self.dispatch = dispatch
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._fired: set[str] = set()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="schedule-runner", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                now = datetime.now(tz=SEOUL)
                events = due_schedule_events(self.load_schedule(), now)
                for event in events:
                    if event["event_key"] in self._fired:
                        continue
                    self.dispatch(event)
                    self._fired.add(event["event_key"])
                today = str(now.date())
                self._fired = {key for key in self._fired if key.startswith(today)}
            except Exception as exc:
                print(f"schedule runner error: {exc}")
            self._stop.wait(max(1.0, 10.0 - time.time() % 10.0))
