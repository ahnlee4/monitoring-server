import unittest

from app.control_protocol import (
    build_group_operation_payload,
    build_group_operation_value,
    build_group_operation_writes,
)


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

    def test_group_run_sets_flag_then_starts_units_in_sequence(self) -> None:
        writes = build_group_operation_writes(
            current_value=0x0100,
            action="run",
            sequence=[3, 1, 2],
            available_units=[1, 2, 3],
            run_units=2,
            oilfree_selector=0b0100,
            repair_mask=0,
            running_units=[],
            run_delay_seconds=4,
            stop_delay_seconds=2,
        )

        self.assertEqual([write["address"] for write in writes], [0x0050, 0x1344, 0x111A])
        self.assertEqual([write["value"] for write in writes], [0x0101, 0x0002, 0x0002])
        self.assertEqual(writes[1]["delay_after_seconds"], 4)

    def test_group_stop_stops_all_target_units_in_reverse_then_clears_flag(self) -> None:
        writes = build_group_operation_writes(
            current_value=0x0101,
            action="stop",
            sequence=[1, 2, 3],
            available_units=[1, 2, 3],
            run_units=2,
            oilfree_selector=0,
            repair_mask=0,
            running_units=[1, 3],
            run_delay_seconds=4,
            stop_delay_seconds=2,
        )

        self.assertEqual([write["address"] for write in writes], [0x121A, 0x111A, 0x0050, 0x131A])
        self.assertEqual([write["value"] for write in writes], [0x0001, 0x0001, 0x0100, 0x0001])

    def test_group_stop_does_not_depend_on_target_cp_status(self) -> None:
        writes = build_group_operation_writes(
            current_value=0x0001,
            action="stop",
            sequence=[1, 2, 3],
            available_units=[1, 2, 3],
            run_units=3,
            oilfree_selector=0,
            repair_mask=0,
            running_units=[3],
            run_delay_seconds=10,
            stop_delay_seconds=4,
        )

        self.assertEqual([write["address"] for write in writes], [0x131A, 0x121A, 0x111A, 0x0050])

    def test_group_stop_can_leave_non_target_running_units_untouched(self) -> None:
        writes = build_group_operation_writes(
            current_value=0x0001,
            action="stop",
            sequence=[1, 2, 3],
            available_units=[1, 2, 3],
            run_units=2,
            oilfree_selector=0,
            repair_mask=0,
            running_units=[1, 2, 3],
            run_delay_seconds=10,
            stop_delay_seconds=4,
            stop_additional_units=False,
        )

        self.assertEqual([write["address"] for write in writes], [0x121A, 0x111A, 0x0050])

    def test_group_run_skips_repair_units(self) -> None:
        writes = build_group_operation_writes(
            current_value=0,
            action="run",
            sequence=[1, 2, 3],
            available_units=[1, 2, 3],
            run_units=2,
            oilfree_selector=0,
            repair_mask=0b0010,
            running_units=[],
            run_delay_seconds=0,
            stop_delay_seconds=0,
        )

        self.assertEqual([write["address"] for write in writes], [0x0050, 0x111A, 0x131A])


if __name__ == "__main__":
    unittest.main()
