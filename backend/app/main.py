from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import Base, engine, get_db, SessionLocal
from app.models import (
    Alarm,
    CurrentValue,
    Device,
    TelemetryRecord,
    YujinMapDefinition,
    YujinMapValue,
    YujinMapValueHistory,
)
from app.schemas import (
    AlarmOut,
    DeviceOut,
    OverviewOut,
    TelemetryIngestRequest,
    TelemetryRecordOut,
    YujinMapDefinitionOut,
    YujinMapIngestRequest,
    YujinMapValueHistoryOut,
    YujinMapValueOut,
)
from app.ws import manager
from app.yujin_map import build_yujin_map_schema


settings = get_settings()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    seed_devices()
    seed_yujin_map()


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


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "backend", "timestamp": datetime.now(timezone.utc)}


@app.get("/api/yujin/map-schema")
def yujin_map_schema() -> dict:
    return build_yujin_map_schema()


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
            updated_at=current.updated_at,
            source=current.source,
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
        updated_at=current.updated_at,
        source=current.source,
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
    db: Session = Depends(get_db),
    x_collector_token: str | None = Header(default=None),
) -> dict:
    if x_collector_token != settings.collector_token:
        raise HTTPException(status_code=401, detail="Invalid collector token")

    recorded_at = payload.recorded_at or datetime.now(timezone.utc)
    updated_keys: list[str] = []

    for item in payload.values:
        key = item.key.upper()
        definition = db.scalar(select(YujinMapDefinition).where(YujinMapDefinition.key == key))
        if not definition:
            raise HTTPException(status_code=404, detail=f"Map key not found: {key}")

        value_text = str(item.value)
        current = db.scalar(select(YujinMapValue).where(YujinMapValue.definition_id == definition.id))
        changed = True
        if current:
            changed = current.value_text != value_text
            current.value_text = value_text
            current.updated_at = recorded_at
            current.source = payload.source
        else:
            current = YujinMapValue(
                definition_id=definition.id,
                value_text=value_text,
                updated_at=recorded_at,
                source=payload.source,
            )
            db.add(current)

        if changed:
            db.add(
                YujinMapValueHistory(
                    definition_id=definition.id,
                    value_text=value_text,
                    recorded_at=recorded_at,
                    source=payload.source,
                )
            )
        updated_keys.append(key)

    db.commit()
    await manager.broadcast_json(
        {
            "type": "yujin_map_update",
            "keys": updated_keys,
            "recorded_at": recorded_at.isoformat(),
        }
    )
    return {"status": "accepted", "updated_count": len(updated_keys), "keys": updated_keys}


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
