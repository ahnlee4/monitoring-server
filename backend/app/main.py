import json
import re
import time
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from threading import RLock

from fastapi import Depends, FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, func, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.control_protocol import build_group_operation_payload
from app.database import Base, engine, get_db, SessionLocal
from app.models import (
    Alarm,
    AppSetting,
    ControlCommand,
    CurrentValue,
    Device,
    TelemetryRecord,
    YujinMapDefinition,
    YujinMapValue,
    YujinMapValueHistory,
)
from app.schemas import (
    AlarmOut,
    CollectorSettingsIn,
    CollectorSettingsOut,
    ControlCommandAckIn,
    ControlCommandOut,
    DeviceOut,
    GroupOperationIn,
    GroupSettingsIn,
    MapWriteBatchIn,
    MapWriteIn,
    ModeSettingsIn,
    ModeSettingsOut,
    OverviewOut,
    RawUart4BatchCommandIn,
    RawUart4CommandIn,
    TelemetryIngestRequest,
    TelemetryRecordOut,
    YujinMapDefinitionOut,
    YujinMapIngestRequest,
    YujinMapValueHistoryOut,
    YujinMapValueOut,
)
from app.sms import DisconnectSmsMonitor, SolapiSmsClient
from app.ws import manager
from app.yujin_map import build_yujin_map_schema


settings = get_settings()
app = FastAPI(title=settings.app_name)
CONTROL_COMMAND_STALE_SECONDS = 10
DATABASE_STARTUP_TIMEOUT_SECONDS = 120
DATABASE_STARTUP_RETRY_SECONDS = 2
YUJIN_INGEST_SLOW_LOG_MS = 500
YUJIN_MAP_HEARTBEATS: dict[str, tuple[datetime, str]] = {}
YUJIN_LIVE_MAP: dict[str, tuple[str, datetime, str]] = {}
YUJIN_LIVE_MAP_LOCK = RLock()
sms_monitor: DisconnectSmsMonitor | None = None

