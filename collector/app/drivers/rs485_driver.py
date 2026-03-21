from datetime import datetime, timezone

from app.base import BaseCollector
from app.models import TelemetryFrame


class RS485Collector(BaseCollector):
    def __init__(self, serial_port: str, baudrate: int) -> None:
        self.serial_port = serial_port
        self.baudrate = baudrate

    def poll(self) -> list[TelemetryFrame]:
        # Replace this placeholder with actual serial read and protocol decode logic.
        print(
            f"RS485 collector placeholder active. Implement protocol reader for {self.serial_port} @ {self.baudrate}."
        )
        print(f"collector-rs485 idle at {datetime.now(timezone.utc).isoformat()}")
        return []
