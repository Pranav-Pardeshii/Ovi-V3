"""Central simulation state — the backend twin of src/store/useStore.ts.

Domain objects are plain dicts carrying the exact field names the console's
TypeScript interfaces expect (tok, depMin, p10/p50/p90, narr, _st, pt, …) so
GET /api/cases payloads drop straight into the typed frontend models.

State lives in-process. Persistence (PostgreSQL) and the cross-institution
graph (Neo4j) are later milestones; state.py is the single swap point.
"""

from __future__ import annotations

import contextlib
import itertools
from typing import Any, Callable

from .config import BASE_MS, FEED_CAP, SPEED_DEFAULT


class State:
    def __init__(self, base_ms: int = BASE_MS) -> None:
        self.base = base_ms
        self.sim_ms = 0.0
        self.speed = SPEED_DEFAULT
        self.tick_id = 0

        self.cases: list[dict] = []
        self.feed: list[dict] = []
        self.alerts: list[dict] = []
        self.sched: list[dict] = []  # [{at, fn}] sorted by at (sim ms)
        self.confirmed_seed: list[dict] = []
        self.reports: dict[str, dict] = {}

        self.next_id = 4472
        self.spawned = 0

        # KPIs (YTD counters seeded to match the console's opening values).
        self.frozen_ytd = 1_530_000
        self.recovered_ytd = 42_300_000
        self.closed_count = 14
        self.fabric = 4_721_903
        self.blk_at = 120_000.0
        self.comp24 = 286
        self.dispatched24 = 128
        self.trend7 = [212, 241, 228, 263, 255, 281, 286]

        self._seq = itertools.count(1)

    # ---- clock ----------------------------------------------------------
    def now(self) -> int:
        """Sim-wallclock in epoch ms."""
        return int(self.base + self.sim_ms)

    # ---- feed / schedule ------------------------------------------------
    def push_feed(self, type_: str, html: str) -> dict:
        e = {"t": self.now(), "type": type_, "html": html}
        self.feed.insert(0, e)
        del self.feed[FEED_CAP:]
        if self.on_feed is not None:
            # Hook runs on the event loop in production (engine task, async
            # routes). Ticks driven from a worker thread (tests) have no loop —
            # drop the push rather than break the tick.
            with contextlib.suppress(RuntimeError):
                self.on_feed(e)
        return e

    def schedule(self, delay_sec: float, fn: Callable[[], None]) -> None:
        """Run fn after delay_sec of *sim* time (scaled by speed)."""
        self.sched.append({"at": self.now() + delay_sec * 1000, "fn": fn})
        self.sched.sort(key=lambda s: s["at"])

    # ---- lookups --------------------------------------------------------
    def find_case(self, case_id: str) -> dict | None:
        return next((c for c in self.cases if c["id"] == case_id), None)

    def find_mule(self, tok: str) -> tuple[dict, dict] | None:
        for c in self.cases:
            for m in c["mules"]:
                if m["tok"] == tok:
                    return c, m
        return None

    def next_toast_id(self) -> int:
        return next(self._seq)

    # ---- WS fan-out hooks (set by api.ws) --------------------------------
    on_feed: Callable[[dict], None] | None = None