CONTROL_COMMAND_SOURCE_PRIORITY = {
    "group_operation": 0,
    "control_dialog_operation_mode": 1,
    "control_dialog_control_mode": 1,
    "control_dialog_sort_mode": 1,
    "control_dialog_setting": 2,
    "control_dialog_device_pressure": 2,
    "settings_apply_sequence": 2,
    "settings_mode_index": 3,
    "settings_use_mode_count": 3,
    "settings_mode_align_table": 4,
}
SUPERSEDE_PENDING_CONTROL_SOURCES = {
    "control_dialog_operation_mode",
    "control_dialog_control_mode",
    "control_dialog_sort_mode",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def latest_yujin_seen_at(keys: list[str]) -> datetime | None:
    normalized_keys = [key.upper() for key in keys]
    timestamps: list[datetime] = []
    with YUJIN_LIVE_MAP_LOCK:
        if normalized_keys:
            for key in normalized_keys:
                live = YUJIN_LIVE_MAP.get(key)
                heartbeat = YUJIN_MAP_HEARTBEATS.get(key)
                if live:
                    timestamps.append(live[1])
                if heartbeat:
                    timestamps.append(heartbeat[0])
        else:
            timestamps.extend(live[1] for live in YUJIN_LIVE_MAP.values())
            timestamps.extend(heartbeat[0] for heartbeat in YUJIN_MAP_HEARTBEATS.values())

    return max(timestamps) if timestamps else None


@app.on_event("startup")
def on_startup() -> None:
    global sms_monitor
    wait_for_database()
    Base.metadata.create_all(bind=engine)
    migrate_legacy_schema()
    seed_devices()
    seed_yujin_map()
    sms_monitor = DisconnectSmsMonitor(settings, latest_yujin_seen_at, SolapiSmsClient(settings))
    sms_monitor.start()


@app.on_event("shutdown")
def on_shutdown() -> None:
    if sms_monitor:
        sms_monitor.stop()


def wait_for_database() -> None:
    deadline = time.monotonic() + DATABASE_STARTUP_TIMEOUT_SECONDS
    attempt = 1
    while True:
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            if attempt > 1:
                print("backend database is ready")
            return
        except OperationalError as exc:
            if time.monotonic() >= deadline:
                raise
            print(f"backend waiting for database recovery ({attempt}): {exc}")
            attempt += 1
            time.sleep(DATABASE_STARTUP_RETRY_SECONDS)


def migrate_legacy_schema() -> None:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE current_values ADD COLUMN IF NOT EXISTS value_num DOUBLE PRECISION"))
        connection.execute(text("ALTER TABLE current_values ADD COLUMN IF NOT EXISTS value_text VARCHAR(255)"))
        connection.execute(text("ALTER TABLE telemetry_records ADD COLUMN IF NOT EXISTS value_num DOUBLE PRECISION"))
        connection.execute(text("ALTER TABLE telemetry_records ADD COLUMN IF NOT EXISTS value_text VARCHAR(255)"))


def seed_devices() -> None:
    seed_map = {
        "PRESS-01": ("Press Machine 01", "Line A"),
        "FURNACE-01": ("Furnace 01", "Heat Zone"),
        "PUMP-01": ("Cooling Pump 01", "Utility Room"),
    }
    with SessionLocal() as db:
        for code in settings.seed_device_codes_list:
            if db.scalar(select(Device).where(Device.code == code)):
                continue
            default_name, default_location = seed_map.get(code, (code, "Factory Floor"))
            db.add(Device(code=code, name=default_name, location=default_location, status="idle"))
        db.commit()


def seed_yujin_map() -> None:
    schema = build_yujin_map_schema()
    entries = [
        *schema["system_entries"],
        *schema["network_entries"],
        *schema["expanded_examples"]["injection"],
        *schema["expanded_examples"]["oilfree"],
        *schema["expanded_examples"]["dio"],
        *schema["expanded_examples"]["module"],
    ]
    with SessionLocal() as db:
        for item in entries:
            definition = db.scalar(select(YujinMapDefinition).where(YujinMapDefinition.key == item["key"]))
            if definition:
                definition.default_value = item["default_value"]
                definition.name = item["name"]
                definition.section = item["section"]
                current = db.scalar(
                    select(YujinMapValue).where(YujinMapValue.definition_id == definition.id)
                )
                if current and current.source in {"seed", "collector-mock"}:
                    current.value_text = item["default_value"]
                    current.source = "seed"
                continue
            definition = YujinMapDefinition(
                key=item["key"],
                data_type=item["data_type"],
                data_length=item["length"],
                signed=item["signed"],
                default_value=item["default_value"],
                name=item["name"],
                section=item["section"],
                source=item["source"],
            )
            db.add(definition)
            db.flush()
            db.add(
                YujinMapValue(
                    definition_id=definition.id,
                    value_text=item["default_value"],
                    source="seed",
                )
            )
        db.commit()


MODE_SETTINGS_KEY = "mode_settings"
COLLECTOR_SETTINGS_KEY = "collector_settings"
MODE_ALIGN_ROWS = 7
MODE_ALIGN_COLUMNS = 4
ALLOWED_COLLECTOR_SERIAL_PORTS = {"/dev/ttyUSB0", "/dev/ttyS7"}


def default_mode_settings_payload() -> dict:
    return {
        "rows": [
            {"no": str(index + 1), "values": ["3", "2", "0", "0"]}
            for index in range(MODE_ALIGN_ROWS)
        ],
        "selected_mode_index": 0,
        "use_mode_count": 1,
    }


def sanitize_mode_settings_payload(payload: dict) -> dict:
    defaults = default_mode_settings_payload()
    rows = payload.get("rows") if isinstance(payload, dict) else None
    normalized_rows: list[dict] = []
    if not isinstance(rows, list):
        rows = defaults["rows"]

    for index in range(MODE_ALIGN_ROWS):
        row = rows[index] if index < len(rows) and isinstance(rows[index], dict) else {}
        raw_values = row.get("values") if isinstance(row, dict) else []
        values = raw_values if isinstance(raw_values, list) else []
        normalized_values = []
        for value_index in range(MODE_ALIGN_COLUMNS):
            raw_value = values[value_index] if value_index < len(values) else defaults["rows"][index]["values"][value_index]
            text = re.sub(r"\D", "", str(raw_value))
            normalized_values.append(text or "0")
        normalized_rows.append({"no": str(index + 1), "values": normalized_values})

    try:
        selected_mode_index = int(payload.get("selected_mode_index", defaults["selected_mode_index"]))
    except (TypeError, ValueError):
        selected_mode_index = defaults["selected_mode_index"]
    try:
        use_mode_count = int(payload.get("use_mode_count", defaults["use_mode_count"]))
    except (TypeError, ValueError):
        use_mode_count = defaults["use_mode_count"]

    use_mode_count = max(1, min(12, use_mode_count))
    return {
        "rows": normalized_rows,
        "selected_mode_index": max(0, min(MODE_ALIGN_ROWS - 1, use_mode_count - 1, selected_mode_index)),
        "use_mode_count": use_mode_count,
    }


def load_mode_settings(db: Session) -> tuple[dict, datetime | None]:
    setting = db.scalar(select(AppSetting).where(AppSetting.key == MODE_SETTINGS_KEY))
    if not setting:
        payload = default_mode_settings_payload()
        setting = AppSetting(key=MODE_SETTINGS_KEY, value_json=json.dumps(payload, ensure_ascii=False))
        db.add(setting)
        db.commit()
        db.refresh(setting)
        return payload, setting.updated_at

    try:
        payload = json.loads(setting.value_json)
    except json.JSONDecodeError:
        payload = default_mode_settings_payload()
    return sanitize_mode_settings_payload(payload), setting.updated_at


def sanitize_collector_settings_payload(payload: dict | None) -> dict:
    serial_port = payload.get("serial_port") if isinstance(payload, dict) else None
    return {
        "serial_port": serial_port if serial_port in ALLOWED_COLLECTOR_SERIAL_PORTS else None,
    }


def load_collector_settings(db: Session) -> tuple[dict, datetime | None]:
    setting = db.scalar(select(AppSetting).where(AppSetting.key == COLLECTOR_SETTINGS_KEY))
    if not setting:
        return sanitize_collector_settings_payload(None), None

    try:
        payload = json.loads(setting.value_json)
    except json.JSONDecodeError:
        payload = None
    return sanitize_collector_settings_payload(payload), setting.updated_at


@lru_cache(maxsize=1)
def yujin_schema_entries() -> tuple[dict, ...]:
    schema = build_yujin_map_schema()
    return (
        *schema["system_entries"],
        *schema["network_entries"],
        *schema["expanded_examples"]["injection"],
        *schema["expanded_examples"]["oilfree"],
        *schema["expanded_examples"]["dio"],
        *schema["expanded_examples"]["module"],
    )


@lru_cache(maxsize=1)
def yujin_schema_index() -> dict[str, dict]:
    return {str(item["key"]).upper(): item for item in yujin_schema_entries()}


def yujin_live_value_out(definition: dict, live: tuple[str, datetime, str]) -> YujinMapValueOut:
    value, updated_at, source = live
    return YujinMapValueOut(
        key=str(definition["key"]).upper(),
        data_type=int(definition["data_type"]),
        data_length=int(definition["length"]),
        signed=bool(definition["signed"]),
        default_value=str(definition["default_value"]),
        name=definition.get("name"),
        section=str(definition["section"]),
        value=value,
        updated_at=updated_at,
        source=source,
    )


def yujin_heartbeat_value_out(definition: dict, heartbeat: tuple[datetime, str]) -> YujinMapValueOut:
    updated_at, source = heartbeat
    return yujin_live_value_out(definition, (str(definition["default_value"]), updated_at, source))


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "backend", "timestamp": datetime.now(timezone.utc)}


