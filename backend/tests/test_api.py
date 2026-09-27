"""Contract tests — the typed surface in frontend/src/api/endpoints.ts.

Field names must match the console's TypeScript interfaces exactly
(Case, Mule, Alert, FeedEvent), since a backend-driven UI drops these
payloads straight into the typed models.
"""

CASE_KEYS = {
    "id", "depMin", "tier", "scam", "amount", "victim", "vBank", "city",
    "p10", "p50", "p90", "narr", "mules", "atms", "channel", "note",
    "depositAt", "filedAt", "short", "pt", "_st",
}
MULE_KEYS = {
    "bank", "p", "alloc", "ageDays", "dormDays", "kyc", "ds",
    "tok", "deviceShare", "k", "frozen", "frozenAmt", "status", "sentAt",
    "feats", "shap",
}
ALERT_KEYS = {"t", "ch", "to", "tier", "msg", "status", "ack"}


def test_get_cases_contract(client):
    res = client.get("/api/cases")
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) == 6
    for c in cases:
        assert CASE_KEYS <= set(c)
        for m in c["mules"]:
            assert MULE_KEYS <= set(m)
        if c["tier"] == "T1":
            assert len(c["atms"]) == 5
        if c["tier"] == "T2":
            assert "zone" in c
        if c["tier"] == "T4":
            assert c["atms"] == []
    # pre-ranked by urgency: watch (T4) first, then elapsed by countdown
    assert cases[0]["id"] == "NCRP-2026-0918-4450"


def test_get_case_single(client):
    res = client.get("/api/cases/NCRP-2026-0918-4471")
    assert res.status_code == 200
    assert res.json()["mules"][0]["tok"] == "TKN-53F1-C0A0"
    assert client.get("/api/cases/nope").status_code == 404


def test_get_alerts_contract(client):
    res = client.get("/api/alerts")
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) == 12
    for a in alerts:
        assert ALERT_KEYS <= set(a)
        assert a["ch"] in ("SMS", "EMAIL", "API", "DASH")


def test_post_complaint(client, state):
    res = client.post(
        "/api/complaints",
        json={"scam": "Digital Arrest", "amount": 500000, "city": "Mumbai"},
    )
    assert res.status_code == 201
    c = res.json()
    assert c["id"] == "NCRP-2026-0918-4472"
    assert c["scam"] == "Digital Arrest"
    assert c["amount"] == 500000
    assert c["city"] == "Mumbai"
    assert CASE_KEYS <= set(c)
    assert len(state.cases) == 7
    # complaint + scheduled forecast feed events
    types = [f["type"] for f in state.feed]
    assert "complaint" in types
    # unknown city is rejected
    bad = client.post(
        "/api/complaints", json={"scam": "Loan App", "amount": 1000, "city": "Atlantis"}
    )
    assert bad.status_code == 422


def test_freeze_transmit_and_confirmation(client, engine, state):
    tok = "TKN-53F1-C0A0"  # lead mule of case 4471
    res = client.post(f"/api/freeze/{tok}/transmit")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["caseId"] == "NCRP-2026-0918-4471"
    _, m = state.find_mule(tok)
    assert m["status"] == "sent"
    assert m["sentAt"] == state.now()

    # unknown token → 404
    assert client.post("/api/freeze/TKN-0000-0000/transmit").status_code == 404

    # confirmation lands 7–12 sim-minutes later
    frozen_ytd_before = state.frozen_ytd
    for _ in range(15 * 60 * 5):  # ≤ 15 sim-minutes in 200 ms ticks
        engine.tick(200)
        if m["frozen"]:
            break
    assert m["frozen"] is True
    assert m["status"] == "confirmed"
    assert m["frozenAmt"] > 0, "freeze must secure the live balance, not ₹0"
    assert state.frozen_ytd > frozen_ytd_before


def test_report_contract(client):
    res = client.get("/api/cases/NCRP-2026-0918-4471/report")
    assert res.status_code == 200
    html = res.json()["html"]
    for section in (
        "CASE SUMMARY",
        "MONEY TRAIL",
        "FLAGGED MULE ACCOUNTS",
        "CASHOUT FORECAST",
        "ACTIONS TAKEN",
        "EVIDENCE BUNDLE",
        "CERTIFICATION",
    ):
        assert section in html
    assert "TKN-53F1-C0A0" in html
    # raw HTML variant for direct browser open / print
    raw = client.get("/api/cases/NCRP-2026-0918-4471/report?raw=1")
    assert raw.status_code == 200
    assert raw.headers["content-type"].startswith("text/html")
    assert client.get("/api/cases/nope/report").status_code == 404


def test_feed_state_speed_extras(client, state):
    feed = client.get("/api/feed").json()
    assert len(feed) == 10
    assert {"t", "type", "html"} <= set(feed[0])

    snap = client.get("/api/state").json()
    assert snap["kpis"]["frozenYTD"] == 1530000
    assert snap["kpis"]["recoveredYTD"] == 42300000
    assert len(snap["confirmedSeed"]) == 2
    assert snap["freezeQueue"], "T1/T2/T3 mules must be in the freeze queue"
    top = snap["freezeQueue"][0]
    assert {"caseId", "tok", "bank", "p", "expected", "status"} <= set(top)

    assert client.get("/api/speed").json() == {"speed": 20.0}
    assert client.post("/api/speed", json={"speed": 120}).json() == {"speed": 120.0}
    assert state.speed == 120.0
    assert client.post("/api/speed", json={"speed": 0}).status_code == 422

    g = client.get("/api/graph/NCRP-2026-0918-4471").json()
    assert len(g["n"]) == 9 and len(g["e"]) == 8
    assert client.get("/api/graph/nope").status_code == 404

    assert client.get("/api/health").json()["ok"] is True


def test_anchor_and_redispatch(client, state):
    rec = client.post("/api/cases/NCRP-2026-0918-4471/anchor")
    assert rec.status_code == 200
    body = rec.json()
    assert body["hash"].startswith("0x") and len(body["hash"]) == 22
    assert body["block"] == state.fabric
    assert state.reports["NCRP-2026-0918-4471"]["hash"] == body["hash"]
    assert any(f["type"] == "ledger" for f in state.feed)

    res = client.post("/api/alerts/0/redispatch")
    assert res.status_code == 200
    assert state.alerts[0]["status"] == "acked"
    assert state.alerts[0]["ack"] == 18
    assert client.post("/api/alerts/99/redispatch").status_code == 404


def test_websocket_feed_push(client, state):
    """Feed events flow to subscribers exactly as the production lifespan wires them.

    The broadcast must originate on the app's event loop, so trigger a real
    route (complaint ingestion pushes a feed event) while the socket is open.
    """
    with client.websocket_connect("/api/ws") as ws:
        client.post(
            "/api/complaints",
            json={"scam": "Digital Arrest", "amount": 500000, "city": "Mumbai"},
        )
        msg = ws.receive_json()
        assert msg["type"] == "feed"
        assert msg["event"]["type"] == "complaint"
        assert "Digital Arrest" in msg["event"]["html"]
