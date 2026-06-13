import time

from app.base import BaseCollector
from app.client import BackendClient
from app.config import get_env, get_int_env
from app.drivers.rs485_driver import RS485Collector


def build_collector() -> tuple[BaseCollector, int]:
    driver = get_env("COLLECTOR_DRIVER", "rs485").strip().lower()
    interval = get_int_env("COLLECTOR_INTERVAL_SECONDS", 3)

    if driver == "rs485":
        serial_port = get_env("RS485_SERIAL_PORT", "/dev/ttyUSB0")
        baudrate = get_int_env("RS485_BAUDRATE", 9600)
        comp_qty = get_int_env("RS485_COMP_QTY", 8)
        response_timeout = float(get_env("RS485_RESPONSE_TIMEOUT_SECONDS", "0.8"))
        inter_request_delay = float(get_env("RS485_INTER_REQUEST_DELAY_SECONDS", "0.05"))
        debug_hex = get_env("RS485_DEBUG_HEX", "false").strip().lower() in ("1", "true", "yes", "on")
        return (
            RS485Collector(
                serial_port=serial_port,
                baudrate=baudrate,
                comp_qty=comp_qty,
                response_timeout=response_timeout,
                inter_request_delay=inter_request_delay,
                debug_hex=debug_hex,
            ),
            interval,
        )

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
