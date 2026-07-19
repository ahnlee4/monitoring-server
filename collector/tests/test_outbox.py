import tempfile
import unittest
from pathlib import Path

from app.outbox import EdgeOutbox


class EdgeOutboxTest(unittest.TestCase):
    def test_payload_survives_restart_until_acknowledged(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = str(Path(temp_dir) / "outbox.db")
            first = EdgeOutbox(path)
            sequence = first.enqueue({"source": "test", "values": [{"key": "0000", "value": 7}]})

            reopened = EdgeOutbox(path)
            rows = reopened.pending()

            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0].sequence, sequence)
            self.assertEqual(rows[0].payload["values"][0]["value"], 7)

            reopened.acknowledge(sequence)
            self.assertEqual(reopened.count(), 0)

    def test_sequences_are_monotonic_after_acknowledge(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            outbox = EdgeOutbox(str(Path(temp_dir) / "outbox.db"))
            first = outbox.enqueue({"values": []})
            outbox.acknowledge(first)
            second = outbox.enqueue({"values": []})

            self.assertGreater(second, first)


if __name__ == "__main__":
    unittest.main()
