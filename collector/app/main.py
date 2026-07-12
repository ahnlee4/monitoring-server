import time
import threading
from queue import Full, Queue

from app.base import BaseCollector
from app.client import BackendClient
from app.config import get_env, get_int_env
from app.drivers.rs485_driver import RS485Collector
from app.models import CollectorBatch


SENTINEL_BATCH = CollectorBatch(source="collector-stop", recorded_at="")


def collector_loop_delay(interval: float, idle_delay: float, batch: CollectorBatch) -> float:
    if interval > 0:
        return interval
    if batch.frames or batch.map_values or batch.heartbeat_keys:
        return 0.0
    return max(0.0, idle_delay)


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
        write_response_timeout = float(get_env("RS485_WRITE_RESPONSE_TIMEOUT_SECONDS", "0.35"))
        write_verify_attempts = get_int_env("RS485_WRITE_VERIFY_ATTEMPTS", 3)
        debug_hex = get_env("RS485_DEBUG_HEX", "false").strip().lower() in ("1", "true", "yes", "on")
        slow_address_log_ms = float(get_env("RS485_SLOW_ADDRESS_LOG_MS", "200"))
        settings_poll_interval_cycles = get_int_env("RS485_SETTINGS_POLL_INTERVAL_CYCLES", 5)
        full_snapshot_interval_cycles = get_int_env("RS485_FULL_SNAPSHOT_INTERVAL_CYCLES", 5)
        power_poll_interval_cycles = get_int_env("RS485_POWER_POLL_INTERVAL_CYCLES", 1)
        publish_telemetry_frames = (
            get_env("COLLECTOR_PUBLISH_TELEMETRY", "false").strip().lower() in ("1", "true", "yes", "on")
        )
        return (
            RS485Collector(
                serial_port=serial_port,
                baudrate=baudrate,
                comp_qty=comp_qty,
                response_timeout=response_timeout,
                inter_request_delay=inter_request_delay,
                write_request_delay=write_request_delay,
                write_response_timeout=write_response_timeout,
                write_verify_attempts=write_verify_attempts,
                debug_hex=debug_hex,
                slow_address_log_ms=slow_address_log_ms,
                publish_telemetry_frames=publish_telemetry_frames,
                settings_poll_interval_cycles=settings_poll_interval_cycles,
                full_snapshot_interval_cycles=full_snapshot_interval_cycles,
                power_poll_interval_cycles=power_poll_interval_cycles,
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
    last_fetch_error: str | None = None
    while True:
        try:
            commands = client.fetch_control_commands(limit=command_limit)
            if last_fetch_error is not None:
                print("collector control command connection recovered")
                last_fetch_error = None
        except Exception as exc:
            error = str(exc)
            if error != last_fetch_error:
                print(f"collector control command fetch error: {error}")
                last_fetch_error = error
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


def run_publish_loop(
    client: BackendClient,
    queue: Queue[CollectorBatch],
    publish_telemetry: bool,
    status_log_interval_seconds: float,
) -> None:
    last_status_log_at = 0.0
    last_map_error: str | None = None
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
        if batch.map_values or batch.heartbeat_keys:
            try:
                start = time.monotonic()
                client.publish_map_batch(batch)
                if last_map_error is not None:
                    print("collector yujin map connection recovered")
                    last_map_error = None
                elapsed_ms = (time.monotonic() - start) * 1000
                now = time.monotonic()
                if status_log_interval_seconds > 0 and now - last_status_log_at >= status_log_interval_seconds:
                    print(
                        "sent yujin map batch "
                        f"changed={len(batch.map_values)} heartbeat={len(batch.heartbeat_keys)} in {elapsed_ms:.0f}ms"
                    )
                    last_status_log_at = now
            except Exception as exc:
                error = str(exc)
                if error != last_map_error:
                    print(f"collector yujin map publish error: {error}")
                    last_map_error = error
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
    settings_poll_seconds = float(get_env("COLLECTOR_SETTINGS_POLL_SECONDS", "2"))
    slow_poll_log_ms = float(get_env("COLLECTOR_SLOW_POLL_LOG_MS", "0"))
    status_log_interval_seconds = float(get_env("COLLECTOR_STATUS_LOG_INTERVAL_SECONDS", "0"))
    idle_loop_delay_seconds = float(get_env("COLLECTOR_IDLE_LOOP_DELAY_SECONDS", "0.01"))
    token = get_env("COLLECTOR_TOKEN", "change-me")

    collector, interval = build_collector()
    print(f"collector main loop interval={interval}s slow_poll_log_ms={slow_poll_log_ms:g}")
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
        args=(data_client, publish_queue, publish_telemetry, status_log_interval_seconds),
        daemon=True,
    ).start()

    last_settings_poll = 0.0
    last_settings_error: str | None = None
    while True:
        if settings_poll_seconds >= 0 and time.monotonic() - last_settings_poll >= settings_poll_seconds:
            last_settings_poll = time.monotonic()
            try:
                collector_settings = control_client.fetch_collector_settings()
                serial_port = str(collector_settings.get("serial_port") or "").strip()
                if serial_port and hasattr(collector, "update_serial_port"):
                    collector.update_serial_port(serial_port)
                if last_settings_error is not None:
                    print("collector settings connection recovered")
                    last_settings_error = None
            except Exception as exc:
                error = str(exc)
                if error != last_settings_error:
                    print(f"collector settings fetch error: {error}")
                    last_settings_error = error

        poll_started = time.monotonic()
        batch = collector.poll()
        poll_elapsed_ms = (time.monotonic() - poll_started) * 1000
        if slow_poll_log_ms > 0 and poll_elapsed_ms >= slow_poll_log_ms:
            print(
                "collector poll cycle: "
                f"{poll_elapsed_ms:.0f}ms frames={len(batch.frames)} "
                f"changed={len(batch.map_values)} heartbeat={len(batch.heartbeat_keys)}"
            )
        if batch.map_values or batch.heartbeat_keys or (publish_telemetry and batch.frames):
            enqueue_latest_batch(publish_queue, batch)
        loop_delay = collector_loop_delay(interval, idle_loop_delay_seconds, batch)
        if loop_delay > 0:
            time.sleep(loop_delay)


if __name__ == "__main__":
    main()
