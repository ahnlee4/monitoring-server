import unittest

from app.main import collector_loop_delay
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


if __name__ == "__main__":
    unittest.main()
