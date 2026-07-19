import unittest

from app.client import BackendClient
from app.main import collector_loop_delay, default_control_api_url
from app.models import CollectorBatch, MapValueUpdate


class CollectorLoopDelayTest(unittest.TestCase):
    def test_empty_batch_uses_idle_delay(self) -> None:
        batch = CollectorBatch(source="test", recorded_at="")
        self.assertEqual(collector_loop_delay(0, 0.01, batch), 0.01)

    def test_data_batch_continues_without_idle_delay(self) -> None:
        batch = CollectorBatch(
            source="test",
            recorded_at="",
            map_values=[MapValueUpdate(key="0000", value="1")],
        )
        self.assertEqual(collector_loop_delay(0, 0.01, batch), 0.0)

    def test_configured_interval_has_priority(self) -> None:
        batch = CollectorBatch(source="test", recorded_at="")
        self.assertEqual(collector_loop_delay(2, 0.01, batch), 2)

    def test_edge_urls_and_headers_use_edge_credentials(self) -> None:
        ingest_url = "http://central:8080/api/edge/ingest-map"
        client = BackendClient(
            api_url="http://central:8080/api/ingest/telemetry",
            token="edge-token",
            control_api_url=default_control_api_url(ingest_url),
            edge_id="plant-a-board-01",
        )

        self.assertEqual(default_control_api_url(ingest_url), "http://central:8080/api/edge")
        self.assertEqual(
            client.auth_headers(),
            {"X-Edge-Id": "plant-a-board-01", "X-Edge-Token": "edge-token"},
        )
        self.assertEqual(client.app_settings_api_url(), "http://central:8080/api/edge/settings")


if __name__ == "__main__":
    unittest.main()
