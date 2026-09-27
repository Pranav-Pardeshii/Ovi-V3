"""The simulation engine — backend twin of the console's tick loop.

tick(dt_ms) is a direct port of useStore.tick() (case lifecycle, Fabric block
commits, alert delivery progression, scheduled events) plus the actions the
console exposes (transmit/confirm freeze, close case, re-dispatch, anchor
report). The asyncio loop in run() drives it at 5 Hz with the selected speed
multiplier; tests call tick() directly with synthetic dt.
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
import time

from .config import SPAWN_INTERVAL_S, TICK_MS
from .domain.builders import build_seed
from .domain.selectors import case_state, mule_bal, short_target
from .fmt import en_in, inrc
from .rng import hex_n
from .state import State

log = logging.getLogger("ovi.engine")


class Engine:
    def __init__(self, state: State) -> None:
        self.state = state
        self._task: asyncio.Task | None = None
        self._spawn_task: asyncio.Task | None = None

    # ---- boot ------------------------------------------------------------
    def init(self) -> None:
        """Seed the world — port of useStore.init()."""
        s = self.state
        seed = build_seed(s.base)
        s.cases = seed["cases"]
        s.feed = seed["feed"]
        s.alerts = seed["alerts"]
        s.confirmed_seed = [
            {"tok": "TKN-88C1-2D04", "bank": "HDFC", "amt": 220000, "at": s.base - 9 * 60000, "cs": "…4391", "seed": "cf1"},
            {"tok": "TKN-31D7-9A02", "bank": "ICICI", "amt": 145000, "at": s.base - 31 * 60000, "cs": "…4382", "seed": "cf2"},
        ]
        c2 = s.find_case("NCRP-2026-0918-4468")
        if c2:
            tok0 = c2["mules"][0]["tok"]
            s.schedule(15 * 60, lambda: self.confirm_freeze(c2["id"], tok0))
        s.schedule(4 * 60, lambda: s.push_feed("system", "Federated round #212 complete · 24/24 banks · secure aggregation OK"))

    # ---- main loop -------------------------------------------------------
    async def run(self) -> None:
        """5 Hz heartbeat; sim_ms advances dt · speed, as in the console."""
        self.init()
        last = time.perf_counter()
        while True:
            await asyncio.sleep(TICK_MS / 1000)
            now = time.perf_counter()
            dt = (now - last) * 1000
            last = now
            try:
                self.tick(dt)
            except Exception:
                # A dead heartbeat silently freezes the whole sim clock — log
                # and keep ticking instead of taking the loop down.
                log.exception("tick failed (dt=%s ms)", dt)

    async def spawn_loop(self) -> None:
        """Demo complaint arrival every SPAWN_INTERVAL_S of real time."""
        while True:
            await asyncio.sleep(SPAWN_INTERVAL_S)
            from .domain.spawn import spawn_case

            try:
                spawn_case(self.state)
            except Exception:
                log.exception("spawn_case failed")

    def start(self) -> None:
        self._task = asyncio.get_running_loop().create_task(self.run())
        self._spawn_task = asyncio.get_running_loop().create_task(self.spawn_loop())

    async def stop(self) -> None:
        for t in (self._task, self._spawn_task):
            if t:
                t.cancel()
                try:
                    await t
                except asyncio.CancelledError:
                    pass

    # ---- tick ------------------------------------------------------------
    def tick(self, dt_ms: float) -> None:
        s = self.state
        s.sim_ms += dt_ms * s.speed
        n = s.now()

        # due scheduled events
        while s.sched and s.sched[0]["at"] <= n:
            s.sched.pop(0)["fn"]()

        # Fabric block commits
        if s.sim_ms >= s.blk_at:
            s.fabric += 1
            s.blk_at += 120000
            if random.random() < 0.15:
                s.push_feed("ledger", "Block <b>#" + en_in(s.fabric) + "</b> committed · audit channel")

        # case lifecycle: pre → win → elapsed → closed
        for c in s.cases:
            st = case_state(c, n)
            if st == c["_st"]:
                continue
            prev = c["_st"]
            c["_st"] = st
            if prev == "pre" and st == "win":
                s.push_feed("window", "Window <b>OPEN</b> · " + c["short"] + " · " + short_target(c))
            elif prev == "win" and st == "elapsed":
                s.push_feed("window", "Window elapsed · " + c["short"])
                cid = c["id"]
                s.schedule(25 * 60, lambda cid=cid: self.close_case(cid))

        # alert delivery progression
        for a in s.alerts:
            if a["status"] == "sent" and n - a["t"] > 40000:
                a["status"] = "delivered"
            if a["status"] == "delivered" and n - a["t"] > 140000 and not a.get("_acked"):
                a["_acked"] = 1
                a["status"] = "acked"
                a["ack"] = int(54 + random.random() * 80)
                s.push_feed("alert", "LEA ack " + str(a["ack"]) + "s · " + a["to"])

        s.tick_id += 1

    # ---- actions ---------------------------------------------------------
    def transmit_freeze(self, tok: str) -> dict | None:
        """Queue a CFCFRMS freeze request — port of store.transmitFreeze()."""
        s = self.state
        hit = s.find_mule(tok)
        if not hit:
            return None
        c, m = hit
        m["status"] = "sent"
        m["sentAt"] = s.now()
        s.push_feed("freeze", "Request transmitted · " + m["tok"] + " · " + m["bank"] + " · SLA 15:00")
        s.schedule((7 + random.random() * 5) * 60, lambda: self.confirm_freeze(c["id"], tok))
        return {"ok": True, "caseId": c["id"], "tok": tok}

    def confirm_freeze(self, case_id: str, tok: str) -> None:
        """Bank confirms the freeze — port of store.confirmFreeze()."""
        s = self.state
        c = s.find_case(case_id)
        if not c:
            return
        m = next((x for x in c["mules"] if x["tok"] == tok), None)
        if not m or m["frozen"]:
            return
        # Capture the live balance BEFORE marking frozen — mule_bal() short-
        # circuits to the stale frozenAmt once the flag is set (the console's
        # store.confirmFreeze has this ordering bug and freezes ₹0).
        bal = mule_bal(c, m, s.now())
        m["frozen"] = True
        m["frozenAmt"] = bal
        m["status"] = "confirmed"
        if not m["sentAt"]:
            m["sentAt"] = s.now()
        s.frozen_ytd += m["frozenAmt"]
        s.push_feed("freeze", "CFCFRMS confirmed · <b>" + m["tok"] + "</b> · <b>" + inrc(m["frozenAmt"]) + " secured</b> · " + c["id"])

    def close_case(self, case_id: str) -> None:
        """Close an elapsed case — port of store.closeCase()."""
        s = self.state
        c = s.find_case(case_id)
        if not c:
            return
        frozen_amt = sum(m["frozenAmt"] for m in c["mules"] if m["frozen"])
        rec = math.floor(frozen_amt * 0.92 + 0.5)  # Math.round
        s.push_feed("system", "Case closed · " + c["short"] + " · recovered <b>" + inrc(rec) + "</b> of " + inrc(c["amount"]))
        s.cases = [x for x in s.cases if x["id"] != case_id]
        s.recovered_ytd += rec
        s.closed_count += 1

    def re_dispatch(self, index: int) -> dict | None:
        """Re-dispatch an alert — port of store.reDispatch()."""
        s = self.state
        try:
            a = s.alerts[index]
        except IndexError:
            return None
        a["status"] = "acked"
        a["ack"] = 18
        s.push_feed("alert", "Re-dispatch OK · " + a["to"])
        return {"ok": True, "alert": a}

    def anchor_report(self, case_id: str) -> dict | None:
        """Anchor an investigation report — port of store.anchorReport()."""
        s = self.state
        c = s.find_case(case_id)
        if not c:
            return None
        rh = "0x" + hex_n(c["id"] + "|rep|" + str(s.now()), 20)
        rec = {"hash": rh, "block": s.fabric, "at": s.now()}
        s.reports[case_id] = rec
        s.push_feed(
            "ledger",
            "Investigation report anchored · " + c["short"] + " · block <b>#" + en_in(s.fabric) + "</b> · evidence channel",
        )
        return rec
