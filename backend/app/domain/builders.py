"""Port of frontend/src/data/build.ts — deterministic builders.

Every identifier (mule tokens, SHAP tables, pipeline timings) is derived from
mulberry32/hash over seed strings, so the backend emits byte-identical JSON
for the same opening cases as the console's simulation engine.
"""

from __future__ import annotations

from ..constants import PIPE, Wt
from ..rng import js_hash, mulberry32, hex_n


def atm(atm_id: str, loc: str, bank: str, lat: float, lng: float, comps: list[float]) -> dict:
    """Deterministic ATM record with weighted score (score = Σ wᵢ·compsᵢ)."""
    return {
        "id": atm_id,
        "loc": loc,
        "bank": bank,
        "lat": lat,
        "lng": lng,
        "comps": comps,
        "score": sum(c * w for c, w in zip(comps, Wt)),
    }


_SHAP_TABLE = [
    ["Device sharing", 0.18],
    ["Dormancy→burst", 0.16],
    ["Velocity ratio", 0.13],
    ["In/out degree", 0.11],
    ["Phone mismatch", 0.08],
    ["Beneficiary reuse", 0.06],
    ["Amount deviation", 0.04],
    ["TTF withdrawal", 0.03],
    ["KYC completeness", -0.03],
    ["Account age", -0.05],
]


def mk_shap(p: float, seed: str) -> list[dict]:
    """SHAP-style attribution mirroring the console's mkShap()."""
    r = mulberry32(js_hash(seed))
    raw = [[t[0], t[1] * (0.6 + r() * 0.9)] for t in _SHAP_TABLE]
    s = (p - 0.011) / sum(x[1] for x in raw)
    rows = [{"l": x[0], "v": x[1] * s} for x in raw]
    rows.sort(key=lambda x: -abs(x["v"]))
    return rows


def fin_mule(case_id: str, m: dict, i: int) -> dict:
    """Attach tokenized identity + features + SHAP to a raw federated mule record."""
    seed = f"{case_id}#m{i}"
    r = mulberry32(js_hash(seed))
    return {
        **m,
        "tok": "TKN-" + hex_n(seed + "a", 4) + "-" + hex_n(seed + "b", 4),
        "deviceShare": bool(m["ds"]),
        "k": 0.5 + r() * 0.8,
        "frozen": False,
        "frozenAmt": 0,
        "status": "queue",
        "sentAt": 0,
        "feats": {
            "Account age": f"{m['ageDays']}d",
            "In/out degree": f"{0.9 + r() * 2.1:.1f}",
            "Velocity ratio": f"{2.2 + r() * 2.8:.1f}" + "×",
            "Dormancy": f"{m['dormDays']}d",
            "Beneficiary reuse": f"{0.3 + r() * 0.4:.2f}",
            "KYC": m["kyc"],
            "Device sharing": "shared ×3" if m["ds"] else "none",
            "Phone mismatch": "Δ " + str(int(120 + r() * 900)) + " km",
            "Amount deviation": "+" + str(int(8 + r() * 14)) + "σ",
            "TTF withdrawal": "< " + str(int(60 + r() * 120)) + " s",
        },
        "shap": mk_shap(m["p"], seed),
    }


def fin_case(o: dict, now: int) -> dict:
    """Normalize a case literal: pipeline timings, timestamps, per-mule enrichment.

    Mirrors finCase() in build.ts, including the pipeline-timing jitter (each
    step lands at its nominal T+ ± jitter, monotonically increasing, 0.1s
    resolution — note the first step reads T+0.1s). ATMs/zone live inside the
    literal (`o["atms"] ?? []` in TS).
    """
    case_id = o["id"]
    r = mulberry32(js_hash(case_id))
    prev = 0.0
    pt = []
    for i, p in enumerate(PIPE):
        v = 0 if i == 0 else p[2] + (r() * 0.8 - 0.25)
        vv = max(prev + 0.1, v)
        prev = vv
        pt.append(float(f"{vv:.1f}"))

    c = {**o, "pt": pt}
    c["atms"] = o.get("atms") or []
    c["depositAt"] = now - o["depMin"] * 60000
    c["filedAt"] = now - o["depMin"] * 60000 + 180000
    c["short"] = case_id[-4:]
    c["_st"] = "watch"
    c["mules"] = [fin_mule(case_id, m, i) for i, m in enumerate(o["mules"])]
    return c


