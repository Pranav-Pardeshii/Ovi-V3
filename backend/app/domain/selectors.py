"""Port of frontend/src/sim/selectors.ts — live state projections.

All functions read the shared State; the API layer calls them per request so
responses always reflect the current sim clock.
"""

from __future__ import annotations

from ..fmt import clamp
from ..constants import RAILN

_STATERANK = {"win": 0, "pre": 1, "watch": 2, "elapsed": 3}


def now_ms(state) -> int:
    return state.now()


def elapsed_sec(c: dict, at: int) -> float:
    return (at - c["depositAt"]) / 1000


def count_med(c: dict, at: int) -> float:
    return c["p50"] - elapsed_sec(c, at)


def case_state(c: dict, at: int) -> str:
    if c["tier"] == "T4":
        return "watch"
    e = elapsed_sec(c, at)
    return "pre" if e < c["p10"] else ("win" if e <= c["p90"] else "elapsed")


def urgency_key(c: dict, at: int):
    return (_STATERANK[case_state(c, at)], count_med(c, at))


def mule_bal(c: dict, m: dict, at: int) -> float:
    """Live mule balance — decays toward 0 across the cashout window."""
    if m["frozen"]:
        return m["frozenAmt"]
    d = clamp(elapsed_sec(c, at) / c["p90"], 0, 1)
    return max(0.0, c["amount"] * m["alloc"] * (1 - 0.8 * d ** m["k"]))


def at_risk(c: dict, at: int) -> float:
    return sum(mule_bal(c, m, at) for m in c["mules"])


def total_at_risk(state, at: int | None = None) -> float:
    at = at if at is not None else state.now()
    return sum(at_risk(c, at) for c in state.cases)


def short_target(c: dict) -> str:
    if c["tier"] == "T1":
        return "ATM " + c["atms"][0]["id"] + " · " + c["atms"][0]["loc"]
    if c["tier"] == "T2":
        z = c["zone"]
        return z["name"] + " district ring · " + str(z["r"]) + "km"
    if c["tier"] == "T3":
        rail, pct = sorted(c["channel"].items(), key=lambda kv: -kv[1])[0]
        return RAILN[rail] + " rail · " + str(pct) + "%"
    return "watchlist — no forecast"


def win_label(c: dict, at: int) -> str:
    """Window label per the console's winLabel()."""
    from ..fmt import short_cd

    if c["tier"] == "T4":
        return "—"
    e = elapsed_sec(c, at)
    if e < c["p10"]:
        return "OPENS " + short_cd(c["p10"] - e)
    if e <= c["p90"]:
        return "CLOSES " + short_cd(c["p90"] - e)
    return "ELAPSED"


def freeze_rows(state, at: int) -> list[dict]:
    """Actionable (T1–T3) mules ranked by expected recoverable (balance × P)."""
    rows = []
    for c in state.cases:
        if c["tier"] == "T4":
            continue
        for m in c["mules"]:
            if m["status"] in ("queue", "sent"):
                rows.append({"case": c, "mule": m})
    rows.sort(key=lambda r: -(mule_bal(r["case"], r["mule"], at) * r["mule"]["p"]))
    return rows


def windows_open(state) -> int:
    return sum(1 for c in state.cases if c["_st"] == "win")


def unacked_alerts(state) -> int:
    return sum(1 for a in state.alerts if a["status"] != "acked")
