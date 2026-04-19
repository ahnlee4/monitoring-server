import time

from app.base import BaseCollector
from app.client import BackendClient
from app.config import get_env, get_int_env
from app.drivers.mock_driver import MockCollector
from app.drivers.rs485_driver import RS485Collector


def build_collector() -> tuple[BaseCollector, int]:
    driver = get_env("COLLECTOR_DRIVER", "mock").strip().lower()
    interval = get_int_env("COLLECTOR_INTERVAL_SECONDS", 3)

    if driver == "mock":
        device_codes = [
            code.strip()
            for code in get_env("COLLECTOR_DEVICE_CODES", "PRESS-01,FURNACE-01,PUMP-01").split(",")
            if code.strip()
        ]
        return MockCollector(device_codes=device_codes), interval

    if driver == "rs485":
        serial_port = get_env("RS485_SERIAL_PORT", "/dev/ttyUSB0")
        baudrate = get_int_env("RS485_BAUDRATE", 9600)
        return RS485Collector(serial_port=serial_port, baudrate=baudrate), interval

    raise ValueError(f"Unsupported collector driver: {driver}")


def main() -> None:
    api_url = get_env("COLLECTOR_API_URL", "http://backend:8000/api/ingest/telemetry")
    yujin_api_url = get_env("COLLECTOR_YUJIN_API_URL", "http://backend:8000/api/yujin/ingest-map")
    token = get_env("COLLECTOR_TOKEN", "change-me")

    collector, interval = build_collector()
    client = BackendClient(api_url=api_url, token=token, yujin_api_url=yujin_api_url)

    while True:
        batch = collector.poll()
        for frame in batch.frames:
            try:
                client.publish(frame)
                print(f"sent telemetry for {frame.device_code} via {frame.source}")
            except Exception as exc:
                print(f"collector publish error for {frame.device_code}: {exc}")
        if batch.map_values:
            try:
                client.publish_map_batch(batch)
                print(f"sent yujin map batch with {len(batch.map_values)} values")
            except Exception as exc:
                print(f"collector yujin map publish error: {exc}")
        time.sleep(interval)


if __name__ == "__main__":
    main()
