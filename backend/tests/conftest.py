"""Shared fixtures: a deterministic app instance without background loops.

The production app (app.main) starts the engine heartbeat and spawn loop in
lifespan. Tests construct the same wiring minus the async loops and drive
Engine.tick() directly for full determinism.
"""

from __future__ import annotations

import random

import pytest
from fastapi import FastAPI

from app.api.routes import router
from app.api.ws import Hub
from app.engine import Engine
from app.state import State


@pytest.fixture()
def app():
    application = FastAPI()
    state = State()
    engine = Engine(state)
    engine.init()
    hub = Hub()
    # same wiring as app.main.lifespan
    state.on_feed = lambda event: hub.broadcast({"type": "feed", "event": event})
    application.state.ovi = state
    application.state.ovi_engine = engine
    application.state.ovi_hub = hub
    application.include_router(router)
    return application


@pytest.fixture()
def state(app):
    return app.state.ovi


@pytest.fixture()
def engine(app):
    return app.state.ovi_engine


@pytest.fixture()
def client(app):
    from fastapi.testclient import TestClient

    return TestClient(app)


@pytest.fixture(autouse=True)
def _seed_rng():
    random.seed(42)
