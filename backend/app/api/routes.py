"""REST API — the typed contract from frontend/src/api/endpoints.ts plus the
read-only extras the console needs for a full backend swap-in.

Contract endpoints (Vite dev proxy forwards /api → localhost:8000):
  GET  /api/cases                 → Case[]
  GET  /api/cases/{id}            → Case
  GET  /api/alerts                → Alert[]
  POST /api/complaints            → Case          (file a test complaint)
  POST /api/freeze/{tok}/transmit → {ok}          (queue CFCFRMS request)
  GET  /api/cases/{id}/report     → {html}        (server-rendered report)

Extras: /api/feed, /api/state, /api/graph/{id}, /api/cases/{id}/anchor,
POST /api/alerts/{i}/redispatch, GET/POST /api/speed, /api/health.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from ..domain.report import report_document
from ..domain.selectors import (
    case_state,
    freeze_rows,
    mule_bal,
    total_at_risk,
    unacked_alerts,
    urgency_key,
    windows_open,
)
from ..domain.spawn import file_complaint
from ..state import State

router = APIRouter(prefix="/api")


# ---- request bodies -----------------------------------------------------
class ComplaintIn(BaseModel):
    scam: str = Field(min_length=1)
    amount: float = Field(ge=0)
    city: str = Field(min_length=1)


class SpeedIn(BaseModel):
    speed: float = Field(gt=0, le=1000)


# ---- dependency ---------------------------------------------------------
def get_state(request: Request) -> State:
    return request.app.state.ovi


def _refresh(c: dict, state: State) -> dict:
    """Refresh the live case state field (engine keeps it current anyway)."""
    c["_st"] = case_state(c, state.now())
    return c


# ---- contract endpoints -------------------------------------------------
@router.get("/cases")
async def list_cases(request: Request) -> list[dict]:
    """Case[] pre-ranked by interdiction urgency (win → pre → watch → elapsed)."""
    state = get_state(request)
    cases = [_refresh(c, state) for c in state.cases]
    return sorted(cases, key=lambda c: urgency_key(c, state.now()))


@router.get("/cases/{case_id}")
async def get_case(case_id: str, request: Request) -> dict:
    state = get_state(request)
    c = state.find_case(case_id)
    if not c:
        raise HTTPException(404, f"case not found: {case_id}")
    return _refresh(c, state)


@router.get("/cases/{case_id}/report")
async def get_case_report(
    case_id: str,
    request: Request,
    raw: bool = Query(False, description="Return text/html instead of {html}"),
    download: bool = Query(False, description="Content-Disposition: attachment"),
):
    """FIR-style investigation bundle. Default {html} per the typed contract."""
    state = get_state(request)
    c = state.find_case(case_id)
    if not c:
        raise HTTPException(404, f"case not found: {case_id}")
    doc = report_document(state, c)
    if raw or download:
        headers = {}
        if download:
            headers["Content-Disposition"] = f'attachment; filename="OVI-Report-{case_id}.html"'
        from fastapi.responses import HTMLResponse

        return HTMLResponse(doc, headers=headers)
    return {"html": doc}


@router.get("/alerts")
async def list_alerts(request: Request) -> list[dict]:
    return get_state(request).alerts


@router.post("/complaints", status_code=201)
async def post_complaint(body: ComplaintIn, request: Request) -> dict:
    """Ingest an NCRP complaint through the full pipeline; returns the Case."""
    state = get_state(request)
    try:
        return file_complaint(state, body.model_dump())
    except ValueError as e:
        raise HTTPException(422, str(e)) from e


@router.post("/freeze/{tok}/transmit")
async def post_freeze_transmit(tok: str, request: Request) -> dict:
    """Queue a CFCFRMS freeze request for a tokenized mule account."""
    engine = request.app.state.ovi_engine
    out = engine.transmit_freeze(tok)
    if out is None:
        raise HTTPException(404, f"tokenized account not found: {tok}")
    return out


# ---- extras (console swap-in support) -----------------------------------
@router.get("/feed")
async def get_feed(request: Request, limit: int = Query(70, ge=1, le=200)) -> list[dict]:
    return get_state(request).feed[:limit]


@router.get("/state")
async def get_state_snapshot(request: Request) -> dict:
    """Headline KPIs + freeze queue for the Overview / Freeze pages."""
    state = get_state(request)
    now = state.now()
    queue = [
        {
            "caseId": r["case"]["id"],
            "tok": r["mule"]["tok"],
            "bank": r["mule"]["bank"],
            "p": r["mule"]["p"],
            "expected": mule_bal(r["case"], r["mule"], now) * r["mule"]["p"],
            "status": r["mule"]["status"],
        }
        for r in freeze_rows(state, now)
    ]
    return {
        "t": now,
        "speed": state.speed,
        "kpis": {
            "frozenYTD": state.frozen_ytd,
            "recoveredYTD": state.recovered_ytd,
            "closedCount": state.closed_count,
            "fabric": state.fabric,
            "comp24": state.comp24,
            "dispatched24": state.dispatched24,
            "trend7": state.trend7,
            "atRisk": total_at_risk(state, now),
            "windowsOpen": windows_open(state),
            "unackedAlerts": unacked_alerts(state),
            "spawned": state.spawned,
        },
        "confirmedSeed": state.confirmed_seed,
        "reports": state.reports,
        "freezeQueue": queue,
    }


@router.get("/graph/{case_id}")
async def get_graph(case_id: str, request: Request) -> dict:
    """Tokenized money-trail graph (victim → hops → mules → forecast ATMs)."""
    from ..domain.graph import build_graph

    state = get_state(request)
    c = state.find_case(case_id)
    if not c:
        raise HTTPException(404, f"case not found: {case_id}")
    return build_graph(c)


@router.post("/cases/{case_id}/anchor")
async def post_anchor(case_id: str, request: Request) -> dict:
    """Anchor the investigation report to the (simulated) Fabric evidence channel."""
    engine = request.app.state.ovi_engine
    rec = engine.anchor_report(case_id)
    if rec is None:
        raise HTTPException(404, f"case not found: {case_id}")
    return rec


@router.post("/alerts/{index}/redispatch")
async def post_redispatch(index: int, request: Request) -> dict:
    engine = request.app.state.ovi_engine
    out = engine.re_dispatch(index)
    if out is None:
        raise HTTPException(404, f"alert index out of range: {index}")
    return out


@router.get("/speed")
async def get_speed(request: Request) -> dict:
    state = get_state(request)
    return {"speed": state.speed}


@router.post("/speed")
async def post_speed(body: SpeedIn, request: Request) -> dict:
    state = get_state(request)
    state.speed = body.speed
    return {"speed": state.speed}


@router.get("/health")
async def health(request: Request) -> dict:
    state = get_state(request)
    return {"ok": True, "t": state.now(), "simMs": state.sim_ms, "speed": state.speed, "cases": len(state.cases)}


# ---- websocket ----------------------------------------------------------
@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    hub = ws.app.state.ovi_hub
    await hub.connect(ws)
    try:
        while True:
            # client keepalive pings; server pushes feed/state frames
            await ws.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(ws)
