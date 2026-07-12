import unittest
from datetime import datetime
from zoneinfo import ZoneInfo

from app.admin_settings import (
    due_schedule_events,
    sanitize_gstech_settings,
    sanitize_product_settings,
    sanitize_schedule_settings,
)


class AdminSettingsTest(unittest.TestCase):
    def test_schedule_normalizes_seven_days_and_three_slots(self) -> None:
        settings = sanitize_schedule_settings(
            {
                "days": [
                    {
                        "run_slots": [{"enabled": True, "time": "08:30", "run_units": 99}],
                        "stop_slots": [{"enabled": True, "time": "25:00"}],
                    }
                ],
                "holidays": ["2026-07-12", "07-12", "invalid"],
            }
        )

        self.assertEqual(len(settings["days"]), 7)
        self.assertEqual(len(settings["days"][0]["run_slots"]), 3)
        self.assertEqual(settings["days"][0]["run_slots"][0]["run_units"], 12)
        self.assertEqual(settings["days"][0]["stop_slots"][0]["time"], "00:00")
        self.assertEqual(settings["holidays"], ["07-12"])

    def test_due_schedule_event_uses_sunday_as_day_zero(self) -> None:
        settings = sanitize_schedule_settings(None)
        settings["days"][0]["run_slots"][1] = {"enabled": True, "time": "08:30", "run_units": 4}
        now = datetime(2026, 7, 12, 8, 30, tzinfo=ZoneInfo("Asia/Seoul"))

        events = due_schedule_events(settings, now)

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["action"], "run")
        self.assertEqual(events[0]["run_units"], 4)

    def test_holiday_suppresses_schedule(self) -> None:
        settings = sanitize_schedule_settings(None)
        settings["days"][0]["stop_slots"][0] = {"enabled": True, "time": "18:00", "run_units": 1}
        settings["holidays"] = ["07-12"]
        now = datetime(2026, 7, 12, 18, 0, tzinfo=ZoneInfo("Asia/Seoul"))

        self.assertEqual(due_schedule_events(settings, now), [])

    def test_product_ranges_and_password_lengths_are_preserved(self) -> None:
        settings = sanitize_product_settings(
            {
                "admin_password": "123456",
                "user_password": "9999",
                "save_cycle_seconds": 50,
                "backlight_percent": -1,
            }
        )

        self.assertEqual(settings["admin_password"], "123456")
        self.assertEqual(settings["user_password"], "9999")
        self.assertEqual(settings["save_cycle_seconds"], 30)
        self.assertEqual(settings["backlight_percent"], 0)

    def test_dio_selections_cannot_be_equal(self) -> None:
        settings = sanitize_gstech_settings({"dio_bit0": 3, "dio_bit4": 3})

        self.assertNotEqual(settings["dio_bit0"], settings["dio_bit4"])


if __name__ == "__main__":
    unittest.main()
