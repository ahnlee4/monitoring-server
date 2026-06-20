import time
import threading
from queue import Full, Queue

from app.base import BaseCollector
from app.client import BackendClient
from app.config import get_env, get_int_env
from app.drivers.rs485_driver import RS485Collector
from app.models import CollectorBatch


SENTINEL_BATCH = CollectorBatch(source="collector-stop", recorded_at="")


def build_collector() -> tuple[BaseCollector, int]:
    driver = get_env("COLLECTOR_DRIVER", "rs485").strip().lower()
    interval = get_int_env("COLLECTOR_INTERVAL_SECONDS", 0)

    if driver == "rs485":
        serial_port = get_env("RS485_SERIAL_PORT", "/dev/ttyUSB0")
        baudrate = get_int_env("RS485_BAUDRATE", 38400)
        comp_qty = get_int_env("RS485_COMP_QTY", 8)
        response_timeout = float(get_env("RS485_RESPONSE_TIMEOUT_SECONDS", "0.35"))
        inter_request_delay = float(get_env("RS485_INTER_REQUEST_DELAY_SECONDS", "0.005"))
        write_request_delay = float(get_env("RS485_WRITE_REQUEST_DELAY_SECONDS", "0.005"))
        write_response_timeout = float(get_env("RS485_WRITE_RESPONSE_TIMEOUT_SECONDS", "0"))
        debug_hex = get_env("RS485_DEBUG_HEX", "true").strip().lower() in ("1", "true", "yes", "on")
        return (
            RS485Collector(
                serial_port=serial_port,
                baudrate=baudrate,
                comp_qty=comp_qty,
                response_timeout=response_timeout,
                inter_request_delay=inter_request_delay,
                write_request_delay=write_request_delay,
                write_response_timeout=write_response_timeout,
                debug_hex=debug_hex,
            ),
            interval,
        )

    raise ValueError(f"Unsupported collector driver: {driver}")


def default_control_api_url(yujin_api_url: str) -> str:
    suffix = "/api/yujin/ingest-map"
    if yujin_api_url.endswith(suffix):
        return f"{yujin_api_url[: -len(suffix)]}/api/control"
    return "http://backend:8000/api/control"


def run_control_loop(
    collector: BaseCollector,
    client: BackendClient,
    command_limit: int,
    command_delay: float,
    poll_seconds: float,
) -> None:
    while True:
        try:
            commands = client.fetch_control_commands(limit=command_limit)
        except Exception as exc:
            print(f"collector control command fetch error: {exc}")
            commands = []

        for command in commands:
            try:
                if hasattr(collector, "request_control_priority"):
                    collector.request_control_priority()
                collector.execute_control_command(command)
                client.ack_control_command(command.id, "completed")
                print(f"collector control command {command.id} completed")
            except Exception as exc:
                error = str(exc)
                try:
                    client.ack_control_command(command.id, "failed", error)
                except Exception as ack_exc:
                    print(f"collector control command {command.id} ack error: {ack_exc}")
                print(f"collector control command {command.id} failed: {error}")
            finally:
                if hasattr(collector, "release_control_priority"):
                    collector.release_control_priority()
            time.sleep(command_delay)

        time.sleep(poll_seconds)


def enqueue_latest_batch(queue: Queue[CollectorBatch], batch: CollectorBatch) -> None:
    try:
        queue.put_nowait(batch)
        return
    except Full:
        pass

    try:
        queue.get_nowait()
    except Exception:
        pass
    try:
        queue.put_nowait(batch)
    except Full:
        pass


def run_publish_loop(client: BackendClient, queue: Queue[CollectorBatch], publish_telemetry: bool) -> None:
    while True:
        batch = queue.get()
        if batch is SENTINEL_BATCH:
            return

        if publish_telemetry:
            for frame in batch.frames:
                try:
                    client.publish(frame)
                    print(f"sent telemetry for {frame.device_code} via {frame.source}")
                except Exception as exc:
                    print(f"collector publish error for {frame.device_code}: {exc}")
        if batch.map_values:
            try:
                start = time.monotonic()
                client.publish_map_batch(batch)
                elapsed_ms = (time.monotonic() - start) * 1000
                print(f"sent yujin map batch with {len(batch.map_values)} values in {elapsed_ms:.0f}ms")
            except Exception as exc:
                print(f"collector yujin map publish error: {exc}")
        queue.task_done()


def main() -> None:
    api_url = get_env("COLLECTOR_API_URL", "http://backend:8000/api/ingest/telemetry")
    yujin_api_url = get_env("COLLECTOR_YUJIN_API_URL", "http://backend:8000/api/yujin/ingest-map")
    control_api_url = get_env("COLLECTOR_CONTROL_API_URL", default_control_api_url(yujin_api_url))
    publish_telemetry = get_env("COLLECTOR_PUBLISH_TELEMETRY", "false").strip().lower() in ("1", "true", "yes", "on")
    request_timeout = float(get_env("COLLECTOR_REQUEST_TIMEOUT_SECONDS", "15"))
    control_request_timeout = float(get_env("COLLECTOR_CONTROL_REQUEST_TIMEOUT_SECONDS", "2"))
    control_command_limit = get_int_env("COLLECTOR_CONTROL_COMMAND_LIMIT", 1)
    control_command_delay = float(get_env("COLLECTOR_CONTROL_COMMAND_DELAY_SECONDS", "0.05"))
    control_poll_seconds = float(get_env("COLLECTOR_CONTROL_POLL_SECONDS", "0.1"))
    token = get_env("COLLECTOR_TOKEN", "change-me")

    collector, interval = build_collector()
    data_client = BackendClient(
        api_url=api_url,
        token=token,
        yujin_api_url=yujin_api_url,
        request_timeout=request_timeout,
    )
    control_client = BackendClient(
        api_url=api_url,
        token=token,
        control_api_url=control_api_url,
        request_timeout=control_request_timeout,
    )

    threading.Thread(
        target=run_control_loop,
        args=(collector, control_client, control_command_limit, control_command_delay, control_poll_seconds),
        daemon=True,
    ).start()
    publish_queue: Queue[CollectorBatch] = Queue(maxsize=1)
    threading.Thread(
        target=run_publish_loop,
        args=(data_client, publish_queue, publish_telemetry),
        daemon=True,
    ).start()

    while True:
        batch = collector.poll()
        if batch.map_values or (publish_telemetry and batch.frames):
            enqueue_latest_batch(publish_queue, batch)
        time.sleep(interval)


if __name__ == "__main__":
    main()