def build_seed(base: int) -> dict:
    """The six opening cases + feed backlog + dispatch log, deterministic from base.

    Literals mirror buildSeed() in the console (src/data/build.ts) so the
    backend boots into the exact same investigation as the sim.
    """
    now = base
    cases = [
        fin_case(
            {
                "id": "NCRP-2026-0918-4471",
                "depMin": 22,
                "tier": "T1",
                "scam": "Digital Arrest",
                "amount": 1850000,
                "victim": "V. KRISHNAN ·●●●",
                "vBank": "HDFC",
                "city": "Bengaluru",
                "p10": 26,
                "p50": 118,
                "p90": 250,
                "narr": "Caller posed as “Mumbai Cyber Crime” — claimed the victim’s Aadhaar was linked to a laundering case. Kept on live video for 3 hours; 14 tranches sent to an “RBI verification account”.",
                "mules": [
                    {"bank": "SBI", "p": 0.94, "alloc": 0.58, "ageDays": 12, "dormDays": 94, "kyc": "Minimal", "ds": 1},
                    {"bank": "ICICI", "p": 0.88, "alloc": 0.21, "ageDays": 26, "dormDays": 141, "kyc": "Full", "ds": 1},
                    {"bank": "AXIS", "p": 0.76, "alloc": 0.13, "ageDays": 210, "dormDays": 12, "kyc": "Full", "ds": 0},
                    {"bank": "PNB", "p": 0.61, "alloc": 0.08, "ageDays": 480, "dormDays": 30, "kyc": "Pending", "ds": 0},
                ],
                "channel": {"atm": 62, "wallet": 22, "upi": 16, "crypto": 0},
                "atms": [
                    atm("ATM-SBI-BLR-0873", "MG Road", "SBI", 12.975, 77.6068, [0.92, 0.9, 0.74, 0.66, 0.78]),
                    atm("ATM-AXIS-BLR-0211", "Koramangala 80ft Rd", "AXIS", 12.9358, 77.624, [0.74, 0.79, 0.66, 0.71, 0.66]),
                    atm("ATM-HDFC-BLR-0146", "Indiranagar 100ft Rd", "HDFC", 12.9714, 77.6409, [0.61, 0.68, 0.58, 0.63, 0.62]),
                    atm("ATM-ICIC-BLR-0329", "Jayanagar 4th Block", "ICICI", 12.925, 77.59, [0.48, 0.55, 0.5, 0.52, 0.55]),
                    atm("ATM-PNB-BLR-0058", "Rajajinagar", "PNB", 12.99, 77.553, [0.4, 0.46, 0.42, 0.44, 0.5]),
                ],
                "note": "Debit card active on lead mule — <b>ATM is the primary rail</b>; wallet fallback expected if the card gets blocked mid-window.",
            },
            now,
        ),
        fin_case(
            {
                "id": "NCRP-2026-0918-4468",
                "depMin": 52,
                "tier": "T1",
                "scam": "Investment / Trading",
                "amount": 920000,
                "victim": "S. AGARWAL ·●●●",
                "vBank": "ICICI",
                "city": "New Delhi",
                "p10": 8,
                "p50": 95,
                "p90": 210,
                "narr": "Fake trading app “FinnEdge Pro” showed 3% daily returns on a rigged dashboard. Retirement savings moved across 9 UPI tranches.",
                "mules": [
                    {"bank": "SBI", "p": 0.91, "alloc": 0.56, "ageDays": 8, "dormDays": 60, "kyc": "Minimal", "ds": 1},
                    {"bank": "HDFC", "p": 0.84, "alloc": 0.24, "ageDays": 34, "dormDays": 120, "kyc": "Full", "ds": 1},
                    {"bank": "AXIS", "p": 0.68, "alloc": 0.2, "ageDays": 150, "dormDays": 25, "kyc": "Full", "ds": 0},
                ],
                "channel": {"atm": 58, "wallet": 20, "upi": 18, "crypto": 4},
                "atms": [
                    atm("ATM-HDFC-DEL-0421", "Connaught Place", "HDFC", 28.6315, 77.2167, [0.88, 0.86, 0.72, 0.71, 0.74]),
                    atm("ATM-SBI-DEL-0954", "Karol Bagh", "SBI", 28.6515, 77.1905, [0.72, 0.78, 0.66, 0.62, 0.7]),
                    atm("ATM-AXIS-DEL-0187", "Rajouri Garden", "AXIS", 28.6428, 77.1207, [0.61, 0.66, 0.58, 0.55, 0.62]),
                    atm("ATM-ICIC-DEL-0703", "Nehru Place", "ICICI", 28.5483, 77.2515, [0.5, 0.55, 0.5, 0.48, 0.55]),
                    atm("ATM-PNB-DEL-0341", "Lajpat Nagar", "PNB", 28.5677, 77.2432, [0.42, 0.47, 0.44, 0.42, 0.5]),
                ],
                "note": "Window already open — balances decaying. <b>Freeze confirmations are racing the cashout.</b>",
            },
            now,
        ),
        fin_case(
            {
                "id": "NCRP-2026-0918-4462",
                "depMin": 12,
                "tier": "T2",
                "scam": "Task-based (ROM)",
                "amount": 185000,
                "victim": "M. SHAIKH ·●●●",
                "vBank": "SBI",
                "city": "Thane",
                "p10": 40,
                "p50": 150,
                "p90": 330,
                "narr": "Telegram “part-time likes” job — prepaid task wallet. Payments cycled repeatedly to “unlock” commissions that never arrived.",
                "mules": [
                    {"bank": "BOB", "p": 0.82, "alloc": 0.55, "ageDays": 45, "dormDays": 88, "kyc": "Minimal", "ds": 1},
                    {"bank": "SBI", "p": 0.74, "alloc": 0.27, "ageDays": 120, "dormDays": 40, "kyc": "Full", "ds": 0},
                    {"bank": "ICICI", "p": 0.66, "alloc": 0.18, "ageDays": 300, "dormDays": 15, "kyc": "Full", "ds": 0},
                ],
                "zone": {"name": "Jaipur", "lat": 26.9124, "lng": 75.7873, "r": 24, "signal": "KYC cluster — 3 mule accounts registered within 6 km"},
                "channel": {"atm": 18, "wallet": 44, "upi": 34, "crypto": 4},
                "note": "Victim in Thane, mule KYC cluster in Jaipur — <b>geography follows the mule, not the victim.</b>",
            },
            now,
        ),
        fin_case(
            {
                "id": "NCRP-2026-0918-4455",
                "depMin": 6,
                "tier": "T3",
                "scam": "Fake Customer Care",
                "amount": 74000,
                "victim": "P. NAIR ·●●●",
                "vBank": "AXIS",
                "city": "Kochi",
                "p10": 15,
                "p50": 80,
                "p90": 170,
                "narr": "Customer-care number served via search ad. OTP shared for a “card replacement”; two IMPS tranches inside 4 minutes.",
                "mules": [
                    {"bank": "YES", "p": 0.71, "alloc": 0.7, "ageDays": 4, "dormDays": 2, "kyc": "Pending", "ds": 1},
                    {"bank": "KOTAK", "p": 0.62, "alloc": 0.3, "ageDays": 6, "dormDays": 3, "kyc": "Minimal", "ds": 1},
                ],
                "channel": {"atm": 0, "wallet": 68, "upi": 24, "crypto": 8},
                "note": "Lead mule account age <b>4 days — no debit card issued</b>. Chasing the <b>wallet rail, not the ATM</b>; cashout via agent cash-in network.",
            },
            now,
        ),
        fin_case(
            {
                "id": "NCRP-2026-0918-4450",
                "depMin": 30,
                "tier": "T4",
                "scam": "Loan App",
                "amount": 36000,
                "victim": "A. KAUR ·●●●",
                "vBank": "PNB",
                "city": "Chandigarh",
                "p10": 60,
                "p50": 240,
                "p90": 480,
                "narr": "Instant-loan app harassment — “processing fee” deductions followed by contact-list threats.",
                "mules": [
                    {"bank": "PNB", "p": 0.54, "alloc": 0.6, "ageDays": 600, "dormDays": 20, "kyc": "Full", "ds": 0},
                    {"bank": "KOTAK", "p": 0.49, "alloc": 0.4, "ageDays": 380, "dormDays": 45, "kyc": "Full", "ds": 0},
                ],
                "channel": {"atm": 22, "wallet": 30, "upi": 40, "crypto": 8},
                "note": "Insufficient graph signal beyond “account exists”. <b>Watchlist mode — no geographic forecast will be issued.</b>",
            },
            now,
        ),
        fin_case(
            {
                "id": "NCRP-2026-0918-4446",
                "depMin": 9,
                "tier": "T2",
                "scam": "Investment / Trading",
                "amount": 460000,
                "victim": "R. YADAV ·●●●",
                "vBank": "BOB",
                "city": "Kanpur",
                "p10": 30,
                "p50": 120,
                "p90": 260,
                "narr": "WhatsApp “SEBI-registered advisor” group. IPO allotment “guaranteed” against upfront margin payments.",
                "mules": [
                    {"bank": "BOB", "p": 0.87, "alloc": 0.52, "ageDays": 18, "dormDays": 74, "kyc": "Minimal", "ds": 1},
                    {"bank": "SBI", "p": 0.79, "alloc": 0.28, "ageDays": 95, "dormDays": 55, "kyc": "Full", "ds": 0},
                    {"bank": "HDFC", "p": 0.64, "alloc": 0.2, "ageDays": 260, "dormDays": 18, "kyc": "Full", "ds": 0},
                ],
                "zone": {"name": "Lucknow", "lat": 26.8467, "lng": 80.9462, "r": 18, "signal": "Branch + phone-circle overlap — 2 mules onboarded via same KYC agent"},
                "channel": {"atm": 26, "wallet": 38, "upi": 30, "crypto": 6},
                "note": "District ring issued on KYC + phone-circle evidence. Patrol coordination advised with <b>Lucknow City Cyber</b>.",
            },
            now,
        ),
    ]

    feed = [
        {"t": base - m * 60000, "type": t, "html": html}
        for t, m, html in [
            ["ledger", 2, "Block <b>#4,721,884</b> committed · evidence channel"],
            ["freeze", 4, "CFCFRMS confirmed · TKN-88C1-2D04 · <b>₹2,20,000 secured</b> · NCRP-…4391"],
            ["alert", 6, "LEA ack 42s · Cyber PS Bengaluru · Tier-1 ATM dispatch"],
            ["system", 9, "Federated round #211 complete · 24/24 banks · DP ε=0.81"],
            ["forecast", 13, "Tier-1 forecast issued · <b>NCRP-…4471</b> · ATM-SBI-BLR-0873 · 11.2s"],
            ["complaint", 14, "NCRP complaint · Digital Arrest · <b>₹18.5 L</b> · Bengaluru"],
            ["forecast", 26, "Tier-1 forecast issued · <b>NCRP-…4468</b> · ATM-HDFC-DEL-0421 · 9.8s"],
            ["complaint", 27, "NCRP complaint · Investment scam · <b>₹9.2 L</b> · New Delhi"],
            ["system", 38, "Chakravyuh-Bench eval pass · hit@1 0.74 · calibration error 2.1%"],
            ["forecast", 44, "Tier-2 zone forecast · <b>NCRP-…4446</b> · Lucknow ring 18km"],
        ]
    ]

    alerts = [
        {"t": base - m * 60000, "ch": ch, "to": to, "tier": tier, "msg": msg, "status": status, "ack": ack}
        for m, ch, to, tier, msg, status, ack in [
            [1, "SMS", "Cyber PS Bengaluru · 96xxx21", "T1", "Tier-1 forecast ATM-SBI-BLR-0873 · window 14:46–16:30 IST · deploy field team · CCTV pull code OV3-4471", "acked", 42],
            [3, "API", "SBI Fraud Desk · FL node", "T1", "Score ping TKN-7F3A-C210 · P(mule) 0.94 · freeze request queued", "acked", 8],
            [5, "API", "HDFC ATM Ops · DEL region", "T1", "Watchlist push ATM-HDFC-DEL-0421 · ranked #1 · window 15:04–17:32", "acked", 11],
            [8, "EMAIL", "nodal.cyber@icici · risk desk", "T2", "Zone forecast Lucknow 18km · 3 tokenized accounts · patrol coordination advised", "acked", 96],
            [12, "SMS", "SP Cyber · Jaipur", "T2", "Zone ring Jaipur 24km · KYC cluster · window 15:10–18:52 IST", "delivered", None],
            [16, "API", "YES Bank mule desk", "T3", "Rail-mix alert · wallet 68% · agent-network cashout expected", "acked", 23],
            [21, "EMAIL", "LEA coordinator · Kochi", "T3", "Wallet rail focus — no debit card on account · monitor agent top-ups", "acked", 188],
            [26, "API", "PNB fraud analytics", "T4", "Watchlist enrollment · insufficient signal · no forecast issued", "sent", None],
            [31, "SMS", "Cyber PS Lucknow", "T2", "Zone forecast Lucknow · window 14:59–17:49 IST", "acked", 64],
            [38, "DASH", "Investigator desk · 4 active", "T1", "Dashboard push · 4 interdiction clocks running", "acked", 3],
            [44, "API", "BOB Fraud Desk", "T2", "Score ping TKN-5C11-8820 · P(mule) 0.87 · freeze queued", "acked", 9],
            [52, "SMS", "Cyber PS New Delhi", "T1", "Tier-1 forecast ATM-HDFC-DEL-0421 · team dispatch ETA 11m", "acked", 51],
        ]
    ]

    sel_case = sorted(cases, key=lambda c: _urgency_of(c, base))[0]["id"]

    return {"cases": cases, "feed": feed, "alerts": alerts, "selCase": sel_case}


_STATERANK = {"win": 0, "pre": 1, "watch": 2, "elapsed": 3}


def _case_state_at(c: dict, at: int) -> str:
    if c["tier"] == "T4":
        return "watch"
    e = (at - c["depositAt"]) / 1000
    return "pre" if e < c["p10"] else ("win" if e <= c["p90"] else "elapsed")


def _urgency_of(c: dict, at: int) -> float:
    rank = _STATERANK[_case_state_at(c, at)]
    med = c["p50"] - (at - c["depositAt"]) / 1000
    return rank * 1e9 + med


__all__ = ["atm", "mk_shap", "fin_mule", "fin_case", "build_seed"]
