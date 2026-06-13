import requests

from app.models import CollectorBatch, ControlCommand, TelemetryFrame


class BackendClient:
    def __init__(
        self,
        api_url: str,
        token: str,
        yujin_api_url: str | None = None,
        control_api_url: str | None = None,
    ) -> None:
        self.api_url = api_url
        self.yujin_api_url = yujin_api_url
        self.control_api_url = control_api_url
        self.token = token
        self.session = requests.Session()

    def publish(self, frame: TelemetryFrame) -> None:
        response = self.session.post(
            self.api_url,
            json=frame.to_payload(),
            headers={"X-Collector-Token": self.token},
            timeout=5,
        )
        response.raise_for_status()

    def fetch_control_commands(self, limit: int = 5) -> list[ControlCommand]:
        if not self.control_api_url:
            return []
        response = self.session.get(
            f"{self.control_api_url}/commands/next",
            params={"limit": limit},
            headers={"X-Collector-Token": self.token},
            timeout=5,
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
            timeout=5,
        )
        response.raise_for_status()

    def publish_map_batch(self, batch: CollectorBatch) -> None:
        if not self.yujin_api_url or not batch.map_values:
            return
        response = self.session.post(
            self.yujin_api_url,
            json=batch.map_payload(),
            headers={"X-Collector-Token": self.token},
            timeout=5,
        )
        response.raise_for_status()
