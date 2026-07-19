import unittest
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.database import Base
from app.equipment_logs import (
    build_equipment_log_snapshots,
    persist_equipment_log_snapshots,
)
from app.models import EquipmentLogSnapshot


NOW = datetime(2026, 7, 19, 1, 2, 3, tzinfo=timezone.utc)


def live(values: dict[str, int]) -> dict[str, tuple[str, datetime, str]]:
    return {
        key: (str(value), NOW, "test")
        for key, value in values.items()
    }


class EquipmentLogSnapshotTest(unittest.TestCase):
    def test_injection_snapshot_matches_original_log_columns(self) -> None:
        values = live(
            {
                "0006": 0,
                "1100": 812,
                "1102": 735,
                "1104": 3600,
                "110A": 3,
                "110C": 4,
                "1116": 2,
                "1174": 17,
            }
        )

        rows = build_equipment_log_snapshots(
            values,
            {"1100": (NOW, "test")},
            NOW,
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["equipment_no"], 1)
        self.assertEqual(rows[0]["pressure"], 8.1)
        self.assertEqual(rows[0]["temperature"], 73.5)
        self.assertEqual(rows[0]["operation_status"], 2)
        self.assertEqual(rows[0]["rpm"], 3600)
        self.assertEqual(rows[0]["alarm_word"], 3)
        self.assertEqual(rows[0]["error_word"], 4)

    def test_oilfree_snapshot_combines_fault_words(self) -> None:
        values = live(
            {
                "0006": 1,
                "2100": 755,
                "210C": 81,
                "2128": 5,
                "212A": 2,
                "212C": 1,
                "2130": 3,
                "2138": 2980,
                "217E": 3,
            }
        )

        rows = build_equipment_log_snapshots(
            values,
            {"2100": (NOW, "test")},
            NOW,
        )

        self.assertEqual(rows[0]["pressure"], 7.6)
        self.assertEqual(rows[0]["temperature"], 81)
        self.assertEqual(rows[0]["operation_status"], 3)
        self.assertEqual(rows[0]["rpm"], 2980)
        self.assertEqual(rows[0]["alarm_word"], 5)
        self.assertEqual(rows[0]["error_word"], 0x00010002)

    def test_stale_equipment_is_not_recorded(self) -> None:
        values = live({"0006": 0, "1100": 812})
        rows = build_equipment_log_snapshots(values, {}, NOW)
        self.assertEqual(rows, [])

    def test_oilfree_signed_sensor_values_are_preserved(self) -> None:
        values = live({"0006": 1, "2100": 65436, "210C": 65531})
        rows = build_equipment_log_snapshots(
            values,
            {"2100": (NOW, "test")},
            NOW,
        )
        self.assertEqual(rows[0]["pressure"], -1.0)
        self.assertEqual(rows[0]["temperature"], -5)

    def test_persistence_keeps_only_latest_rows_per_equipment(self) -> None:
        engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            for index in range(4):
                persist_equipment_log_snapshots(
                    db,
                    [
                        {
                            "equipment_no": 1,
                            "pressure": float(index),
                            "temperature": None,
                            "operation_status": None,
                            "rpm": None,
                            "alarm_word": None,
                            "error_word": None,
                            "recorded_at": NOW + timedelta(seconds=index),
                        }
                    ],
                    limit=3,
                )

            rows = db.scalars(
                select(EquipmentLogSnapshot)
                .where(EquipmentLogSnapshot.equipment_no == 1)
                .order_by(EquipmentLogSnapshot.recorded_at.desc())
            ).all()

        self.assertEqual([row.pressure for row in rows], [3.0, 2.0, 1.0])


if __name__ == "__main__":
    unittest.main()
