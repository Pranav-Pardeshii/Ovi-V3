"""Case spawning and NCRP complaint ingestion.

spawn_case() is a faithful port of the console's store.spawnCase()
(src/store/useStore.ts); file_complaint() reuses the same pipeline for the
POST /api/complaints endpoint with caller-supplied scam / amount / city.
"""

from __future__ import annotations

import random

from ..constants import (
    BANKS,
    CITIES,
    SCAMS,
    SPAWN_AMOUNTS,
    SPAWN_NOTES,
    SPAWN_TIER_W,
    STREETS,
    TIER_MIX,
)
from ..fmt import clamp, inrc, js_round
from .builders import atm, fin_case

_BANK_KEYS = list(BANKS.keys())
_CITY_KEYS = list(CITIES.keys())

_ALLOCS = [
    [0.58, 0.21, 0.13, 0.08],
    [0.62, 0.24, 0.14],
    [0.7, 0.3],
]


def weighted_pick(pairs: list[list]) -> str:
    """Port of weightedPick() in src/lib/rng.ts."""
    r = random.random()
    acc = 0.0
    for v, w in pairs:
        acc += w
        if r <= acc:
            return v
    return pairs[0][0]


def _build_case(state, *, scam: str, amount: int, city: str, tier: str, narr: str) -> dict:
    """Assemble the case draft (mules, ATMs/zone, rail mix) exactly as spawnCase does."""
    r = random.random
    ll = CITIES[city]
    case_id = "NCRP-2026-0918-" + str(state.next_id)

    banks = _BANK_KEYS
    allocs = _ALLOCS
    n_m = 2 + int(r() * 2)
    al = allocs[3 - n_m]

    mules = []
    for i in range(n_m):
        p = clamp(0.5 + r() * 0.45, 0.4, 0.97)
        mules.append(
            {
                "bank": banks[int(r() * len(banks))],
                "p": float(f"{p:.2f}"),
                "alloc": al[i],
                "ageDays": int(3 + r() * 40) if r() < 0.5 else int(80 + r() * 600),
                "dormDays": int(r() * 160),
                "kyc": "Minimal" if r() < 0.4 else "Full",
                "ds": 1 if r() < 0.6 else 0,
            }
        )

    draft = {
        "id": case_id,
        "depMin": 0,
        "tier": tier,
        "scam": scam,
        "amount": amount,
        "victim": "— ·●●●",
        "vBank": banks[int(r() * len(banks))],
        "city": city,
        "p10": 8 + int(r() * 24),
        "p50": 0,
        "p90": 0,
        "channel": {"atm": 0, "wallet": 0, "upi": 0, "crypto": 0},
        "mules": mules,
        "atms": [],
        "narr": narr,
        "note": "",
    }
    draft["p50"] = js_round(draft["p10"] * (2.4 + r() * 1.2))
    draft["p90"] = js_round(draft["p50"] * (1.8 + r() * 0.7))

    if tier == "T1":
        for i in range(5):
            comps = [
                clamp(0.9 - i * 0.12 + r() * 0.06, 0.2, 1),
                clamp(0.85 - i * 0.1 + r() * 0.06, 0.2, 1),
                clamp(0.72 - i * 0.08 + r() * 0.06, 0.1, 1),
                clamp(0.68 - i * 0.08 + r() * 0.06, 0.1, 1),
                clamp(0.7 - i * 0.07 + r() * 0.06, 0.1, 1),
            ]
            draft["atms"].append(
                atm(
                    "ATM-" + banks[int(r() * len(banks))][:4] + "-" + city[:3].upper() + "-0" + str(100 + int(r() * 900)),
                    STREETS[int(r() * len(STREETS))],
                    banks[int(r() * len(banks))],
                    ll[0] + (r() - 0.5) * 0.06,
                    ll[1] + (r() - 0.5) * 0.06,
                    comps,
                )
            )
    if tier == "T2":
        draft["zone"] = {
            "name": city,
            "lat": ll[0],
            "lng": ll[1],
            "r": 16 + int(r() * 14),
            "signal": "KYC / phone-circle cluster confirmed by federated banks",
        }

    mix = TIER_MIX[tier]
    draft["channel"] = {"atm": mix[0], "wallet": mix[1], "upi": mix[2], "crypto": mix[3]}
    draft["note"] = SPAWN_NOTES[tier]

    return fin_case(draft, state.now())


def _announce(state, c: dict) -> None:
    """Feed + follow-up forecast event shared by spawn and complaint ingestion."""
    from ..domain.selectors import short_target

    state.push_feed("complaint", "NCRP complaint · " + c["scam"] + " · <b>" + inrc(c["amount"]) + "</b> · " + c["city"])
    tier = c["tier"]
    state.schedule(
        2.1,
        (lambda c=c: state.push_feed(
            "forecast",
            "Tier-" + tier[1] + " forecast issued in " + f"{9 + random.random() * 3:.1f}" + "s · " + short_target(c),
        )),
    )


def spawn_case(state) -> dict | None:
    """Spawn a demo complaint — port of store.spawnCase() (cap: MAX_CASES)."""
    if len(state.cases) >= 8:
        return None
    r = random.random
    city = _CITY_KEYS[int(r() * len(_CITY_KEYS))]
    scam = weighted_pick(SCAMS)
    tier = weighted_pick(SPAWN_TIER_W)
    lo, hi = SPAWN_AMOUNTS[scam]
    amount = js_round((lo + r() * (hi - lo)) / 1000) * 1000

    c = _build_case(
        state,
        scam=scam,
        amount=amount,
        city=city,
        tier=tier,
        narr="[Demo-simulated complaint] " + scam + " pattern · " + city + " · routed through the standard Ovi pipeline.",
    )

    state.cases.append(c)
    state.next_id += 1
    state.spawned += 1
    state.comp24 += 1
    state.dispatched24 += 1
    state.trend7[-1] += 1
    _announce(state, c)
    return c


def file_complaint(state, payload: dict) -> dict:
    """Ingest an NCRP complaint (POST /api/complaints) through the same pipeline."""
    scam = payload["scam"]
    if scam not in SPAWN_AMOUNTS:
        # Unknown pattern: fall back to the demo distribution's most common.
        scam = SCAMS[0][0]
    city = payload["city"]
    if city not in CITIES:
        raise ValueError(f"unknown city: {city!r}")
    amount = max(0, int(payload["amount"]))

    # Tier from the demo signal distribution, as in spawnCase.
    tier = weighted_pick(SPAWN_TIER_W)
    c = _build_case(
        state,
        scam=scam,
        amount=amount,
        city=city,
        tier=tier,
        narr="[Ingested via NCRP webhook] " + scam + " pattern · " + city + " · routed through the standard Ovi pipeline.",
    )

    state.cases.append(c)
    state.next_id += 1
    state.comp24 += 1
    state.dispatched24 += 1
    state.trend7[-1] += 1
    _announce(state, c)
    return c
