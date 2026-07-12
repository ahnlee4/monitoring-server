import unittest

from app.control_protocol import build_group_operation_payload, build_group_operation_value


class GroupOperationProtocolTest(unittest.TestCase):
    def test_run_uses_map_write_and_preserves_remote_mode(self) -> None:
        self.assertEqual(
            build_group_operation_payload(0x0100, "run"),
            [0xC9, 0x20, 0x00, 0x50, 0x00, 0x02, 0x01, 0x01],
        )

    def test_stop_uses_map_write_and_preserves_remote_mode(self) -> None:
        self.assertEqual(
            build_group_operation_payload(0x0101, "stop"),
            [0xC9, 0x20, 0x00, 0x50, 0x00, 0x02, 0x01, 0x00],
        )

    def test_local_mode_high_byte_is_preserved(self) -> None:
        self.assertEqual(build_group_operation_value(0x0000, "run"), 0x0001)
        self.assertEqual(build_group_operation_value(0x0001, "stop"), 0x0000)

    def test_unknown_action_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            build_group_operation_payload(0, "pause")


if __name__ == "__main__":
    unittest.main()
