import unittest
from unittest.mock import patch

from app.drivers.rs485_driver import RS485Collector


class RS485LoggingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.collector = RS485Collector.__new__(RS485Collector)
        self.collector.debug_hex = False
        self.collector._last_debug_at = None
        self.collector.slow_address_log_ms = 200
        self.collector._slow_addresses = set()

    def test_poll_hex_is_hidden_but_control_hex_remains(self) -> None:
        with patch("builtins.print") as print_mock:
            self.collector._debug("tx", b"\xC9\x13")
            self.collector._debug("tx-raw", b"\xC9\x60\x50\x00\x02")

        print_mock.assert_called_once()
        self.assertIn("tx-raw", print_mock.call_args.args[0])

    def test_slow_address_is_logged_once_until_recovery(self) -> None:
        with patch("app.drivers.rs485_driver.time.monotonic", side_effect=[1.3, 2.3, 2.1]), patch(
            "builtins.print"
        ) as print_mock:
            self.collector._log_address_elapsed(0x11, 1.0)
            self.collector._log_address_elapsed(0x11, 2.0)
            self.collector._log_address_elapsed(0x11, 2.0)

        self.assertEqual(print_mock.call_count, 2)
        self.assertIn("slow", print_mock.call_args_list[0].args[0])
        self.assertIn("recovered", print_mock.call_args_list[1].args[0])


if __name__ == "__main__":
    unittest.main()
