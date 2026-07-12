import unittest

from app.main import MODE_ALIGN_COLUMNS, MODE_ALIGN_ROWS, sanitize_mode_settings_payload


class ModeSettingsTest(unittest.TestCase):
    def test_legacy_three_unit_rows_are_migrated_to_twelve_units(self) -> None:
        settings = sanitize_mode_settings_payload(
            {
                "rows": [{"no": "1", "values": ["3", "2", "1", "2"]}],
                "selected_mode_index": 0,
                "use_mode_count": 99,
            }
        )

        self.assertEqual(len(settings["rows"]), MODE_ALIGN_ROWS)
        self.assertEqual(len(settings["rows"][0]["values"]), MODE_ALIGN_COLUMNS)
        self.assertEqual(settings["rows"][0]["values"][:4], ["3", "2", "1", "4"])
        self.assertEqual(settings["rows"][0]["values"][-1], "2")
        self.assertEqual(settings["use_mode_count"], MODE_ALIGN_ROWS)

    def test_equipment_masks_are_limited_to_sixteen_bits(self) -> None:
        settings = sanitize_mode_settings_payload({"hidden_mask": 999999, "exclude_mask": -10})

        self.assertEqual(settings["hidden_mask"], 0xFFFF)
        self.assertEqual(settings["exclude_mask"], 0)


if __name__ == "__main__":
    unittest.main()
