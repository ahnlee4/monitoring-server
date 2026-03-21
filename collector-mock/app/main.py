import os
import random
import time
from datetime import datetime, timezone

import requests


API_URL = os.getenv("COLLECTOR_API_URL", "http://backend:8000/api/ingest/telemetry")
TOKEN = os.getenv("COLLECTOR_TOKEN", "change-me")
INTERVAL = int(os.getenv("COLLECTOR_INTERVAL_SECONDS", "3"))
DEVICE_CODES = [code.strip() for code in os.getenv("COLLECTOR_DEVICE_CODES", "PRESS-01,FURNACE-01,PUMP-01").split(",")]


DEVICE_MAP = {
    "PRESS-01": {"name": "Press Machine 01", "location": "Line A"},
    "FURNACE-01": {"name": "Furnace 01", "location": "Heat Zone"},
    "PUMP-01": {"name": "Cooling Pump 01", "location": "Utility Room"},
}


def build_metrics(device_code: str) -> tuple[list[dict], list[dict], str]:
    status = "running"
    metrics: list[dict] = []
    alarms: list[dict] = []

    if device_code.startswith("PRESS"):
        temperature = round(random.uniform(42, 78), 1)
        pressure = round(random.uniform(5.5, 9.3), 2)
        metrics = [
            {"key": "temperature", "value": temperature, "unit": "C"},
            {"key": "pressure", "value": pressure, "unit": "bar"},
        ]
        if pressure > 8.7:
            alarms.append({"level": "warning", "message": f"{device_code} pressure high", "active": True})
    elif device_code.startswith("FURNACE"):
        temperature = round(random.uniform(280, 420), 1)
        load = round(random.uniform(55, 93), 1)
        metrics = [
            {"key": "temperature", "value": temperature, "unit": "C"},
            {"key": "load", "value": load, "unit": "%"},
        ]
        if temperature > 390:
            alarms.append({"level": "critical", "message": f"{device_code} overheat detected", "active": True})
    else:
        flow_rate = round(random.uniform(120, 180), 1)
        vibration = round(random.uniform(1.0, 4.3), 2)
        metrics = [
            {"key": "flow_rate", "value": flow_rate, "unit": "L/min"},
            {"key": "vibration", "value": vibration, "unit": "mm/s"},
        ]
        if vibration > 3.8:
            alarms.append({"level": "warning", "message": f"{device_code} vibration threshold exceeded", "active": True})
        if flow_rate < 130:
            status = "attention"

    return metrics, alarms, status


def send_payload(session: requests.Session, device_code: str) -> None:
    metrics, alarms, status = build_metrics(device_code)
    device_meta = DEVICE_MAP.get(device_code, {"name": device_code, "location": "Factory Floor"})
    payload = {
        "device_code": device_code,
        "device_name": device_meta["name"],
        "location": device_meta["location"],
        "status": status,
        "source": "collector-mock",
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "alarms": alarms,
    }
    response = session.post(
        API_URL,
        json=payload,
        headers={"X-Collector-Token": TOKEN},
        timeout=5,
    )
    response.raise_for_status()


def main() -> None:
    session = requests.Session()
    while True:
        for device_code in DEVICE_CODES:
            try:
                send_payload(session, device_code)
                print(f"sent mock telemetry for {device_code}")
            except Exception as exc:
                print(f"collector-mock error for {device_code}: {exc}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
