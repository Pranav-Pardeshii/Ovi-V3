import type { Case, CaseState, Mule, Tier } from '../types';
import { RAILN } from '../data/constants';
import { clamp, shortCd } from '../lib/format';
import { useStore } from '../store/useStore';

export const nowMs = () => useStore.getState().base + useStore.getState().simMs;

export const elapsedSec = (c: Case, at = nowMs()) => (at - c.depositAt) / 1000;
export const countMed = (c: Case, at = nowMs()) => c.p50 - elapsedSec(c, at);

export function caseState(c: Case, at = nowMs()): CaseState {
  if (c.tier === 'T4') return 'watch';
  const e = elapsedSec(c, at);
  return e < c.p10 ? 'pre' : e <= c.p90 ? 'win' : 'elapsed';
}

const STATERANK: Record<CaseState, number> = { win: 0, pre: 1, watch: 2, elapsed: 3 };
export function urgency(a: Case, b: Case) {
  return STATERANK[a._st] - STATERANK[b._st] || countMed(a) - countMed(b);
}

/** Live mule balance — decays toward 0 across the cashout window. */
export function muleBal(c: Case, m: Mule, at = nowMs()) {
  if (m.frozen) return m.frozenAmt;
  const d = clamp(elapsedSec(c, at) / c.p90, 0, 1);
  return Math.max(0, c.amount * m.alloc * (1 - 0.8 * Math.pow(d, m.k)));
}

export const atRisk = (c: Case, at = nowMs()) => c.mules.reduce((s, m) => s + muleBal(c, m, at), 0);
export const totalAtRisk = (at = nowMs()) => useStore.getState().cases.reduce((s, c) => s + atRisk(c, at), 0);

export function shortTarget(c: Case) {
  if (c.tier === 'T1') return 'ATM ' + c.atms[0].id + ' · ' + c.atms[0].loc;
  if (c.tier === 'T2') return c.zone!.name + ' district ring · ' + c.zone!.r + 'km';
  if (c.tier === 'T3') {
    const t = (Object.entries(c.channel) as [keyof typeof c.channel, number][]).sort((a, b) => b[1] - a[1])[0];
    return RAILN[t[0]] + ' rail · ' + t[1] + '%';
  }
  return 'watchlist — no forecast';
}

export function winLabel(c: Case, at = nowMs()) {
  if (c.tier === 'T4') return '—';
  const e = elapsedSec(c, at);
  return e < c.p10 ? 'OPENS ' + shortCd(c.p10 - e) : e <= c.p90 ? 'CLOSES ' + shortCd(c.p90 - e) : 'ELAPSED';
}

export function selCaseC() {
  const s = useStore.getState();
  return s.cases.find((c) => c.id === s.selCase) || [...s.cases].sort(urgency)[0];
}

export interface MuleRef {
  c: Case;
  m: Mule;
}

export const allMules = (): MuleRef[] => {
  const out: MuleRef[] = [];
  useStore.getState().cases.forEach((c) => c.mules.forEach((m) => out.push({ c, m })));
  return out;
};

/** Freeze queue: actionable (T1–T3) mules ranked by expected recoverable. */
export const freezeRows = (): MuleRef[] => {
  const out: MuleRef[] = [];
  useStore.getState().cases.forEach((c) =>
    c.mules.forEach((m) => {
      if (c.tier !== 'T4' && (m.status === 'queue' || m.status === 'sent')) out.push({ c, m });
    }),
  );
  return out.sort((a, b) => muleBal(b.c, b.m) * b.m.p - muleBal(a.c, a.m) * a.m.p);
};

export const windowsOpen = () => useStore.getState().cases.filter((c) => c._st === 'win').length;
export const unackedAlerts = () => useStore.getState().alerts.filter((a) => a.status !== 'acked').length;

export function ago(t: number, at = nowMs()) {
  const s = (at - t) / 1000;
  return s < 60 ? Math.max(1, s | 0) + 's ago' : s < 3600 ? ((s / 60) | 0) + 'm ago' : ((s / 3600) | 0) + 'h ago';
}

export type { Tier };
