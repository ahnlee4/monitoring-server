import abc
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone

import requests


@dataclass
class MetricFrame:
    device_code: str
    metrics: list[dict]
    alarms: list[dict]
    status: str
    recorded_at: str


class BaseCollector(abc.ABC):
    @abc.abstractmethod
    def poll(self) -> list[MetricFrame]:
        raise NotImplementedError


class RS485Collector(BaseCollector):
    def __init__(self, serial_port: str, baudrate: int) -> None:
        self.serial_port = serial_port
        self.baudrate = baudrate

    def poll(self) -> list[MetricFrame]:
        # MVP 단계에서는 실제 프로토콜 대신 교체 지점을 명확히 남긴다.
        print(
            f"RS485 collector placeholder active. Implement protocol reader for {self.serial_port} @ {self.baudrate}."
        )
        return []


def publish_frame(session: requests.Session, api_url: str, token: str, frame: MetricFrame) -> None:
    response = session.post(
        api_url,
        json={
            "device_code": frame.device_code,
            "device_name": frame.device_code,
            "location": "RS485 Bus",
            "status": frame.status,
            "source": "collector-rs485",
            "recorded_at": frame.recorded_at,
            "metrics": frame.metrics,
            "alarms": frame.alarms,
        },
        headers={"X-Collector-Token": token},
        timeout=5,
    )
    response.raise_for_status()


def main() -> None:
    api_url = os.getenv("COLLECTOR_API_URL", "http://backend:8000/api/ingest/telemetry")
    token = os.getenv("COLLECTOR_TOKEN", "change-me")
    serial_port = os.getenv("RS485_SERIAL_PORT", "/dev/ttyUSB0")
    baudrate = int(os.getenv("RS485_BAUDRATE", "9600"))

    collector = RS485Collector(serial_port=serial_port, baudrate=baudrate)
    session = requests.Session()

    while True:
        frames = collector.poll()
        for frame in frames:
            try:
                publish_frame(session, api_url, token, frame)
            except Exception as exc:
                print(f"collector-rs485 publish error: {exc}")
        if not frames:
            print(f"collector-rs485 idle at {datetime.now(timezone.utc).isoformat()}")
        time.sleep(5)


if __name__ == "__main__":
    main()
