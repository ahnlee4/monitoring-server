import unittest
from unittest.mock import MagicMock

from app.drivers.rs485_driver import RS485Collector, Uart4ProtocolError, equipment_operation_status_address
from app.models import ControlCommand


class RS485WriteVerificationTest(unittest.TestCase):
    def collector(self, attempts: int = 3) -> RS485Collector:
        return RS485Collector(
            serial_port="/dev/null",
            baudrate=38400,
            write_request_delay=0,
            write_response_timeout=0.1,
            write_verify_attempts=attempts,
        )

    def test_regular_write_retries_until_readback_matches(self) -> None:
        collector = self.collector()
        collector._read_back_map_bytes = MagicMock(side_effect=[b"\x00\x00", b"\x00\x02"])
        port = MagicMock()

        collector._write_and_verify(port, b"request", 0x0050, b"\x00\x02")

        self.assertEqual(port.write.call_count, 2)
        self.assertEqual(collector._read_back_map_bytes.call_count, 2)

    def test_injection_run_write_is_verified_by_cp_status(self) -> None:
        collector = self.collector()
        collector._read_back_map_bytes = MagicMock(return_value=b"\x00\x05")
        port = MagicMock()

        collector._write_and_verify(port, b"request", 0x111A, b"\x00\x02")

        collector._read_back_map_bytes.assert_called_once_with(port, 0x1116, 2)

    def test_oilfree_stop_write_accepts_stop_delay_status(self) -> None:
        collector = self.collector()
        collector._read_back_map_bytes = MagicMock(return_value=b"\x00\x07")
        port = MagicMock()

        collector._write_and_verify(port, b"request", 0x1244, b"\x00\x01")

        collector._read_back_map_bytes.assert_called_once_with(port, 0x1230, 2)

    def test_equipment_operation_status_address(self) -> None:
        self.assertEqual(equipment_operation_status_address(0x111A), 0x1116)
        self.assertEqual(equipment_operation_status_address(0x1844), 0x1830)
        self.assertIsNone(equipment_operation_status_address(0x0050))

    def test_write_fails_after_configured_attempts(self) -> None:
        collector = self.collector(attempts=2)
        collector._read_back_map_bytes = MagicMock(side_effect=Uart4ProtocolError("timeout"))
        port = MagicMock()

        with self.assertRaisesRegex(Uart4ProtocolError, "not confirmed after 2 attempts"):
            collector._write_and_verify(port, b"request", 0x0050, b"\x00\x01")

        self.assertEqual(port.write.call_count, 2)

    def test_batch_continues_after_best_effort_equipment_verification_failure(self) -> None:
        collector = self.collector()
        collector._open_serial = MagicMock(return_value=MagicMock())
        collector._write_and_verify = MagicMock(
            side_effect=[Uart4ProtocolError("equipment state transition delayed"), None]
        )
        command = ControlCommand(
            id=1,
            command_type="map_write_batch",
            payload={
                "writes": [
                    {
                        "address": 0x121A,
                        "length": 2,
                        "value": 0x0001,
                        "delay_after_seconds": 0,
                        "continue_on_verification_failure": True,
                    },
                    {
                        "address": 0x111A,
                        "length": 2,
                        "value": 0x0001,
                        "delay_after_seconds": 0,
                        "continue_on_verification_failure": True,
                    },
                ]
            },
        )

        collector.execute_control_command(command)

        self.assertEqual(collector._write_and_verify.call_count, 2)

    def test_batch_still_stops_on_strict_verification_failure(self) -> None:
        collector = self.collector()
        collector._open_serial = MagicMock(return_value=MagicMock())
        collector._write_and_verify = MagicMock(side_effect=Uart4ProtocolError("readback mismatch"))
        command = ControlCommand(
            id=2,
            command_type="map_write_batch",
            payload={"writes": [{"address": 0x0050, "length": 2, "value": 0x0000}]},
        )

        with self.assertRaisesRegex(Uart4ProtocolError, "readback mismatch"):
            collector.execute_control_command(command)


if __name__ == "__main__":
    unittest.main()
