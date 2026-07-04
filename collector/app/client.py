import requests

from app.models import CollectorBatch, ControlCommand, TelemetryFrame


class BackendClient:
    def __init__(
        self,
        api_url: str,
        token: str,
        yujin_api_url: str | None = None,
        control_api_url: str | None = None,
        request_timeout: float = 15.0,
    ) -> None:
        self.api_url = api_url
        self.yujin_api_url = yujin_api_url
        self.control_api_url = control_api_url
        self.token = token
        self.request_timeout = request_timeout
        self.session = requests.Session()

    def app_settings_api_url(self) -> str | None:
        if not self.control_api_url:
            return None
        suffix = "/api/control"
        if self.control_api_url.endswith(suffix):
            return f"{self.control_api_url[: -len(suffix)]}/api/app-settings"
        return None

    def publish(self, frame: TelemetryFrame) -> None:
        response = self.session.post(
            self.api_url,
            json=frame.to_payload(),
            headers={"X-Collector-Token": self.token},
            timeout=self.request_timeout,
        )
        response.raise_for_status()

    def fetch_control_commands(self, limit: int = 5) -> list[ControlCommand]:
        if not self.control_api_url:
            return []
        response = self.session.get(
            f"{self.control_api_url}/commands/next",
            params={"limit": limit},
            headers={"X-Collector-Token": self.token},
            timeout=self.request_timeout,
        )
        response.raise_for_status()
        return [
            ControlCommand(
                id=int(item["id"]),
                command_type=str(item["command_type"]),
                payload=dict(item["payload"]),
            )
            for item in response.json()
        ]

    def ack_control_command(self, command_id: int, status: str, error: str | None = None) -> None:
        if not self.control_api_url:
            return
        response = self.session.post(
            f"{self.control_api_url}/commands/{command_id}/ack",
            json={"status": status, "error": error},
            headers={"X-Collector-Token": self.token},
            timeout=self.request_timeout,
        )
        response.raise_for_status()

    def fetch_collector_settings(self) -> dict:
        app_settings_url = self.app_settings_api_url()
        if not app_settings_url:
            return {}
        response = self.session.get(
            f"{app_settings_url}/collector-settings",
            headers={"X-Collector-Token": self.token},
            timeout=self.request_timeout,
        )
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else {}

    def publish_map_batch(self, batch: CollectorBatch) -> None:
        if not self.yujin_api_url or (not batch.map_values and not batch.heartbeat_keys):
            return
        response = self.session.post(
            self.yujin_api_url,
            json=batch.map_payload(),
            headers={"X-Collector-Token": self.token},
            timeout=self.request_timeout,
        )
        response.raise_for_status()
