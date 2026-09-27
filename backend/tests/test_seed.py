"""Seed determinism: the backend boots into the exact same investigation
as the console's simulation engine (same tokens, SHAP tables, timings)."""

from app.domain.builders import build_seed
from app.domain.graph import build_graph

REQUIRED_CASE_KEYS = [
    "id", "depMin", "tier", "scam", "amount", "victim", "vBank", "city",
    "p10", "p50", "p90", "narr", "mules", "atms", "channel", "note",
    "depositAt", "filedAt", "short", "pt", "_st",
]


def test_seed_shape():
    seed = build_seed(1789721400000)
    assert len(seed["cases"]) == 6
    assert len(seed["feed"]) == 10
    assert len(seed["alerts"]) == 12
    # at base the five T1–T3 cases are past their P90 (depMin 6–52 min ago,
    # p90 in seconds) and the T4 case is watchlist — matching the console's
    # urgencyOf ranking, which selects the T4 case first
    assert seed["selCase"] == "NCRP-2026-0918-4450"
    for c in seed["cases"]:
        for k in REQUIRED_CASE_KEYS:
            assert k in c, f"missing {k} on {c['id']}"
        assert c["short"] == c["id"][-4:]
        assert c["_st"] == "watch"
        assert len(c["pt"]) == 7
        assert all(b > a for a, b in zip(c["pt"], c["pt"][1:]))  # monotonic T+


def test_mule_tokens_match_console():
    """Goldens cross-checked against node running frontend/src/lib/rng.ts."""
    seed = build_seed(1789721400000)
    c = next(x for x in seed["cases"] if x["id"] == "NCRP-2026-0918-4471")
    assert [m["tok"] for m in c["mules"]] == [
        "TKN-53F1-C0A0",
        "TKN-14F3-0528",
        "TKN-FDE6-9A1A",
        "TKN-9A2B-C592",
    ]
    m = c["mules"][0]
    assert m["deviceShare"] is True
    assert m["status"] == "queue"
    assert m["frozen"] is False
    assert set(m["feats"]) == {
        "Account age", "In/out degree", "Velocity ratio", "Dormancy",
        "Beneficiary reuse", "KYC", "Device sharing", "Phone mismatch",
        "Amount deviation", "TTF withdrawal",
    }


def test_shap_sums_to_probability():
    seed = build_seed(1789721400000)
    for c in seed["cases"]:
        for m in c["mules"]:
            total = sum(r["v"] for r in m["shap"])
            assert abs(total - (m["p"] - 0.011)) < 1e-9
            mags = [abs(r["v"]) for r in m["shap"]]
            assert mags == sorted(mags, reverse=True)  # sorted by |v| desc


def test_graph_is_deterministic():
    seed = build_seed(1789721400000)
    c = next(x for x in seed["cases"] if x["id"] == "NCRP-2026-0918-4471")
    g1, g2 = build_graph(c), build_graph(c)
    assert g1 == g2
    # victim → 2 hops → 4 mules → 2 forecast ATMs
    assert len(g1["n"]) == 9
    assert len(g1["e"]) == 8
    assert g1["n"][0]["type"] == "victim"
    assert sum(1 for n in g1["n"] if n["type"] == "atm") == 2
    assert all(e.get("forecast") for e in g1["e"] if e["seq"] >= 20)