def command_out(command: ControlCommand) -> ControlCommandOut:
    return ControlCommandOut(
        id=command.id,
        command_type=command.command_type,
        status=command.status,
        payload=json.loads(command.payload_json),
        requested_by=command.requested_by,
        error=command.error_text,
        created_at=command.created_at,
        updated_at=command.updated_at,
    )


def control_command_payload(command: ControlCommand) -> dict:
    try:
        payload = json.loads(command.payload_json)
    except (TypeError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def control_command_source(command: ControlCommand) -> str:
    payload = control_command_payload(command)
    return str(payload.get("source") or "")


def control_command_priority(command: ControlCommand) -> tuple[int, datetime, int]:
    source = control_command_source(command)
    if command.command_type in {"raw_uart4", "raw_uart4_batch"}:
        source_priority = CONTROL_COMMAND_SOURCE_PRIORITY.get(source, 3)
    else:
        source_priority = CONTROL_COMMAND_SOURCE_PRIORITY.get(source, 9)
    return (source_priority, command.created_at, command.id)


def fail_pending_commands_by_source(db: Session, source: str, error: str) -> None:
    pending_commands = db.scalars(
        select(ControlCommand)
        .where(ControlCommand.status == "pending")
        .order_by(ControlCommand.created_at.asc(), ControlCommand.id.asc())
    ).all()
    now = datetime.now(timezone.utc)
    for command in pending_commands:
        if control_command_source(command) != source:
            continue
        command.status = "failed"
        command.error_text = error
        command.updated_at = now


def enqueue_control_command(
    db: Session,
    command_type: str,
    payload: dict,
    requested_by: str = "frontend",
    supersede_source: str | None = None,
) -> ControlCommand:
    if supersede_source:
        fail_pending_commands_by_source(db, supersede_source, "newer command superseded this pending command")
    command = ControlCommand(
        command_type=command_type,
        status="pending",
        payload_json=json.dumps(payload, ensure_ascii=False),
        requested_by=requested_by,
    )
    db.add(command)
    db.commit()
    db.refresh(command)
    return command


def current_map_int(db: Session, key: str, fallback: int = 0) -> int:
    with YUJIN_LIVE_MAP_LOCK:
        live = YUJIN_LIVE_MAP.get(key.upper())
    if live:
        try:
            return int(float(live[0]))
        except (TypeError, ValueError):
            return fallback

    row = db.execute(
        select(YujinMapValue.value_text)
        .join(YujinMapDefinition, YujinMapValue.definition_id == YujinMapDefinition.id)
        .where(YujinMapDefinition.key == key.upper())
    ).first()
    if not row:
        return fallback
    try:
        return int(float(row[0]))
    except (TypeError, ValueError):
        return fallback


def set_word_high_byte(current: int, high_byte: int) -> int:
    return ((high_byte & 0xFF) << 8) | (current & 0x00FF)


def set_word_low_byte(current: int, low_byte: int) -> int:
    return (current & 0xFF00) | (low_byte & 0xFF)


def normalize_map_write(write: MapWriteIn) -> dict:
    if write.address is None:
        if write.high_addr is None or write.low_addr is None:
            raise HTTPException(status_code=422, detail="write requires address or high_addr/low_addr")
        address = ((write.high_addr & 0xFF) << 8) | (write.low_addr & 0xFF)
    else:
        address = write.address

    if not 0 <= address <= 0xFFFF:
        raise HTTPException(status_code=422, detail=f"invalid write address: {address}")
    if not 1 <= write.length <= 255:
        raise HTTPException(status_code=422, detail=f"invalid write length: {write.length}")
    if write.data_hex is None and write.value is None:
        raise HTTPException(status_code=422, detail="write requires value or data_hex")

    normalized = {
        "key": write.key,
        "address": address,
        "length": write.length,
    }
    if write.data_hex is not None:
        normalized["data_hex"] = write.data_hex
    else:
        normalized["value"] = int(write.value or 0)
    return normalized


def normalize_hex_payload(value: str) -> str:
    compact = re.sub(r"[^0-9A-Fa-f]", "", value)
    if len(compact) < 2 or len(compact) % 2:
        raise HTTPException(status_code=422, detail="payload_hex must contain whole bytes")
    return compact.upper()


def legacy_raw_frame(payload: list[int], append_crc: bool = True, wait_response: bool = False) -> dict:
    return {
        "payload_hex": "".join(f"{byte & 0xFF:02X}" for byte in payload),
        "append_crc": append_crc,
        "wait_response": wait_response,
    }


def legacy_map_write_frame(address: int, value: int, length: int = 2) -> dict:
    data = int(value).to_bytes(length, byteorder="big", signed=False)
    payload = [
        0xC9,
        0x20,
        (address >> 8) & 0xFF,
        address & 0xFF,
        (length >> 8) & 0xFF,
        length & 0xFF,
        *data,
    ]
    return legacy_raw_frame(payload)


@app.get("/api/yujin/map-schema")
def yujin_map_schema() -> dict:
    return build_yujin_map_schema()


@app.get("/api/app-settings/mode-settings", response_model=ModeSettingsOut)
def get_mode_settings(db: Session = Depends(get_db)) -> ModeSettingsOut:
    payload, updated_at = load_mode_settings(db)
    return ModeSettingsOut(**payload, updated_at=updated_at)


@app.put("/api/app-settings/mode-settings", response_model=ModeSettingsOut)
def update_mode_settings(payload: ModeSettingsIn, db: Session = Depends(get_db)) -> ModeSettingsOut:
    normalized = sanitize_mode_settings_payload(payload.model_dump())
    setting = db.scalar(select(AppSetting).where(AppSetting.key == MODE_SETTINGS_KEY))
    if not setting:
        setting = AppSetting(key=MODE_SETTINGS_KEY, value_json=json.dumps(normalized, ensure_ascii=False))
        db.add(setting)
    else:
        setting.value_json = json.dumps(normalized, ensure_ascii=False)
    db.commit()
    db.refresh(setting)
    return ModeSettingsOut(**normalized, updated_at=setting.updated_at)


@app.get("/api/app-settings/collector-settings", response_model=CollectorSettingsOut)
def get_collector_settings(db: Session = Depends(get_db)) -> CollectorSettingsOut:
    payload, updated_at = load_collector_settings(db)
    return CollectorSettingsOut(**payload, updated_at=updated_at)


@app.put("/api/app-settings/collector-settings", response_model=CollectorSettingsOut)
def update_collector_settings(payload: CollectorSettingsIn, db: Session = Depends(get_db)) -> CollectorSettingsOut:
    normalized = sanitize_collector_settings_payload(payload.model_dump())
    if normalized["serial_port"] is None:
        raise HTTPException(status_code=422, detail="unsupported collector serial port")

    setting = db.scalar(select(AppSetting).where(AppSetting.key == COLLECTOR_SETTINGS_KEY))
    if not setting:
        setting = AppSetting(key=COLLECTOR_SETTINGS_KEY, value_json=json.dumps(normalized, ensure_ascii=False))
        db.add(setting)
    else:
        setting.value_json = json.dumps(normalized, ensure_ascii=False)
    db.commit()
    db.refresh(setting)
    return CollectorSettingsOut(**normalized, updated_at=setting.updated_at)


def remember_yujin_heartbeats(keys: list[str], recorded_at: datetime, source: str) -> None:
    with YUJIN_LIVE_MAP_LOCK:
        for key in keys:
            current = YUJIN_MAP_HEARTBEATS.get(key)
            if current and current[0] >= recorded_at:
                continue
            YUJIN_MAP_HEARTBEATS[key] = (recorded_at, source)


def heartbeat_timestamp(key: str, stored_at: datetime | None) -> datetime | None:
    heartbeat = YUJIN_MAP_HEARTBEATS.get(key.upper())
    if not heartbeat:
        return stored_at
    heartbeat_at, _ = heartbeat
    if stored_at is not None and stored_at >= heartbeat_at:
        return stored_at
    return heartbeat_at


def heartbeat_source(key: str, stored_source: str | None) -> str | None:
    heartbeat = YUJIN_MAP_HEARTBEATS.get(key.upper())
    if not heartbeat:
        return stored_source
    return heartbeat[1] or stored_source


@app.post("/api/control/group-operation", response_model=ControlCommandOut)
async def create_group_operation_command(
    payload: GroupOperationIn,
    db: Session = Depends(get_db),
) -> ControlCommandOut:
    command = enqueue_control_command(
        db,
        "raw_uart4",
        {
            "source": "group_operation",
            "action": payload.action,
            **legacy_raw_frame(build_group_operation_payload(payload.action)),
        },
        supersede_source="group_operation",
    )
    await manager.broadcast_json({"type": "control_command_update", "id": command.id, "status": command.status})
    return command_out(command)


@app.post("/api/control/group-settings", response_model=ControlCommandOut)
async def create_group_settings_command(
    payload: GroupSettingsIn,
    db: Session = Depends(get_db),
) -> ControlCommandOut:
    pressure_gap_value = round(payload.pressure_gap * 10)
    frames = [
        legacy_map_write_frame(0x16, round(payload.no_load_pressure * 10)),
        legacy_map_write_frame(0x18, round(payload.load_pressure * 10)),
        legacy_raw_frame([0xC9, 0x82, 0x3C, (pressure_gap_value >> 8) & 0xFF, pressure_gap_value & 0xFF]),
        legacy_map_write_frame(0x54, round(payload.low_alarm_pressure * 10)),
        legacy_map_write_frame(0x26, int(payload.run_units)),
        legacy_map_write_frame(0x42, int(payload.change_hours)),
        legacy_map_write_frame(0x22, 1 if payload.control_mode == "group" else 0),
        legacy_map_write_frame(0x24, set_word_low_byte(current_map_int(db, "0024", 0), 1 if payload.sort_mode == "time" else 0)),
        legacy_map_write_frame(0x50, set_word_high_byte(current_map_int(db, "0050", 0), 0 if payload.operation_mode == "local" else 1)),
    ]
    command = enqueue_control_command(
        db,
        "raw_uart4_batch",
        {
            "source": "group_settings",
            "frames": frames,
        },
    )
    await manager.broadcast_json({"type": "control_command_update", "id": command.id, "status": command.status})
    return command_out(command)


@app.post("/api/control/map-write-batch", response_model=ControlCommandOut)
async def create_map_write_batch_command(
    payload: MapWriteBatchIn,
    db: Session = Depends(get_db),
) -> ControlCommandOut:
    if not payload.writes:
        raise HTTPException(status_code=422, detail="writes cannot be empty")

    command = enqueue_control_command(
        db,
        "map_write_batch",
        {
            "source": payload.source,
            "writes": [normalize_map_write(write) for write in payload.writes],
        },
        supersede_source=payload.source if payload.source in SUPERSEDE_PENDING_CONTROL_SOURCES else None,
    )
    await manager.broadcast_json({"type": "control_command_update", "id": command.id, "status": command.status})
    return command_out(command)


@app.post("/api/control/raw-uart4", response_model=ControlCommandOut)
async def create_raw_uart4_command(
    payload: RawUart4CommandIn,
    db: Session = Depends(get_db),
) -> ControlCommandOut:
    command = enqueue_control_command(
        db,
        "raw_uart4",
        {
            "source": payload.source,
            "payload_hex": normalize_hex_payload(payload.payload_hex),
            "append_crc": payload.append_crc,
            "wait_response": payload.wait_response,
        },
    )
    await manager.broadcast_json({"type": "control_command_update", "id": command.id, "status": command.status})
    return command_out(command)


@app.post("/api/control/raw-uart4-batch", response_model=ControlCommandOut)
async def create_raw_uart4_batch_command(
    payload: RawUart4BatchCommandIn,
    db: Session = Depends(get_db),
) -> ControlCommandOut:
    if not payload.frames:
        raise HTTPException(status_code=422, detail="frames cannot be empty")
    command = enqueue_control_command(
        db,
        "raw_uart4_batch",
        {
            "source": payload.source,
            "frames": [
                {
                    "payload_hex": normalize_hex_payload(frame.payload_hex),
                    "append_crc": frame.append_crc,
                    "wait_response": frame.wait_response,
                    "delay_after_seconds": frame.delay_after_seconds,
                }
                for frame in payload.frames
            ],
        },
    )
    await manager.broadcast_json({"type": "control_command_update", "id": command.id, "status": command.status})
    return command_out(command)


@app.get("/api/control/commands/next", response_model=list[ControlCommandOut])
def next_control_commands(
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    x_collector_token: str | None = Header(default=None),
) -> list[ControlCommandOut]:
    if x_collector_token != settings.collector_token:
        raise HTTPException(status_code=401, detail="Invalid collector token")

    now = datetime.now(timezone.utc)
    stale_before = now - timedelta(seconds=CONTROL_COMMAND_STALE_SECONDS)
    stale_commands = db.scalars(
        select(ControlCommand)
        .where(ControlCommand.status == "in_progress")
        .where(ControlCommand.updated_at < stale_before)
    ).all()
    for command in stale_commands:
        command.status = "pending"
        command.error_text = "stale in_progress command requeued"
        command.updated_at = now

    commands = db.scalars(
        select(ControlCommand)
        .where(ControlCommand.status == "pending")
        .order_by(ControlCommand.created_at.asc(), ControlCommand.id.asc())
    ).all()
    commands = sorted(commands, key=control_command_priority)[:limit]
    for command in commands:
        command.status = "in_progress"
        command.error_text = None
        command.updated_at = now
    db.commit()
    for command in commands:
        db.refresh(command)
    return [command_out(command) for command in commands]


@app.get("/api/control/commands/{command_id}", response_model=ControlCommandOut)
def get_control_command(
    command_id: int,
    db: Session = Depends(get_db),
) -> ControlCommandOut:
    command = db.get(ControlCommand, command_id)
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    return command_out(command)


@app.post("/api/control/commands/{command_id}/ack", response_model=ControlCommandOut)
async def ack_control_command(
    command_id: int,
    payload: ControlCommandAckIn,
    db: Session = Depends(get_db),
    x_collector_token: str | None = Header(default=None),
) -> ControlCommandOut:
    if x_collector_token != settings.collector_token:
        raise HTTPException(status_code=401, detail="Invalid collector token")

    command = db.get(ControlCommand, command_id)
    if not command:
        raise HTTPException(status_code=404, detail="Command not found")
    command.status = payload.status
    command.error_text = payload.error
    command.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(command)
    await manager.broadcast_json({"type": "control_command_update", "id": command.id, "status": command.status})
    return command_out(command)


@app.get("/api/yujin/map-definitions", response_model=list[YujinMapDefinitionOut])
def yujin_map_definitions(
    section: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[YujinMapDefinitionOut]:
    stmt = select(YujinMapDefinition).order_by(YujinMapDefinition.key.asc())
    if section:
        stmt = stmt.where(YujinMapDefinition.section == section)
    rows = db.scalars(stmt).all()
    return [
        YujinMapDefinitionOut(
            key=row.key,
            data_type=row.data_type,
            data_length=row.data_length,
            signed=row.signed,
            default_value=row.default_value,
            name=row.name,
            section=row.section,
            source=row.source,
        )
        for row in rows
    ]


@app.get("/api/yujin/live-map", response_model=list[YujinMapValueOut])
def yujin_live_map_values(
    section: str | None = Query(default=None),
    key_prefix: str | None = Query(default=None),
    limit: int = Query(default=1000, le=2000),
) -> list[YujinMapValueOut]:
    definitions = yujin_schema_index()
    rows: list[YujinMapValueOut] = []
    with YUJIN_LIVE_MAP_LOCK:
        live_items = [(key, YUJIN_LIVE_MAP[key], YUJIN_MAP_HEARTBEATS.get(key)) for key in sorted(YUJIN_LIVE_MAP.keys())]
        heartbeat_items = [
            (key, None, heartbeat)
            for key, heartbeat in sorted(YUJIN_MAP_HEARTBEATS.items())
            if key not in YUJIN_LIVE_MAP
        ]
    for key, live, heartbeat in [*live_items, *heartbeat_items]:
        definition = definitions.get(key)
        if not definition:
            continue
        if section and definition["section"] != section:
            continue
        if key_prefix and not key.startswith(key_prefix.upper()):
            continue
        rows.append(yujin_live_value_out(definition, live) if live else yujin_heartbeat_value_out(definition, heartbeat))
        if len(rows) >= limit:
            break
    return rows


@app.get("/api/yujin/map-values", response_model=list[YujinMapValueOut])
def yujin_map_values(
    section: str | None = Query(default=None),
    key_prefix: str | None = Query(default=None),
    limit: int = Query(default=300, le=2000),
    db: Session = Depends(get_db),
) -> list[YujinMapValueOut]:
    stmt = (
        select(YujinMapDefinition, YujinMapValue)
        .join(YujinMapValue, YujinMapValue.definition_id == YujinMapDefinition.id)
        .order_by(YujinMapDefinition.key.asc())
        .limit(limit)
    )
    if section:
        stmt = stmt.where(YujinMapDefinition.section == section)
    if key_prefix:
        stmt = stmt.where(YujinMapDefinition.key.like(f"{key_prefix.upper()}%"))

    rows = db.execute(stmt).all()
    return [
        YujinMapValueOut(
            key=definition.key,
            data_type=definition.data_type,
            data_length=definition.data_length,
            signed=definition.signed,
            default_value=definition.default_value,
            name=definition.name,
            section=definition.section,
            value=current.value_text,
            updated_at=heartbeat_timestamp(definition.key, current.updated_at),
            source=heartbeat_source(definition.key, current.source),
        )
        for definition, current in rows
    ]


@app.get("/api/yujin/map-values/{key}", response_model=YujinMapValueOut)
def yujin_map_value(key: str, db: Session = Depends(get_db)) -> YujinMapValueOut:
    row = db.execute(
        select(YujinMapDefinition, YujinMapValue)
        .join(YujinMapValue, YujinMapValue.definition_id == YujinMapDefinition.id)
        .where(YujinMapDefinition.key == key.upper())
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Map key not found")

    definition, current = row
    return YujinMapValueOut(
        key=definition.key,
        data_type=definition.data_type,
        data_length=definition.data_length,
        signed=definition.signed,
        default_value=definition.default_value,
        name=definition.name,
        section=definition.section,
        value=current.value_text,
        updated_at=heartbeat_timestamp(definition.key, current.updated_at),
        source=heartbeat_source(definition.key, current.source),
    )


@app.get("/api/yujin/map-values/{key}/history", response_model=list[YujinMapValueHistoryOut])
def yujin_map_value_history(
    key: str,
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db),
) -> list[YujinMapValueHistoryOut]:
    rows = db.execute(
        select(YujinMapValueHistory, YujinMapDefinition)
        .join(YujinMapDefinition, YujinMapDefinition.id == YujinMapValueHistory.definition_id)
        .where(YujinMapDefinition.key == key.upper())
        .order_by(desc(YujinMapValueHistory.recorded_at))
        .limit(limit)
    ).all()
    return [
        YujinMapValueHistoryOut(
            key=definition.key,
            value=history.value_text,
            recorded_at=history.recorded_at,
            source=history.source,
        )
        for history, definition in rows
    ]


@app.post("/api/yujin/ingest-map")
async def ingest_yujin_map_values(
    payload: YujinMapIngestRequest,
    x_collector_token: str | None = Header(default=None),
) -> dict:
    ingest_started = time.monotonic()
    if x_collector_token != settings.collector_token:
        raise HTTPException(status_code=401, detail="Invalid collector token")

    recorded_at = payload.recorded_at or datetime.now(timezone.utc)
    normalized_values = [(item.key.upper(), str(item.value)) for item in payload.values]
    heartbeat_keys = [key.upper() for key in payload.heartbeat_keys]
    keys = list(dict.fromkeys([key for key, _ in normalized_values] + heartbeat_keys))
    if not keys:
        return {"status": "accepted", "received_count": 0, "updated_count": 0, "keys": []}
    remember_yujin_heartbeats(keys, recorded_at, payload.source)

    with YUJIN_LIVE_MAP_LOCK:
        for key, value_text in normalized_values:
            YUJIN_LIVE_MAP[key] = (value_text, recorded_at, payload.source)

        for key in heartbeat_keys:
            if key not in YUJIN_LIVE_MAP:
                continue
            value_text, _, _ = YUJIN_LIVE_MAP[key]
            YUJIN_LIVE_MAP[key] = (value_text, recorded_at, payload.source)

    broadcast_values = [
        {
            "key": key,
            "value": value_text,
            "updated_at": recorded_at.isoformat(),
            "source": payload.source,
        }
        for key, value_text in normalized_values
    ]
    await manager.broadcast_json(
        {
            "type": "yujin_map_update",
            "keys": keys,
            "values": broadcast_values,
            "recorded_at": recorded_at.isoformat(),
            "source": payload.source,
        }
    )
    elapsed_ms = (time.monotonic() - ingest_started) * 1000
    if elapsed_ms >= YUJIN_INGEST_SLOW_LOG_MS:
        print(
            "yujin ingest-map slow: "
            f"{elapsed_ms:.0f}ms received={len(normalized_values)} heartbeat={len(heartbeat_keys)}"
        )
    return {
        "status": "accepted",
        "received_count": len(normalized_values),
        "updated_count": len(normalized_values),
        "keys": keys,
    }


@app.get("/api/devices", response_model=list[DeviceOut])
def list_devices(db: Session = Depends(get_db)) -> list[DeviceOut]:
    devices = db.scalars(
        select(Device).options(selectinload(Device.current_values)).order_by(Device.code.asc())
    ).all()
    return [
        DeviceOut(
            id=device.id,
            code=device.code,
            name=device.name,
            location=device.location,
            status=device.status,
            last_seen_at=device.last_seen_at,
            current_values=[
                {
                    "metric_key": value.metric_key,
                    "value": metric_output_value(value.value_num, value.value_text),
                    "unit": value.unit,
                    "updated_at": value.updated_at,
                }
                for value in sorted(device.current_values, key=lambda item: item.metric_key)
            ],
        )
        for device in devices
    ]


@app.get("/api/devices/{device_id}/history", response_model=list[TelemetryRecordOut])
def device_history(
    device_id: int,
    metric_key: str = Query(...),
    limit: int = Query(default=30, le=200),
    db: Session = Depends(get_db),
) -> list[TelemetryRecordOut]:
    records = db.scalars(
        select(TelemetryRecord)
        .where(TelemetryRecord.device_id == device_id, TelemetryRecord.metric_key == metric_key)
        .order_by(desc(TelemetryRecord.recorded_at))
        .limit(limit)
    ).all()
    return [
        TelemetryRecordOut(
            metric_key=record.metric_key,
            value=metric_output_value(record.value_num, record.value_text),
            unit=record.unit,
            recorded_at=record.recorded_at,
        )
        for record in records
    ]


@app.get("/api/alarms/recent", response_model=list[AlarmOut])
def recent_alarms(limit: int = Query(default=20, le=100), db: Session = Depends(get_db)) -> list[AlarmOut]:
    rows = db.execute(
        select(Alarm, Device)
        .join(Device, Device.id == Alarm.device_id)
        .order_by(desc(Alarm.created_at))
        .limit(limit)
    ).all()
    return [
        AlarmOut(
            id=alarm.id,
            device_id=device.id,
            device_code=device.code,
            device_name=device.name,
            level=alarm.level,
            message=alarm.message,
            active=alarm.active,
            created_at=alarm.created_at,
        )
        for alarm, device in rows
    ]


@app.get("/api/status/overview", response_model=OverviewOut)
def status_overview(db: Session = Depends(get_db)) -> OverviewOut:
    total_devices = db.scalar(select(func.count(Device.id))) or 0
    online_devices = db.scalar(select(func.count(Device.id)).where(Device.status == "running")) or 0
    active_alarms = db.scalar(select(func.count(Alarm.id)).where(Alarm.active.is_(True))) or 0
    last_updated_at = db.scalar(select(func.max(CurrentValue.updated_at)))
    return OverviewOut(
        total_devices=total_devices,
        online_devices=online_devices,
        active_alarms=active_alarms,
        last_updated_at=last_updated_at,
    )


@app.post("/api/ingest/telemetry")
async def ingest_telemetry(
    payload: TelemetryIngestRequest,
    db: Session = Depends(get_db),
    x_collector_token: str | None = Header(default=None),
) -> dict:
    if x_collector_token != settings.collector_token:
        raise HTTPException(status_code=401, detail="Invalid collector token")

    device = db.scalar(select(Device).where(Device.code == payload.device_code))
    if not device:
        device = Device(
            code=payload.device_code,
            name=payload.device_name or payload.device_code,
            location=payload.location or "Factory Floor",
            status=payload.status,
        )
        db.add(device)
        db.flush()

    device.name = payload.device_name or device.name
    device.location = payload.location or device.location
    device.status = payload.status
    device.last_seen_at = payload.recorded_at or datetime.now(timezone.utc)

    recorded_at = payload.recorded_at or datetime.now(timezone.utc)

    for metric in payload.metrics:
        value_num, value_text = normalize_metric_value(metric.value)
        record = TelemetryRecord(
            device_id=device.id,
            metric_key=metric.key,
            value_num=value_num,
            value_text=value_text,
            unit=metric.unit,
            source=payload.source,
            recorded_at=recorded_at,
        )
        db.add(record)

        current_value = db.scalar(
            select(CurrentValue).where(
                CurrentValue.device_id == device.id, CurrentValue.metric_key == metric.key
            )
        )
        if current_value:
            current_value.value_num = value_num
            current_value.value_text = value_text
            current_value.unit = metric.unit
            current_value.updated_at = recorded_at
        else:
            db.add(
                CurrentValue(
                    device_id=device.id,
                    metric_key=metric.key,
                    value_num=value_num,
                    value_text=value_text,
                    unit=metric.unit,
                    updated_at=recorded_at,
                )
            )

    for alarm in payload.alarms:
        db.add(
            Alarm(
                device_id=device.id,
                level=alarm.level,
                message=alarm.message,
                active=alarm.active,
            )
        )

    db.commit()

    current_values = db.scalars(select(CurrentValue).where(CurrentValue.device_id == device.id)).all()
    await manager.broadcast_json(
        {
            "type": "telemetry_update",
            "device": {
                "id": device.id,
                "code": device.code,
                "name": device.name,
                "location": device.location,
                "status": device.status,
                "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None,
                "current_values": [
                    {
                        "metric_key": value.metric_key,
                        "value": metric_output_value(value.value_num, value.value_text),
                        "unit": value.unit,
                        "updated_at": value.updated_at.isoformat(),
                    }
                    for value in sorted(current_values, key=lambda item: item.metric_key)
                ],
            },
        }
    )

    return {"status": "accepted", "device_code": device.code, "metrics_count": len(payload.metrics)}


@app.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "connected"})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


def normalize_metric_value(raw_value: float | str) -> tuple[float | None, str | None]:
    if isinstance(raw_value, (int, float)):
        return float(raw_value), None

    try:
        return float(raw_value), str(raw_value)
    except ValueError:
        return None, raw_value


def metric_output_value(value_num: float | None, value_text: str | None) -> float | str:
    if value_text not in (None, "") and value_num is None:
        return value_text
    if value_num is None:
        return value_text or "-"
    return value_num
