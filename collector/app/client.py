import requests

from app.models import TelemetryFrame


class BackendClient:
    def __init__(self, api_url: str, token: str) -> None:
        self.api_url = api_url
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
