import unittest

from app.control_protocol import build_group_operation_payload


class GroupOperationProtocolTest(unittest.TestCase):
    def test_run_uses_original_controller_value(self) -> None:
        self.assertEqual(build_group_operation_payload("run"), [0xC9, 0x60, 0x50, 0x00, 0x01])

    def test_stop_stops_group_and_compressors(self) -> None:
        self.assertEqual(build_group_operation_payload("stop"), [0xC9, 0x60, 0x50, 0x00, 0x02])

    def test_unknown_action_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            build_group_operation_payload("pause")


if __name__ == "__main__":
    unittest.main()
