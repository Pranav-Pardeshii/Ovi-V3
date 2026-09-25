"""Engine behaviour — a direct port of the console's useStore.tick() and actions."""

import random

from app.domain.spawn import file_complaint
from app.domain.selectors import case_state


def test_tick_advances_sim_clock(engine, state):
    state.speed = 20
    engine.tick(200)
    assert state.sim_ms == 200 * 20
    assert state.tick_id == 1
    engine.tick(200)
    assert state.sim_ms == 8000
    assert state.tick_id == 2


def test_fabric_blocks_commit_every_120s(engine, state):
    start = state.fabric
    for _ in range(600):  # 40 sim-minutes → 20 blocks
        engine.tick(200)
    assert state.fabric == start + 20


def test_case_lifecycle_transitions(engine, state):
    c = file_complaint(state, {"scam": "Loan App", "amount": 25000, "city": "Pune"})
    assert c["_st"] == "watch"  # seeded value, corrected on first tick
    engine.tick(200)
    assert c["_st"] == "pre"
    # tick past p10 (8–32 s of sim time) → window opens with a feed event
    for _ in range(400):
        engine.tick(200)
        if c["_st"] == "win":
            break
    assert c["_st"] == "win"
    assert case_state(c, state.now()) == "win"
    assert any("Window <b>OPEN</b>" in f["html"] for f in state.feed)


def test_alert_progression(engine, state):
    a = next(a for a in state.alerts if a["status"] == "sent")
    t0 = a["t"]
    # >40 s sim time → delivered; >140 s → acked with ack seconds
    for _ in range(900):
        engine.tick(200)
        if a["status"] == "acked":
            break
    assert a["status"] == "acked"
    assert state.now() - t0 > 140000
    assert isinstance(a["ack"], int) and 54 <= a["ack"] <= 134
    assert any("LEA ack" in f["html"] for f in state.feed)


def test_scheduled_events_run_in_sim_time(engine, state):
    calls = []
    state.schedule(1, lambda: calls.append(1))  # 1 sim-second
    engine.tick(200)  # 200 ms × speed 20 = 4 sim-s
    assert calls == [1]


def test_transmit_then_confirm_flow(engine, state):
    c = state.find_case("NCRP-2026-0918-4468")
    m = c["mules"][0]
    assert engine.transmit_freeze(m["tok"])["ok"] is True
    assert m["status"] == "sent"
    for _ in range(15 * 60 * 5):
        engine.tick(200)
        if m["frozen"]:
            break
    assert m["frozen"] is True
    assert m["frozenAmt"] > 0
    assert state.frozen_ytd > 1530000
    # re-transmit on a confirmed mule is a no-op the API layer rejects by token;
    # transmitting an unknown token returns None
    assert engine.transmit_freeze("TKN-0000-0000") is None


def test_close_case_updates_kpis(engine, state):
    c = state.find_case("NCRP-2026-0918-4468")
    m = c["mules"][0]
    engine.transmit_freeze(m["tok"])
    for _ in range(15 * 60 * 5):
        engine.tick(200)
        if m["frozen"]:
            break
    recovered_before = state.recovered_ytd
    closed_before = state.closed_count
    engine.close_case(c["id"])
    assert state.find_case(c["id"]) is None
    assert state.recovered_ytd == recovered_before + int(m["frozenAmt"] * 0.92 + 0.5)
    assert state.closed_count == closed_before + 1


def test_spawn_cap_at_8(engine, state):
    """The demo spawner caps the board at 8 cases (store.spawnCase behaviour)."""
    state.cases.clear()
    random.seed(7)
    from app.domain.spawn import spawn_case

    spawned = 0
    for _ in range(20):
        if spawn_case(state) is not None:
            spawned += 1
    assert len(state.cases) == 8
    assert spawned == 8


def test_complaint_ingestion_not_capped(engine, state):
    """Real NCRP ingestion is never silently dropped — no demo cap applies."""
    state.cases.clear()
    for _ in range(10):
        file_complaint(state, {"scam": "Loan App", "amount": 15000, "city": "Surat"})
    assert len(state.cases) == 10


def test_t1_ingestion_keeps_atms_and_forecast_feed_fires(engine, state):
    """Regression: fin_case must keep the draft's ATMs (TS: o.atms ?? []).

    A T1 case that lost its ATM list crashed the scheduled forecast feed
    (short_target → atms[0] IndexError) which killed the heartbeat task.
    """
    random.seed(123)
    forecasts_before = sum(1 for f in state.feed if f["type"] == "forecast")
    c = file_complaint(state, {"scam": "Digital Arrest", "amount": 900000, "city": "Mumbai"})
    # drive past the +2.1s forecast feed and the window opening
    for _ in range(600):
        engine.tick(200)
    # the scheduled forecast feed must have fired without crashing the tick
    assert sum(1 for f in state.feed if f["type"] == "forecast") == forecasts_before + 1
    if c["tier"] == "T1":
        assert len(c["atms"]) == 5
    engine.tick(200)  # heartbeat still alive after the scheduled event
    assert state.tick_id > 600
