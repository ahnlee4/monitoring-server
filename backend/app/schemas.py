from datetime import datetime

from pydantic import BaseModel, Field
from typing import Literal


class MetricIn(BaseModel):
    key: str
    value: float | str
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
    source: str = "collector-uart4"
    metrics: list[MetricIn]
    alarms: list[AlarmIn] = []
    recorded_at: datetime | None = None


class CurrentValueOut(BaseModel):
    metric_key: str
    value: float | str
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
    value: float | str
    unit: str
    recorded_at: datetime


class OverviewOut(BaseModel):
    total_devices: int
    online_devices: int
    active_alarms: int
    last_updated_at: datetime | None


class YujinMapDefinitionOut(BaseModel):
    key: str
    data_type: int
    data_length: int
    signed: bool
    default_value: str
    name: str | None
    section: str
    source: str


class YujinMapValueOut(BaseModel):
    key: str
    data_type: int
    data_length: int
    signed: bool
    default_value: str
    name: str | None
    section: str
    value: str
    updated_at: datetime | None
    source: str | None


class YujinMapValueHistoryOut(BaseModel):
    key: str
    value: str
    recorded_at: datetime
    source: str


class YujinMapValueUpdateIn(BaseModel):
    key: str
    value: str | int | float


class YujinMapIngestRequest(BaseModel):
    source: str = "collector"
    recorded_at: datetime | None = None
    values: list[YujinMapValueUpdateIn]
    heartbeat_keys: list[str] = Field(default_factory=list)


class ModeRowIn(BaseModel):
    no: str
    values: list[str]


class ModeSettingsIn(BaseModel):
    rows: list[ModeRowIn]
    selected_mode_index: int = 0
    use_mode_count: int = 1


class ModeSettingsOut(ModeSettingsIn):
    updated_at: datetime | None = None


class GroupOperationIn(BaseModel):
    action: Literal["run", "stop"]


class GroupSettingsIn(BaseModel):
    no_load_pressure: float
    load_pressure: float
    pressure_gap: float
    low_alarm_pressure: float = 0
    run_units: int
    change_hours: int
    sort_mode: Literal["setting", "time"] = "setting"
    operation_mode: Literal["local", "remote"] = "remote"
    control_mode: Literal["single", "group"] = "group"


class MapWriteIn(BaseModel):
    key: str | None = None
    address: int | None = None
    high_addr: int | None = None
    low_addr: int | None = None
    length: int = 2
    value: int | None = None
    data_hex: str | None = None


class MapWriteBatchIn(BaseModel):
    source: str = "frontend"
    writes: list[MapWriteIn]


class RawUart4CommandIn(BaseModel):
    source: str = "frontend"
    payload_hex: str
    append_crc: bool = True
    wait_response: bool = False


class ControlCommandAckIn(BaseModel):
    status: Literal["completed", "failed"]
    error: str | None = None


class ControlCommandOut(BaseModel):
    id: int
    command_type: str
    status: str
    payload: dict
    requested_by: str
    error: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
