from datetime import datetime, timezone

from app.base import BaseCollector
from app.models import CollectorBatch


class RS485Collector(BaseCollector):
    def __init__(self, serial_port: str, baudrate: int) -> None:
        self.serial_port = serial_port
        self.baudrate = baudrate

    def poll(self) -> CollectorBatch:
        # Replace this placeholder with actual serial read and protocol decode logic.
        recorded_at = datetime.now(timezone.utc).isoformat()
        print(
            f"RS485 collector placeholder active. Implement protocol reader for {self.serial_port} @ {self.baudrate}."
        )
        print(f"collector-rs485 idle at {recorded_at}")
        return CollectorBatch(source="collector-rs485", recorded_at=recorded_at)
