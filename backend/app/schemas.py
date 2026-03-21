from datetime import datetime

from pydantic import BaseModel


class MetricIn(BaseModel):
    key: str
    value: float
    unit: str = ""


class AlarmIn(BaseModel):
    level: str
    message: str
    active: bool = True


class TelemetryIngestRequest(BaseModel):
    device_code: str
    device_name: str | None = None
    location: str | None = None
    status: str = "running"
    source: str = "collector-mock"
    metrics: list[MetricIn]
    alarms: list[AlarmIn] = []
    recorded_at: datetime | None = None


class CurrentValueOut(BaseModel):
    metric_key: str
    value: float
    unit: str
    updated_at: datetime


class DeviceOut(BaseModel):
    id: int
    code: str
    name: str
    location: str
    status: str
    last_seen_at: datetime | None
    current_values: list[CurrentValueOut]


class AlarmOut(BaseModel):
    id: int
    device_id: int
    device_code: str
    device_name: str
    level: str
    message: str
    active: bool
    created_at: datetime


class TelemetryRecordOut(BaseModel):
    metric_key: str
    value: float
    unit: str
    recorded_at: datetime


class OverviewOut(BaseModel):
    total_devices: int
    online_devices: int
    active_alarms: int
    last_updated_at: datetime | None
