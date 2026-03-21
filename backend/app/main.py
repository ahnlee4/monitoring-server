from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import Base, engine, get_db, SessionLocal
from app.models import Alarm, CurrentValue, Device, TelemetryRecord
from app.schemas import AlarmOut, DeviceOut, OverviewOut, TelemetryIngestRequest, TelemetryRecordOut
from app.ws import manager


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


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "backend", "timestamp": datetime.now(timezone.utc)}


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
                    "value": value.value,
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
            value=record.value,
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
        record = TelemetryRecord(
            device_id=device.id,
            metric_key=metric.key,
            value=metric.value,
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
            current_value.value = metric.value
            current_value.unit = metric.unit
            current_value.updated_at = recorded_at
        else:
            db.add(
                CurrentValue(
                    device_id=device.id,
                    metric_key=metric.key,
                    value=metric.value,
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
                        "value": value.value,
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
