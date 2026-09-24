import { useStore } from '../store/useStore';

let started = false;

/**
 * Drives the simulated clock: 5 Hz tick, scaled by the selected speed
 * multiplier. In production this loop is replaced by FastAPI
 * WebSocket/SSE pushes — see src/api/endpoints.ts.
 */
export function startEngine() {
  if (started) return;
  started = true;
  let lastT = performance.now();
  setInterval(() => {
    const t = performance.now();
    const dt = t - lastT;
    lastT = t;
    useStore.getState().tick(dt);
  }, 200);
  setInterval(() => {
    useStore.getState().spawnCase();
  }, 95000);
}
