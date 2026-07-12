import unittest

from app.yujin_map import POWER_TEMPLATE, build_yujin_map_schema


class YujinMapSchemaTest(unittest.TestCase):
    def test_yonsei_power_meters_are_defined_for_eight_units(self) -> None:
        schema = build_yujin_map_schema()
        entries = schema["expanded_examples"]["power"]

        self.assertEqual(len(entries), len(POWER_TEMPLATE) * 8)
        self.assertEqual(entries[0]["key"], "3100")
        self.assertEqual(entries[-1]["key"], "3822")


if __name__ == "__main__":
    unittest.main()
