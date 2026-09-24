import type { Case, Mule } from '../types';
import { BANKS } from '../data/constants';
import { hash, mulberry32, hexN } from '../lib/rng';

export type GNodeType = 'victim' | 'hop' | 'mule' | 'atm';

export interface GNode {
  id: string;
  type: GNodeType;
  label?: string;
  tok?: string;
  bank: string;
  p?: number;
  mule?: Mule;
  x: number;
  y: number;
  vx: number;
  vy: number;
  comm: number;
  lit?: boolean;
}

export interface GEdge {
  a: number;
  b: number;
  amount: number;
  seq: number;
  forecast?: boolean;
}

export interface Graph {
  n: GNode[];
  e: GEdge[];
}

/** Deterministic tokenized money-trail graph for a case (victim → hops → mules → forecast ATMs). */
export function buildGraph(c: Case): Graph {
  const r = mulberry32(hash(c.id + 'g'));
  const n: GNode[] = [];
  const e: GEdge[] = [];
  n.push({ id: 'V', type: 'victim', label: 'VICTIM', bank: c.vBank, x: 110, y: 280, vx: 0, vy: 0, comm: 0 });
  n.push({ id: 'H1', type: 'hop', tok: 'TKN-' + hexN(c.id + 'h1', 4), bank: Object.keys(BANKS)[(r() * 8) | 0], x: 340, y: 220, vx: 0, vy: 0, comm: 0 });
  n.push({ id: 'H2', type: 'hop', tok: 'TKN-' + hexN(c.id + 'h2', 4), bank: Object.keys(BANKS)[(r() * 8) | 0], x: 560, y: 320, vx: 0, vy: 0, comm: 0 });
  e.push({ a: 0, b: 1, amount: c.amount, seq: 0 }, { a: 1, b: 2, amount: Math.round(c.amount * 0.84), seq: 1 });
  c.mules.forEach((m, i) => {
    n.push({
      id: 'M' + i,
      type: 'mule',
      tok: m.tok,
      bank: m.bank,
      p: m.p,
      mule: m,
      x: 760,
      y: 120 + i * (420 / Math.max(1, c.mules.length - 1)),
      vx: 0,
      vy: 0,
      comm: i % 3 === 2 ? 1 : 0,
    });
    e.push({ a: 2, b: n.length - 1, amount: Math.round(c.amount * m.alloc), seq: 2 + i });
  });
  if (c.tier === 'T1' && c.atms.length) {
    c.atms.slice(0, 2).forEach((a, i) => {
      n.push({ id: 'A' + i, type: 'atm', label: a.id, bank: a.bank, x: 880, y: 200 + i * 150, vx: 0, vy: 0, comm: 0 });
      e.push({ a: 3, b: n.length - 1, amount: Math.round(c.amount * c.mules[0].alloc), seq: 20 + i, forecast: true });
    });
  }
  return { n, e };
}

export function hull(pts: { x: number; y: number }[]) {
  pts = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cr = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: typeof pts = [];
  const up: typeof pts = [];
  for (const p of pts) {
    while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}
