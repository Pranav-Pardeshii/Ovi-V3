export type Tier = 'T1' | 'T2' | 'T3' | 'T4';
export type CaseState = 'pre' | 'win' | 'watch' | 'elapsed';
export type RailKey = 'atm' | 'wallet' | 'upi' | 'crypto';

export interface ShapRow {
  l: string;
  v: number;
}

/** Raw mule record as received from a federated bank node. */
export interface MuleSeed {
  bank: string;
  p: number;
  alloc: number;
  ageDays: number;
  dormDays: number;
  kyc: string;
  ds: number;
}

/** Enriched mule: tokenized id + features + SHAP attribution. */
export interface Mule extends MuleSeed {
  tok: string;
  deviceShare: boolean;
  k: number;
  frozen: boolean;
  frozenAmt: number;
  status: 'queue' | 'sent' | 'confirmed';
  sentAt: number;
  feats: Record<string, string>;
  shap: ShapRow[];
}

export interface Atm {
  id: string;
  loc: string;
  bank: string;
  lat: number;
  lng: number;
  comps: number[];
  score: number;
}

export interface Zone {
  name: string;
  lat: number;
  lng: number;
  r: number;
  signal: string;
}

export interface Case {
  id: string;
  depMin: number;
  tier: Tier;
  scam: string;
  amount: number;
  victim: string;
  vBank: string;
  city: string;
  p10: number;
  p50: number;
  p90: number;
  narr: string;
  mules: Mule[];
  atms: Atm[];
  zone?: Zone;
  channel: Record<RailKey, number>;
  note: string;
  depositAt: number;
  filedAt: number;
  short: string;
  /** measured pipeline timings, T+ seconds per PIPE step */
  pt: number[];
  _st: CaseState;
}

export type FeedType = 'complaint' | 'forecast' | 'freeze' | 'alert' | 'window' | 'ledger' | 'system';

export interface FeedEvent {
  t: number;
  type: FeedType;
  html: string;
}

export type AlertCh = 'SMS' | 'EMAIL' | 'API' | 'DASH';

export interface Alert {
  t: number;
  ch: AlertCh;
  to: string;
  tier: Tier;
  msg: string;
  status: 'sent' | 'delivered' | 'acked';
  ack: number | null;
  _acked?: number;
}

export type ToastKind = 'info' | 'ok' | 'crit' | 'warn';

export interface Toast {
  id: number;
  title: string;
  msg: string;
  kind: ToastKind;
}

export type PageKey =
  | 'overview'
  | 'complaint'
  | 'analysis'
  | 'mules'
  | 'cashout'
  | 'freeze'
  | 'alerts'
  | 'drift';

export interface ConfirmedSeed {
  tok: string;
  bank: string;
  amt: number;
  at: number;
  cs: string;
  seed: string;
}

export interface ReportRec {
  hash: string;
  block: number;
  at: number;
}

/** What the right-hand slide-over is currently showing. */
export type Slide =
  | { kind: 'case'; id: string }
  | { kind: 'mule'; tok: string }
  | { kind: 'tier'; tier: Tier }
  | { kind: 'atm'; caseId: string; index: number }
  | { kind: 'rail'; caseId: string }
  | { kind: 'feed' }
  | { kind: 'ledger' }
  | { kind: 'draft'; caseId: string; tok: string }
  | { kind: 'node'; node: import('./sim/graph').GNode; caseId: string }
  | { kind: 'cal' }
  | { kind: 'auc' }
  | { kind: 'psi' }
  | { kind: 'registry' };
