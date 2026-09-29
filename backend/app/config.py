"""Runtime knobs for the Ovi backend.

Defaults mirror the frontend simulation (src/store/useStore.ts) so a
sim-driven UI and a backend-driven UI behave identically. Override via env.
"""

import os

# Sim clock epoch: Date.UTC(2026, 8, 18, 8, 50, 0) — the console's "base".
_BASE_DEFAULT = 1789721400000  # 2026-09-18T08:50:00Z in epoch ms
BASE_MS: int = int(os.getenv("OVI_BASE_MS", str(_BASE_DEFAULT)))

# Engine heartbeat. The frontend ticks at 5 Hz; sim_ms advances dt * speed.
TICK_MS: int = int(os.getenv("OVI_TICK_MS", "200"))
SPEED_DEFAULT: float = float(os.getenv("OVI_SPEED", "20"))

# spawnCase() fires every 95 s of real time (frontend engine.ts), capped.
SPAWN_INTERVAL_S: float = float(os.getenv("OVI_SPAWN_INTERVAL_S", "95"))
MAX_CASES: int = 8

FEED_CAP: int = 70

# CORS — the console dev server plus any deployed frontend origins.
# The Vite proxy makes this moot in dev, but the typed contract
# (frontend/src/api/endpoints.ts) promises it. Deployed frontends are added
# via OVI_CORS_ORIGINS (comma-separated), set in the Render dashboard.
CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *[
        o.strip()
        for o in os.getenv("OVI_CORS_ORIGINS", "").split(",")
        if o.strip()
    ],
]
