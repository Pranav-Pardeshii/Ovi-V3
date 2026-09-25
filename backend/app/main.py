"""Ovi-3 FastAPI application.

Run from backend/:
    .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

The Vite dev server proxies /api → localhost:8000 (frontend/vite.config.ts),
so the console needs no CORS in dev. OpenAPI docs at /docs.
"""

from __future__ import annotations

import asyncio
import contextlib
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .api.ws import Hub, snapshot_loop
from .config import CORS_ORIGINS
from .engine import Engine
from .state import State


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    state = State()
    engine = Engine(state)
    hub = Hub()

    state.on_feed = lambda event: hub.broadcast({"type": "feed", "event": event})

    app.state.ovi = state
    app.state.ovi_engine = engine
    app.state.ovi_hub = hub

    snap_task = asyncio.create_task(snapshot_loop(state, hub))
    engine.start()
    try:
        yield
    finally:
        snap_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await snap_task
        await engine.stop()
        await hub.aclose_all()


app = FastAPI(
    title="Ovi-3 — Cashout Interdiction API",
    version="3.4.1",
    description=(
        "Backend for the Ovi-3 interdiction console. Serves the typed contract in "
        "frontend/src/api/endpoints.ts: cases, alerts, complaint ingestion, "
        "CFCFRMS freeze transmission, and FIR-style report bundles. "
        "Demo data is synthetic; the sim clock drives case lifecycle exactly "
        "like the console's built-in engine."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root() -> dict:
    return {"service": "ovi-3", "docs": "/docs", "health": "/api/health"}
