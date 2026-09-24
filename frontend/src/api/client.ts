/**
 * Minimal fetch wrapper for the FastAPI backend.
 *
 * Vite proxies `/api` → http://localhost:8000 in dev (see vite.config.ts),
 * so the default base works out of the box with `uvicorn`. Override with
 * VITE_API_BASE in a .env file if the backend lives elsewhere.
 */
export const API_BASE: string = (import.meta.env?.VITE_API_BASE as string | undefined) ?? '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const apiGet = <T,>(path: string) => request<T>(path);
export const apiPost = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
