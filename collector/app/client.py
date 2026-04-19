import requests

from app.models import CollectorBatch, TelemetryFrame


class BackendClient:
    def __init__(self, api_url: str, token: str, yujin_api_url: str | None = None) -> None:
        self.api_url = api_url
        self.yujin_api_url = yujin_api_url
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
