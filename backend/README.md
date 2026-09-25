# Ovi-3 Backend

FastAPI server for the interdiction console. It serves the typed contract
defined in [`frontend/src/api/endpoints.ts`](../frontend/src/api/endpoints.ts)
and reproduces the console's simulation domain byte-for-byte in Python — same
mule tokens (`TKN-53F1-C0A0`…), SHAP tables, pipeline timings, and hash anchors,
so a backend-driven UI is indistinguishable from the sim-driven one.

## Run

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt     # Windows
# .venv/bin/pip install -r requirements.txt       # Linux/macOS

.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

The Vite dev server proxies `/api` → `localhost:8000`
(`frontend/vite.config.ts`), so the console needs no extra config. OpenAPI
docs: <http://localhost:8000/docs>.

Environment overrides: `OVI_BASE_MS` (sim clock epoch), `OVI_SPEED`
(default 20×), `OVI_TICK_MS` (heartbeat, 200 ms), `OVI_SPAWN_INTERVAL_S`
(demo complaint arrival, 95 s).

## Contract + extras

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/cases` | `Case[]` pre-ranked by interdiction urgency |
| GET | `/api/cases/{id}` | single `Case` |
| GET | `/api/cases/{id}/report` | `{html}` FIR bundle; `?raw=1` → `text/html`, `?download=1` → attachment |
| GET | `/api/alerts` | dispatch log `Alert[]` |
| POST | `/api/complaints` | `{scam, amount, city}` → ingest a complaint through the full pipeline |
| POST | `/api/freeze/{tok}/transmit` | queue a CFCFRMS request; bank confirmation lands 7–12 sim-min later |
| GET | `/api/feed` | live event feed (console's event log) |
| GET | `/api/state` | KPIs, confirmed freezes, freeze queue (expected-recoverable ranked) |
| GET | `/api/graph/{id}` | tokenized money-trail graph (victim → hops → mules → forecast ATMs) |
| POST | `/api/cases/{id}/anchor` | anchor the report to the (simulated) Fabric evidence channel |
| POST | `/api/alerts/{i}/redispatch` | re-dispatch an alert |
| GET/POST | `/api/speed` | sim clock multiplier |
| GET | `/api/health` | liveness + sim clock |
| WS | `/ws` | `feed` frames on every event + 1 Hz `state` snapshots |

Case payloads use the console's exact field names (`tok`, `depMin`,
`p10/p50/p90`, `narr`, `_st`, `pt`, …) — see `frontend/src/types.ts`.

## Layout

```
app/
  rng.py            bit-exact port of frontend/src/lib/rng.ts (mulberry32/FNV/hexN)
  fmt.py            port of src/lib/format.ts (₹ en-IN grouping, IST display)
  constants.py      port of src/data/constants.ts (insertion-order sensitive)
  state.py          in-process world state — the persistence swap point
  engine.py         5 Hz heartbeat: lifecycle, fabric blocks, alerts, freezes
  domain/
    builders.py     deterministic seed (6 opening cases), mule enrichment, SHAP
    graph.py        tokenized money-trail graph builder
    selectors.py    urgency, mule balance decay, freeze ranking
    spawn.py        demo spawner + NCRP complaint ingestion
    report.py       FIR-style HTML report (server-side port of reportHtml.ts)
  api/routes.py     the endpoints above
  api/ws.py         WebSocket hub + snapshot frames
tests/              30 pytest tests incl. node-verified RNG golden values
tools/golden_rng.mjs  node script that emits the RNG goldens from the TS source
```

State is in-memory by design for the demo; `state.py` is the single swap
point when PostgreSQL/Neo4j land (see the plan document, §7).

## Tests

```bash
.venv/Scripts/python -m pytest
```

The RNG port is verified against golden values produced by running the exact
TypeScript function bodies under node — the backend generates the same
identifiers as the console for every seed string.
