import type { Alert, Case } from '../types';
import { apiGet, apiPost } from './client';

/**
 * Typed surface for the future FastAPI backend. The UI currently runs on the
 * local simulation (src/sim/engine.ts + src/store/useStore.ts); when the
 * backend lands, replace the sim-driven reads/writes with these calls:
 *
 *   GET  /cases              → Case[]          (list of active cases)
 *   GET  /cases/{id}         → Case
 *   GET  /alerts             → Alert[]         (dispatch log)
 *   POST /complaints         → Case            (file a test complaint)
 *   POST /freeze/{tok}/transmit                → queue CFCFRMS request
 *   GET  /cases/{id}/report  → { html }        (server-rendered report)
 *
 * Expected FastAPI CORS config: allow http://localhost:5173, or rely on the
 * Vite dev proxy so no CORS is needed at all.
 */
export const backend = {
  cases: () => apiGet<Case[]>('/cases'),
  case: (id: string) => apiGet<Case>(`/cases/${encodeURIComponent(id)}`),
  alerts: () => apiGet<Alert[]>('/alerts'),
  fileComplaint: (payload: { scam: string; amount: number; city: string }) =>
    apiPost<Case>('/complaints', payload),
  transmitFreeze: (tok: string) => apiPost<{ ok: boolean }>(`/freeze/${encodeURIComponent(tok)}/transmit`),
  report: (id: string) => apiGet<{ html: string }>(`/cases/${encodeURIComponent(id)}/report`),
};
