from __future__ import annotations

from datetime import datetime, timezone
from math import floor
from threading import RLock

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.admin_settings import model_name_is_inverter
from app.models import EquipmentLogSnapshot


EQUIPMENT_LOG_LIMIT = 300
EQUIPMENT_LINK_GRACE_SECONDS = 30

LiveMap = dict[str, tuple[str, datetime, str]]
HeartbeatMap = dict[str, tuple[datetime, str]]

_capture_lock = RLock()
_capture_interval_seconds = 2
_last_capture_at: datetime | None = None


def set_equipment_log_capture_interval(seconds: int) -> None:
    global _capture_interval_seconds
    with _capture_lock:
        _capture_interval_seconds = max(1, min(30, int(seconds)))


def should_capture_equipment_logs(recorded_at: datetime) -> bool:
    global _last_capture_at
    normalized = _aware_datetime(recorded_at)
    with _capture_lock:
        if _last_capture_at is not None:
            elapsed = (normalized - _last_capture_at).total_seconds()
            if 0 <= elapsed < _capture_interval_seconds:
                return False
        _last_capture_at = normalized
        return True


def build_equipment_log_snapshots(
    live_map: LiveMap,
    heartbeats: HeartbeatMap,
    recorded_at: datetime,
    max_equipment: int = 12,
    equipment_models: list[str] | None = None,
) -> list[dict]:
    captured_at = _aware_datetime(recorded_at)
    oilfree_selector = _integer_value(live_map, "0006") or 0
    snapshots: list[dict] = []

    for equipment_no in range(1, max_equipment + 1):
        is_oilfree = bool(oilfree_selector & (1 << (equipment_no - 1)))
        prefix = f"{2 if is_oilfree else 1}{equipment_no:X}"
        if not _recent_heartbeat(heartbeats, f"{prefix}00", captured_at):
            continue

        configured_model = equipment_models[equipment_no - 1] if equipment_models and equipment_no <= len(equipment_models) else ""
        is_inverter = model_name_is_inverter(configured_model) if configured_model else _is_inverter(live_map, prefix, is_oilfree)
        pressure_raw = _number_value(live_map, f"{prefix}00")
        temperature_raw = _number_value(live_map, f"{prefix}{'0C' if is_oilfree else '02'}")
        operation_status = _integer_value(live_map, f"{prefix}{'30' if is_oilfree else '16'}")
        rpm = _integer_value(live_map, f"{prefix}{'38' if is_oilfree else '04'}") if is_inverter else None
        alarm_word = _integer_value(live_map, f"{prefix}{'28' if is_oilfree else '0A'}")

        if is_oilfree:
            error_low = _integer_value(live_map, f"{prefix}2A")
            error_high = _integer_value(live_map, f"{prefix}2C")
            error_word = None
            if error_low is not None or error_high is not None:
                error_word = ((error_high or 0) & 0xFFFF) << 16 | ((error_low or 0) & 0xFFFF)
        else:
            error_word = _integer_value(live_map, f"{prefix}0C")

        snapshots.append(
            {
                "equipment_no": equipment_no,
                "pressure": _pressure_value(pressure_raw),
                "temperature": _temperature_value(temperature_raw, is_oilfree),
                "operation_status": operation_status,
                "rpm": rpm,
                "alarm_word": alarm_word,
                "error_word": error_word,
                "recorded_at": captured_at,
            }
        )

    return snapshots


def persist_equipment_log_snapshots(
    db: Session,
    snapshots: list[dict],
    limit: int = EQUIPMENT_LOG_LIMIT,
) -> None:
    if not snapshots:
        return

    db.add_all(EquipmentLogSnapshot(**snapshot) for snapshot in snapshots)
    db.flush()
    for equipment_no in {int(snapshot["equipment_no"]) for snapshot in snapshots}:
        stale_ids = (
            select(EquipmentLogSnapshot.id)
            .where(EquipmentLogSnapshot.equipment_no == equipment_no)
            .order_by(
                EquipmentLogSnapshot.recorded_at.desc(),
                EquipmentLogSnapshot.id.desc(),
            )
            .offset(limit)
        )
        db.execute(
            delete(EquipmentLogSnapshot).where(EquipmentLogSnapshot.id.in_(stale_ids))
        )
    db.commit()


def _is_inverter(live_map: LiveMap, prefix: str, is_oilfree: bool) -> bool:
    if is_oilfree:
        return _integer_value(live_map, f"{prefix}7E") == 3
    model_code = _integer_value(live_map, f"{prefix}74")
    return model_code is not None and 17 <= model_code <= 26


def _recent_heartbeat(
    heartbeats: HeartbeatMap,
    key: str,
    recorded_at: datetime,
) -> bool:
    normalized_key = key.upper()
    heartbeat = heartbeats.get(normalized_key)
    if not heartbeat:
        return False
    last_seen = heartbeat[0]
    age = (recorded_at - _aware_datetime(last_seen)).total_seconds()
    return -1 <= age <= EQUIPMENT_LINK_GRACE_SECONDS


def _number_value(live_map: LiveMap, key: str) -> float | None:
    item = live_map.get(key.upper())
    if not item:
        return None
    try:
        return float(item[0])
    except (TypeError, ValueError):
        return None


def _integer_value(live_map: LiveMap, key: str) -> int | None:
    value = _number_value(live_map, key)
    return int(value) if value is not None else None


def _pressure_value(raw: float | None) -> float | None:
    if raw is None or raw in {32767, 65535}:
        return None
    signed_raw = raw - 65536 if raw > 32767 else raw
    return floor(signed_raw / 10 + 0.5) / 10


def _temperature_value(raw: float | None, is_oilfree: bool) -> float | None:
    if raw is None or raw in {32767, 65535}:
        return None
    if is_oilfree:
        return round(raw - 65536 if raw > 32767 else raw, 1)
    normalized = -(raw - 2000) if raw > 2000 else raw
    return round(normalized / 10, 1)


def _aware_datetime(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
