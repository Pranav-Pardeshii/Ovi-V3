"""WebSocket hub — live feed + state deltas for the console.

The console's sim engine note (src/sim/engine.ts) says the local tick loop is
replaced by FastAPI pushes in production: clients subscribe at /ws and receive
feed events as they happen plus a 1 Hz state snapshot (case states + KPIs).
"""

from __future__ import annotations

import asyncio
import contextlib
import json

from fastapi import WebSocket


class Hub:
    def __init__(self) -> None:
        self.clients: set[WebSocket] = set()
        self._tasks: set[asyncio.Task] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.clients.discard(ws)

    def broadcast(self, payload: dict) -> None:
        """Schedule a broadcast without blocking the caller (engine tick, route)."""
        if not self.clients:
            return
        msg = json.dumps(payload, ensure_ascii=False)

        async def _send() -> None:
            dead = []
            for ws in list(self.clients):
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws)

        t = asyncio.get_running_loop().create_task(_send())
        self._tasks.add(t)
        t.add_done_callback(self._tasks.discard)

    async def aclose_all(self) -> None:
        for ws in list(self.clients):
            with contextlib.suppress(Exception):
                await ws.close()
        self.clients.clear()


def snapshot(state) -> dict:
    """1 Hz state frame: case states + headline KPIs."""
    from ..domain.selectors import total_at_risk, windows_open

    return {
        "type": "state",
        "t": state.now(),
        "speed": state.speed,
        "cases": [{"id": c["id"], "_st": c["_st"], "tier": c["tier"]} for c in state.cases],
        "kpis": {
            "frozenYTD": state.frozen_ytd,
            "recoveredYTD": state.recovered_ytd,
            "closedCount": state.closed_count,
            "fabric": state.fabric,
            "atRisk": total_at_risk(state),
            "windowsOpen": windows_open(state),
        },
    }


async def snapshot_loop(state, hub: Hub) -> None:
    while True:
        await asyncio.sleep(1)
        hub.broadcast(snapshot(state))
