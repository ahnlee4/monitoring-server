from __future__ import annotations

from datetime import datetime
from threading import RLock


LiveValue = tuple[str, datetime, str]
Heartbeat = tuple[datetime, str]


class EdgeRuntimeStore:
    def __init__(self) -> None:
        self._lock = RLock()
        self._live_maps: dict[int, dict[str, LiveValue]] = {}
        self._heartbeats: dict[int, dict[str, Heartbeat]] = {}

    def load_value(
        self,
        edge_node_id: int,
        key: str,
        value: str,
        updated_at: datetime,
        source: str,
    ) -> None:
        normalized_key = key.upper()
        with self._lock:
            self._live_maps.setdefault(edge_node_id, {})[normalized_key] = (
                str(value),
                updated_at,
                source,
            )

    def update(
        self,
        edge_node_id: int,
        values: list[tuple[str, str]],
        heartbeat_keys: list[str],
        recorded_at: datetime,
        source: str,
    ) -> tuple[dict[str, LiveValue], dict[str, Heartbeat]]:
        with self._lock:
            live_map = self._live_maps.setdefault(edge_node_id, {})
            heartbeats = self._heartbeats.setdefault(edge_node_id, {})
            keys = list(dict.fromkeys([key for key, _ in values] + heartbeat_keys))
            for key in keys:
                current = heartbeats.get(key)
                if current is None or recorded_at >= current[0]:
                    heartbeats[key] = (recorded_at, source)
            for key, value in values:
                live_map[key] = (value, recorded_at, source)
            for key in heartbeat_keys:
                if key not in live_map:
                    continue
                value, _, _ = live_map[key]
                live_map[key] = (value, recorded_at, source)
            return dict(live_map), dict(heartbeats)

    def snapshots(
        self,
        edge_node_id: int,
    ) -> tuple[dict[str, LiveValue], dict[str, Heartbeat]]:
        with self._lock:
            return (
                dict(self._live_maps.get(edge_node_id, {})),
                dict(self._heartbeats.get(edge_node_id, {})),
            )

    def value(self, edge_node_id: int, key: str) -> LiveValue | None:
        with self._lock:
            return self._live_maps.get(edge_node_id, {}).get(key.upper())

    def latest_seen_at(self, keys: list[str] | None = None) -> datetime | None:
        normalized_keys = {key.upper() for key in keys or []}
        timestamps: list[datetime] = []
        with self._lock:
            for edge_node_id, live_map in self._live_maps.items():
                heartbeats = self._heartbeats.get(edge_node_id, {})
                if normalized_keys:
                    for key in normalized_keys:
                        live = live_map.get(key)
                        heartbeat = heartbeats.get(key)
                        if live:
                            timestamps.append(live[1])
                        if heartbeat:
                            timestamps.append(heartbeat[0])
                else:
                    timestamps.extend(value[1] for value in live_map.values())
                    timestamps.extend(value[0] for value in heartbeats.values())
        return max(timestamps) if timestamps else None
