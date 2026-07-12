import unittest

from app.schemas import MapWriteIn


class MapWriteSchemaTest(unittest.TestCase):
    def test_best_effort_verification_flag_is_preserved(self) -> None:
        write = MapWriteIn(
            address=0x111A,
            value=1,
            delay_after_seconds=1,
            continue_on_verification_failure=True,
        )

        self.assertTrue(write.continue_on_verification_failure)
        self.assertEqual(write.delay_after_seconds, 1)


if __name__ == "__main__":
    unittest.main()
