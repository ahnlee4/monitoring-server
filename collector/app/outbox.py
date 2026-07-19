from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from threading import RLock


@dataclass(frozen=True)
class OutboxItem:
    sequence: int
    payload: dict


class EdgeOutbox:
    def __init__(self, path: str, max_rows: int = 10_000) -> None:
        self.path = Path(path)
        self.max_rows = max(100, int(max_rows))
        self._lock = RLock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS edge_outbox (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

    def enqueue(self, payload: dict) -> int:
        with self._lock, self._connect() as connection:
            cursor = connection.execute(
                "INSERT INTO edge_outbox (payload_json) VALUES (?)",
                (json.dumps(payload, ensure_ascii=False, separators=(",", ":")),),
            )
            sequence = int(cursor.lastrowid)
            connection.execute(
                """
                DELETE FROM edge_outbox
                WHERE id IN (
                    SELECT id FROM edge_outbox
                    ORDER BY id DESC
                    LIMIT -1 OFFSET ?
                )
                """,
                (self.max_rows,),
            )
            return sequence

    def pending(self, limit: int = 100) -> list[OutboxItem]:
        with self._lock, self._connect() as connection:
            rows = connection.execute(
                "SELECT id, payload_json FROM edge_outbox ORDER BY id ASC LIMIT ?",
                (max(1, int(limit)),),
            ).fetchall()
        return [
            OutboxItem(sequence=int(row[0]), payload=json.loads(str(row[1])))
            for row in rows
        ]

    def acknowledge(self, sequence: int) -> None:
        with self._lock, self._connect() as connection:
            connection.execute("DELETE FROM edge_outbox WHERE id = ?", (int(sequence),))

    def count(self) -> int:
        with self._lock, self._connect() as connection:
            row = connection.execute("SELECT COUNT(*) FROM edge_outbox").fetchone()
        return int(row[0]) if row else 0

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path, timeout=10)
