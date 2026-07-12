import unittest

from app.drivers.rs485_driver import RS485Collector


class PowerPollTest(unittest.TestCase):
    def test_power_poll_interval_can_be_enabled_and_disabled(self) -> None:
        collector = RS485Collector("/dev/null", 38400, power_poll_interval_cycles=2)
        collector._poll_cycle_index = 0
        self.assertTrue(collector._should_poll_power_maps())
        collector._poll_cycle_index = 1
        self.assertFalse(collector._should_poll_power_maps())

        disabled = RS485Collector("/dev/null", 38400, power_poll_interval_cycles=0)
        self.assertFalse(disabled._should_poll_power_maps())


if __name__ == "__main__":
    unittest.main()
