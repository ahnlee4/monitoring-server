import random
from datetime import datetime, timezone

from app.base import BaseCollector
from app.models import AlarmEvent, CollectorBatch, MapValueUpdate, Metric, TelemetryFrame


class MockCollector(BaseCollector):
    def __init__(self, device_codes: list[str]) -> None:
        self.device_codes = device_codes
        self.device_map = {
            "PRESS-01": {"name": "1호기", "location": "Line A", "model": "75F-A"},
            "FURNACE-01": {"name": "2호기", "location": "Heat Zone", "model": "110V"},
            "PUMP-01": {"name": "3호기", "location": "Utility Room", "model": "55F-A"},
        }

    def poll(self) -> CollectorBatch:
        recorded_at = datetime.now(timezone.utc).isoformat()
        frames = [self._build_frame(device_code, recorded_at) for device_code in self.device_codes]
        map_values = self._build_map_values(frames, recorded_at)
        return CollectorBatch(
            source="collector-mock",
            recorded_at=recorded_at,
            frames=frames,
            map_values=map_values,
        )

    def _build_frame(self, device_code: str, recorded_at: str) -> TelemetryFrame:
        status = "running"
        metrics: list[Metric] = []
        alarms: list[AlarmEvent] = []

        if device_code.startswith("PRESS"):
            temperature = round(random.uniform(42, 78), 1)
            pressure = round(random.uniform(5.5, 9.3), 2)
            unload = round(max(0.0, pressure - 0.4), 1)
            load = round(pressure + 0.3, 1)
            metrics = [
                Metric(key="temperature", value=temperature, unit="C"),
                Metric(key="pressure", value=pressure, unit="bar"),
                Metric(key="unload", value=unload, unit="bar"),
                Metric(key="load", value=load, unit="bar"),
            ]
            if pressure > 8.7:
                alarms.append(AlarmEvent(level="warning", message=f"{device_code} pressure high"))
        elif device_code.startswith("FURNACE"):
            temperature = round(random.uniform(280, 420), 1)
            control_pressure = round(random.uniform(6.1, 7.4), 1)
            rpm = int(random.uniform(1600, 2100))
            metrics = [
                Metric(key="temperature", value=temperature, unit="C"),
                Metric(key="pressure", value=round(random.uniform(6.0, 7.8), 2), unit="bar"),
                Metric(key="control_pressure", value=control_pressure, unit="bar"),
                Metric(key="rpm", value=rpm, unit="rpm"),
            ]
            if temperature > 390:
                alarms.append(AlarmEvent(level="critical", message=f"{device_code} overheat detected"))
        else:
            flow_rate = round(random.uniform(120, 180), 1)
            vibration = round(random.uniform(1.0, 4.3), 2)
            pressure = round(random.uniform(4.8, 6.2), 2)
            metrics = [
                Metric(key="pressure", value=pressure, unit="bar"),
                Metric(key="temperature", value=round(random.uniform(30, 54), 1), unit="C"),
                Metric(key="flow_rate", value=flow_rate, unit="L/min"),
                Metric(key="vibration", value=vibration, unit="mm/s"),
                Metric(key="unload", value=round(max(0.0, pressure - 0.5), 1), unit="bar"),
                Metric(key="load", value=round(pressure + 0.4, 1), unit="bar"),
            ]
            if vibration > 3.8:
                alarms.append(
                    AlarmEvent(level="warning", message=f"{device_code} vibration threshold exceeded")
                )
            if flow_rate < 130:
                status = "attention"

        device_meta = self.device_map.get(device_code, {"name": device_code, "location": "Factory Floor"})
        operate_state = "1" if status == "running" else "2" if status == "attention" else "0"
        mode_state = "1" if device_code.startswith("FURNACE") else "0"
        alarm_state = "1" if alarms else "0"
        error_state = "1" if status == "attention" and device_code.startswith("PUMP") else "0"
        return TelemetryFrame(
            device_code=device_code,
            device_name=device_meta["name"],
            location=device_meta["location"],
            status=status,
            source="collector-mock",
            recorded_at=recorded_at,
            metrics=metrics
            + [
                Metric(key="model_name", value=device_meta.get("model", device_code)),
                Metric(key="operate_state", value=operate_state),
                Metric(key="mode_state", value=mode_state),
                Metric(key="op_time", value=str(int(random.uniform(1200, 9800))), unit="hr"),
                Metric(key="comm_state", value="0"),
                Metric(key="alarm_state", value=alarm_state),
                Metric(key="error_state", value=error_state),
            ],
            alarms=alarms,
        )

    def _build_map_values(self, frames: list[TelemetryFrame], recorded_at: str) -> list[MapValueUpdate]:
        def metric_value(frame: TelemetryFrame, key: str, default: float | int | str = 0) -> float | int | str:
            for metric in frame.metrics:
                if metric.key == key:
                    return metric.value
            return default

        values: list[MapValueUpdate] = []
        device_count = len(frames)
        avg_pressure = 0.0
        if frames:
            numeric_pressures = [float(metric_value(frame, "pressure", 0)) for frame in frames]
            avg_pressure = sum(numeric_pressures) / len(numeric_pressures)

        now = datetime.fromisoformat(recorded_at.replace("Z", "+00:00")).astimezone()
        inject_mask = 0
        connect_mask = 0
        use_device_mask = 0
        for index in range(device_count):
            connect_mask |= 1 << index
            use_device_mask |= 1 << index
        if device_count >= 3:
            inject_mask |= 1 << 2

        values.extend(
            [
                MapValueUpdate("0000", round(avg_pressure * 10)),
                MapValueUpdate("0002", connect_mask),
                MapValueUpdate("0006", inject_mask),
                MapValueUpdate("0008", 0),
                MapValueUpdate("0016", 80),
                MapValueUpdate("0018", 70),
                MapValueUpdate("0022", 1),
                MapValueUpdate("004A", 4351),
                MapValueUpdate("004C", use_device_mask),
                MapValueUpdate("004E", device_count),
                MapValueUpdate("005C", int(now.strftime("%y%W"))),
                MapValueUpdate("005E", int(now.strftime("%m%d"))),
                MapValueUpdate("0060", int(now.strftime("%H%M"))),
                MapValueUpdate("0062", now.second),
            ]
        )
        for seq in range(9):
            key = f"{0x28 + (seq * 2):04X}"
            values.append(MapValueUpdate(key, seq + 1 if seq < device_count else 0))

        for index, frame in enumerate(frames, start=1):
            is_oilfree = index == 3
            prefix = f"{2 if is_oilfree else 1}{index:X}"
            pressure = int(round(float(metric_value(frame, "pressure", 0)) * 10))
            temperature = int(round(float(metric_value(frame, "temperature", 0))))
            unload = int(round(float(metric_value(frame, "unload", metric_value(frame, "control_pressure", 0))) * 10))
            load = int(round(float(metric_value(frame, "load", metric_value(frame, "rpm", 0)))))
            operate_state = str(metric_value(frame, "operate_state", "0"))
            model_name = str(metric_value(frame, "model_name", frame.device_name))
            total_hours = int(float(metric_value(frame, "op_time", 0)))
            alarm_bit = 1 if frame.alarms else 0

            if is_oilfree:
                values.extend(
                    [
                        MapValueUpdate(f"{prefix}00", pressure),
                        MapValueUpdate(f"{prefix}0C", temperature),
                        MapValueUpdate(f"{prefix}28", alarm_bit),
                        MapValueUpdate(f"{prefix}30", operate_state_to_cp(operate_state)),
                        MapValueUpdate(f"{prefix}3A", int(metric_value(frame, "mode_state", 0))),
                        MapValueUpdate(f"{prefix}38", int(metric_value(frame, "rpm", 0))),
                        MapValueUpdate(f"{prefix}46", unload),
                        MapValueUpdate(f"{prefix}4E", unload),
                        MapValueUpdate(f"{prefix}50", load),
                        MapValueUpdate(f"{prefix}7C", model_name[:8]),
                        MapValueUpdate(f"{prefix}9A", total_hours & 0xFFFF),
                        MapValueUpdate(f"{prefix}9C", total_hours >> 16),
                    ]
                )
            else:
                values.extend(
                    [
                        MapValueUpdate(f"{prefix}00", pressure),
                        MapValueUpdate(f"{prefix}02", temperature),
                        MapValueUpdate(f"{prefix}0A", alarm_bit),
                        MapValueUpdate(f"{prefix}16", operate_state_to_cp(operate_state)),
                        MapValueUpdate(f"{prefix}18", int(metric_value(frame, "mode_state", 0))),
                        MapValueUpdate(f"{prefix}26", unload),
                        MapValueUpdate(f"{prefix}28", load),
                        MapValueUpdate(f"{prefix}72", model_name[:8]),
                        MapValueUpdate(f"{prefix}68", total_hours & 0xFFFF),
                        MapValueUpdate(f"{prefix}6A", total_hours >> 16),
                    ]
                )

        return values


def operate_state_to_cp(operate_state: str) -> int:
    if operate_state == "1":
        return 1
    if operate_state == "2":
        return 2
    return 0
