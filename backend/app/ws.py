from collections.abc import Iterable

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[tuple[WebSocket, str | None]] = []

    async def connect(self, websocket: WebSocket, channel: str | None = None) -> None:
        await websocket.accept()
        self._connections.append((websocket, channel))

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections = [
            (connection, channel)
            for connection, channel in self._connections
            if connection is not websocket
        ]

    async def broadcast_json(self, payload: dict, channel: str | None = None) -> None:
        stale: list[WebSocket] = []
        for connection, connection_channel in self._iter_connections():
            if channel is not None and connection_channel != channel:
                continue
            try:
                await connection.send_json(payload)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)

    def _iter_connections(self) -> Iterable[tuple[WebSocket, str | None]]:
        return tuple(self._connections)


manager = ConnectionManager()
