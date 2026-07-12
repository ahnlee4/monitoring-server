import unittest
from unittest.mock import MagicMock

from app.drivers.rs485_driver import RS485Collector, Uart4ProtocolError


class RS485WriteVerificationTest(unittest.TestCase):
    def collector(self, attempts: int = 3) -> RS485Collector:
        return RS485Collector(
            serial_port="/dev/null",
            baudrate=38400,
            write_request_delay=0,
            write_response_timeout=0.1,
            write_verify_attempts=attempts,
        )

    def test_write_retries_until_readback_matches(self) -> None:
        collector = self.collector()
        collector._read_back_map_bytes = MagicMock(side_effect=[b"\x00\x00", b"\x00\x02"])
        port = MagicMock()

        collector._write_and_verify(port, b"request", 0x111A, b"\x00\x02")

        self.assertEqual(port.write.call_count, 2)
        self.assertEqual(collector._read_back_map_bytes.call_count, 2)

    def test_write_fails_after_configured_attempts(self) -> None:
        collector = self.collector(attempts=2)
        collector._read_back_map_bytes = MagicMock(side_effect=Uart4ProtocolError("timeout"))
        port = MagicMock()

        with self.assertRaisesRegex(Uart4ProtocolError, "not confirmed after 2 attempts"):
            collector._write_and_verify(port, b"request", 0x0050, b"\x00\x01")

        self.assertEqual(port.write.call_count, 2)


if __name__ == "__main__":
    unittest.main()
