"""Port of frontend/src/sim/graph.ts — deterministic tokenized money-trail graph."""

from __future__ import annotations

from ..constants import BANKS
from ..rng import js_hash, mulberry32, hex_n

_BANK_KEYS = list(BANKS.keys())


def build_graph(c: dict) -> dict:
    """Victim → 2 hops → mules → forecast ATMs, with layout hints for the canvas.

    Node/edge shapes mirror the console's Graph interface (node positions are
    initial force-layout hints, comm = community index for hulls).
    """
    r = mulberry32(js_hash(c["id"] + "g"))
    n: list[dict] = []
    e: list[dict] = []

    def node(**kw) -> dict:
        base = {"x": 0, "y": 0, "vx": 0, "vy": 0, "comm": 0}
        base.update(kw)
        n.append(base)
        return base

    node(id="V", type="victim", label="VICTIM", bank=c["vBank"], x=110, y=280)
    node(id="H1", type="hop", tok="TKN-" + hex_n(c["id"] + "h1", 4), bank=_BANK_KEYS[int(r() * 8)], x=340, y=220)
    node(id="H2", type="hop", tok="TKN-" + hex_n(c["id"] + "h2", 4), bank=_BANK_KEYS[int(r() * 8)], x=560, y=320)
    e.append({"a": 0, "b": 1, "amount": c["amount"], "seq": 0})
    e.append({"a": 1, "b": 2, "amount": round(c["amount"] * 0.84), "seq": 1})

    mules = c["mules"]
    for i, m in enumerate(mules):
        node(
            id=f"M{i}",
            type="mule",
            tok=m["tok"],
            bank=m["bank"],
            p=m["p"],
            mule=m,
            x=760,
            y=120 + i * (420 / max(1, len(mules) - 1)),
            comm=1 if i % 3 == 2 else 0,
        )
        e.append({"a": 2, "b": len(n) - 1, "amount": round(c["amount"] * m["alloc"]), "seq": 2 + i})

    if c["tier"] == "T1" and c["atms"]:
        for i, a in enumerate(c["atms"][:2]):
            node(id=f"A{i}", type="atm", label=a["id"], bank=a["bank"], x=880, y=200 + i * 150)
            e.append(
                {"a": 3, "b": len(n) - 1, "amount": round(c["amount"] * mules[0]["alloc"]), "seq": 20 + i, "forecast": True}
            )

    return {"n": n, "e": e}
