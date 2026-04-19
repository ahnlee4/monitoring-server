from dataclasses import dataclass, field


@dataclass
class Metric:
    key: str
    value: float | str
    unit: str = ""


@dataclass
class AlarmEvent:
    level: str
    message: str
    active: bool = True


@dataclass
class MapValueUpdate:
    key: str
    value: float | int | str


@dataclass
class TelemetryFrame:
    device_code: str
    device_name: str
    location: str
    status: str
    source: str
    recorded_at: str
    metrics: list[Metric] = field(default_factory=list)
    alarms: list[AlarmEvent] = field(default_factory=list)

    def to_payload(self) -> dict:
        return {
            "device_code": self.device_code,
            "device_name": self.device_name,
            "location": self.location,
            "status": self.status,
            "source": self.source,
            "recorded_at": self.recorded_at,
            "metrics": [
                {"key": metric.key, "value": metric.value, "unit": metric.unit}
                for metric in self.metrics
            ],
            "alarms": [
                {"level": alarm.level, "message": alarm.message, "active": alarm.active}
                for alarm in self.alarms
            ],
        }


@dataclass
class CollectorBatch:
    source: str
    recorded_at: str
    frames: list[TelemetryFrame] = field(default_factory=list)
    map_values: list[MapValueUpdate] = field(default_factory=list)

    def map_payload(self) -> dict:
        return {
            "source": self.source,
            "recorded_at": self.recorded_at,
            "values": [{"key": item.key, "value": item.value} for item in self.map_values],
        }
