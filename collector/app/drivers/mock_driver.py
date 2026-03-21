import random
from datetime import datetime, timezone

from app.base import BaseCollector
from app.models import AlarmEvent, Metric, TelemetryFrame


class MockCollector(BaseCollector):
    def __init__(self, device_codes: list[str]) -> None:
        self.device_codes = device_codes
        self.device_map = {
            "PRESS-01": {"name": "Press Machine 01", "location": "Line A"},
            "FURNACE-01": {"name": "Furnace 01", "location": "Heat Zone"},
            "PUMP-01": {"name": "Cooling Pump 01", "location": "Utility Room"},
        }

    def poll(self) -> list[TelemetryFrame]:
        recorded_at = datetime.now(timezone.utc).isoformat()
        return [self._build_frame(device_code, recorded_at) for device_code in self.device_codes]

    def _build_frame(self, device_code: str, recorded_at: str) -> TelemetryFrame:
        status = "running"
        metrics: list[Metric] = []
        alarms: list[AlarmEvent] = []

        if device_code.startswith("PRESS"):
            temperature = round(random.uniform(42, 78), 1)
            pressure = round(random.uniform(5.5, 9.3), 2)
            metrics = [
                Metric(key="temperature", value=temperature, unit="C"),
                Metric(key="pressure", value=pressure, unit="bar"),
            ]
            if pressure > 8.7:
                alarms.append(AlarmEvent(level="warning", message=f"{device_code} pressure high"))
        elif device_code.startswith("FURNACE"):
            temperature = round(random.uniform(280, 420), 1)
            load = round(random.uniform(55, 93), 1)
            metrics = [
                Metric(key="temperature", value=temperature, unit="C"),
                Metric(key="load", value=load, unit="%"),
            ]
            if temperature > 390:
                alarms.append(AlarmEvent(level="critical", message=f"{device_code} overheat detected"))
        else:
            flow_rate = round(random.uniform(120, 180), 1)
            vibration = round(random.uniform(1.0, 4.3), 2)
            metrics = [
                Metric(key="flow_rate", value=flow_rate, unit="L/min"),
                Metric(key="vibration", value=vibration, unit="mm/s"),
            ]
            if vibration > 3.8:
                alarms.append(
                    AlarmEvent(level="warning", message=f"{device_code} vibration threshold exceeded")
                )
            if flow_rate < 130:
                status = "attention"

        device_meta = self.device_map.get(device_code, {"name": device_code, "location": "Factory Floor"})
        return TelemetryFrame(
            device_code=device_code,
            device_name=device_meta["name"],
            location=device_meta["location"],
            status=status,
            source="collector-mock",
            recorded_at=recorded_at,
            metrics=metrics,
            alarms=alarms,
        )
