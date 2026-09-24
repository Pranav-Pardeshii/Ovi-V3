import type { Alert, Atm, Case, FeedEvent, Mule, MuleSeed, ShapRow } from '../types';
import { PIPE, Wt } from './constants';
import { hash, mulberry32, hexN } from '../lib/rng';

/** Deterministic ATM record with weighted score. */
export function atm(id: string, loc: string, bank: string, lat: number, lng: number, comps: number[]): Atm {
  return { id, loc, bank, lat, lng, comps, score: comps.reduce((s, c, i) => s + c * Wt[i], 0) };
}

function mkShap(p: number, seed: string): ShapRow[] {
  const r = mulberry32(hash(seed));
  const T: [string, number][] = [
    ['Device sharing', 0.18],
    ['Dormancy→burst', 0.16],
    ['Velocity ratio', 0.13],
    ['In/out degree', 0.11],
    ['Phone mismatch', 0.08],
    ['Beneficiary reuse', 0.06],
    ['Amount deviation', 0.04],
    ['TTF withdrawal', 0.03],
    ['KYC completeness', -0.03],
    ['Account age', -0.05],
  ];
  const raw = T.map((x) => [x[0], x[1] * (0.6 + r() * 0.9)] as [string, number]);
  const s = (p - 0.011) / raw.reduce((a, x) => a + x[1], 0);
  return raw.map((x) => ({ l: x[0], v: x[1] * s })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

/** Attach tokenized identity + features + SHAP to a raw federated mule record. */
export function finMule(c: Pick<Case, 'id'>, m: MuleSeed, i: number): Mule {
  const seed = c.id + '#m' + i;
  const r = mulberry32(hash(seed));
  return {
    ...m,
    tok: 'TKN-' + hexN(seed + 'a', 4) + '-' + hexN(seed + 'b', 4),
    deviceShare: !!m.ds,
    k: 0.5 + r() * 0.8,
    frozen: false,
    frozenAmt: 0,
    status: 'queue',
    sentAt: 0,
    feats: {
      'Account age': m.ageDays + 'd',
      'In/out degree': (0.9 + r() * 2.1).toFixed(1),
      'Velocity ratio': (2.2 + r() * 2.8).toFixed(1) + '×',
      Dormancy: m.dormDays + 'd',
      'Beneficiary reuse': (0.3 + r() * 0.4).toFixed(2),
      KYC: m.kyc,
      'Device sharing': m.ds ? 'shared ×3' : 'none',
      'Phone mismatch': 'Δ ' + ((120 + r() * 900) | 0) + ' km',
      'Amount deviation': '+' + ((8 + r() * 14) | 0) + 'σ',
      'TTF withdrawal': '< ' + ((60 + r() * 120) | 0) + ' s',
    },
    shap: mkShap(m.p, seed),
  };
}

/** Normalize a case literal: pipeline timings, timestamps, per-mule enrichment. */
export function finCase(o: Omit<Case, 'pt' | 'depositAt' | 'filedAt' | 'short' | '_st' | 'atms' | 'mules'> & { atms?: Atm[], mules: MuleSeed[] }, now: number): Case {
  const r = mulberry32(hash(o.id));
  let prev = 0;
  const pt = PIPE.map((p, i) => {
    const v = i === 0 ? 0 : p[2] + (r() * 0.8 - 0.25);
    const vv = Math.max(prev + 0.1, v);
    prev = vv;
    return +vv.toFixed(1);
  });
  const c: Case = {
    ...(o as unknown as Omit<Case, 'pt' | 'depositAt' | 'filedAt' | 'short' | '_st'>),
    atms: o.atms ?? [],
    pt,
    depositAt: now - o.depMin * 60000,
    filedAt: now - o.depMin * 60000 + 180000,
    short: o.id.slice(-4),
    _st: 'watch',
  };
  c.mules = o.mules.map((m, i) => finMule(c, m, i));
  return c;
}

export interface Seed {
  cases: Case[];
  feed: FeedEvent[];
  alerts: Alert[];
  selCase: string;
}

/** The six opening cases + feed backlog + dispatch log, deterministic from base time. */
export function buildSeed(base: number): Seed {
  const cases: Case[] = [
    finCase(
      {
        id: 'NCRP-2026-0918-4471',
        depMin: 22,
        tier: 'T1',
        scam: 'Digital Arrest',
        amount: 1850000,
        victim: 'V. KRISHNAN ·●●●',
        vBank: 'HDFC',
        city: 'Bengaluru',
        p10: 26,
        p50: 118,
        p90: 250,
        narr: 'Caller posed as “Mumbai Cyber Crime” — claimed the victim’s Aadhaar was linked to a laundering case. Kept on live video for 3 hours; 14 tranches sent to an “RBI verification account”.',
        mules: [
          { bank: 'SBI', p: 0.94, alloc: 0.58, ageDays: 12, dormDays: 94, kyc: 'Minimal', ds: 1 },
          { bank: 'ICICI', p: 0.88, alloc: 0.21, ageDays: 26, dormDays: 141, kyc: 'Full', ds: 1 },
          { bank: 'AXIS', p: 0.76, alloc: 0.13, ageDays: 210, dormDays: 12, kyc: 'Full', ds: 0 },
          { bank: 'PNB', p: 0.61, alloc: 0.08, ageDays: 480, dormDays: 30, kyc: 'Pending', ds: 0 },
        ],
        atms: [
          atm('ATM-SBI-BLR-0873', 'MG Road', 'SBI', 12.975, 77.6068, [0.92, 0.9, 0.74, 0.66, 0.78]),
          atm('ATM-AXIS-BLR-0211', 'Koramangala 80ft Rd', 'AXIS', 12.9358, 77.624, [0.74, 0.79, 0.66, 0.71, 0.66]),
          atm('ATM-HDFC-BLR-0146', 'Indiranagar 100ft Rd', 'HDFC', 12.9714, 77.6409, [0.61, 0.68, 0.58, 0.63, 0.62]),
          atm('ATM-ICIC-BLR-0329', 'Jayanagar 4th Block', 'ICICI', 12.925, 77.59, [0.48, 0.55, 0.5, 0.52, 0.55]),
          atm('ATM-PNB-BLR-0058', 'Rajajinagar', 'PNB', 12.99, 77.553, [0.4, 0.46, 0.42, 0.44, 0.5]),
        ],
        channel: { atm: 62, wallet: 22, upi: 16, crypto: 0 },
        note: 'Debit card active on lead mule — <b>ATM is the primary rail</b>; wallet fallback expected if the card gets blocked mid-window.',
      },
      base,
    ),
    finCase(
      {
        id: 'NCRP-2026-0918-4468',
        depMin: 52,
        tier: 'T1',
        scam: 'Investment / Trading',
        amount: 920000,
        victim: 'S. AGARWAL ·●●●',
        vBank: 'ICICI',
        city: 'New Delhi',
        p10: 8,
        p50: 95,
        p90: 210,
        narr: 'Fake trading app “FinnEdge Pro” showed 3% daily returns on a rigged dashboard. Retirement savings moved across 9 UPI tranches.',
        mules: [
          { bank: 'SBI', p: 0.91, alloc: 0.56, ageDays: 8, dormDays: 60, kyc: 'Minimal', ds: 1 },
          { bank: 'HDFC', p: 0.84, alloc: 0.24, ageDays: 34, dormDays: 120, kyc: 'Full', ds: 1 },
          { bank: 'AXIS', p: 0.68, alloc: 0.2, ageDays: 150, dormDays: 25, kyc: 'Full', ds: 0 },
        ],
        atms: [
          atm('ATM-HDFC-DEL-0421', 'Connaught Place', 'HDFC', 28.6315, 77.2167, [0.88, 0.86, 0.72, 0.71, 0.74]),
          atm('ATM-SBI-DEL-0954', 'Karol Bagh', 'SBI', 28.6515, 77.1905, [0.72, 0.78, 0.66, 0.62, 0.7]),
          atm('ATM-AXIS-DEL-0187', 'Rajouri Garden', 'AXIS', 28.6428, 77.1207, [0.61, 0.66, 0.58, 0.55, 0.62]),
          atm('ATM-ICIC-DEL-0703', 'Nehru Place', 'ICICI', 28.5483, 77.2515, [0.5, 0.55, 0.5, 0.48, 0.55]),
          atm('ATM-PNB-DEL-0341', 'Lajpat Nagar', 'PNB', 28.5677, 77.2432, [0.42, 0.47, 0.44, 0.42, 0.5]),
        ],
        channel: { atm: 58, wallet: 20, upi: 18, crypto: 4 },
        note: 'Window already open — balances decaying. <b>Freeze confirmations are racing the cashout.</b>',
      },
      base,
    ),
    finCase(
      {
        id: 'NCRP-2026-0918-4462',
        depMin: 12,
        tier: 'T2',
        scam: 'Task-based (ROM)',
        amount: 185000,
        victim: 'M. SHAIKH ·●●●',
        vBank: 'SBI',
        city: 'Thane',
        p10: 40,
        p50: 150,
        p90: 330,
        narr: 'Telegram “part-time likes” job — prepaid task wallet. Payments cycled repeatedly to “unlock” commissions that never arrived.',
        mules: [
          { bank: 'BOB', p: 0.82, alloc: 0.55, ageDays: 45, dormDays: 88, kyc: 'Minimal', ds: 1 },
          { bank: 'SBI', p: 0.74, alloc: 0.27, ageDays: 120, dormDays: 40, kyc: 'Full', ds: 0 },
          { bank: 'ICICI', p: 0.66, alloc: 0.18, ageDays: 300, dormDays: 15, kyc: 'Full', ds: 0 },
        ],
        zone: { name: 'Jaipur', lat: 26.9124, lng: 75.7873, r: 24, signal: 'KYC cluster — 3 mule accounts registered within 6 km' },
        channel: { atm: 18, wallet: 44, upi: 34, crypto: 4 },
        note: 'Victim in Thane, mule KYC cluster in Jaipur — <b>geography follows the mule, not the victim.</b>',
      },
      base,
    ),
    finCase(
      {
        id: 'NCRP-2026-0918-4455',
        depMin: 6,
        tier: 'T3',
        scam: 'Fake Customer Care',
        amount: 74000,
        victim: 'P. NAIR ·●●●',
        vBank: 'AXIS',
        city: 'Kochi',
        p10: 15,
        p50: 80,
        p90: 170,
        narr: 'Customer-care number served via search ad. OTP shared for a “card replacement”; two IMPS tranches inside 4 minutes.',
        mules: [
          { bank: 'YES', p: 0.71, alloc: 0.7, ageDays: 4, dormDays: 2, kyc: 'Pending', ds: 1 },
          { bank: 'KOTAK', p: 0.62, alloc: 0.3, ageDays: 6, dormDays: 3, kyc: 'Minimal', ds: 1 },
        ],
        channel: { atm: 0, wallet: 68, upi: 24, crypto: 8 },
        note: 'Lead mule account age <b>4 days — no debit card issued</b>. Chasing the <b>wallet rail, not the ATM</b>; cashout via agent cash-in network.',
      },
      base,
    ),
    finCase(
      {
        id: 'NCRP-2026-0918-4450',
        depMin: 30,
        tier: 'T4',
        scam: 'Loan App',
        amount: 36000,
        victim: 'A. KAUR ·●●●',
        vBank: 'PNB',
        city: 'Chandigarh',
        p10: 60,
        p50: 240,
        p90: 480,
        narr: 'Instant-loan app harassment — “processing fee” deductions followed by contact-list threats.',
        mules: [
          { bank: 'PNB', p: 0.54, alloc: 0.6, ageDays: 600, dormDays: 20, kyc: 'Full', ds: 0 },
          { bank: 'KOTAK', p: 0.49, alloc: 0.4, ageDays: 380, dormDays: 45, kyc: 'Full', ds: 0 },
        ],
        channel: { atm: 22, wallet: 30, upi: 40, crypto: 8 },
        note: 'Insufficient graph signal beyond “account exists”. <b>Watchlist mode — no geographic forecast will be issued.</b>',
      },
      base,
    ),
    finCase(
      {
        id: 'NCRP-2026-0918-4446',
        depMin: 9,
        tier: 'T2',
        scam: 'Investment / Trading',
        amount: 460000,
        victim: 'R. YADAV ·●●●',
        vBank: 'BOB',
        city: 'Kanpur',
        p10: 30,
        p50: 120,
        p90: 260,
        narr: 'WhatsApp “SEBI-registered advisor” group. IPO allotment “guaranteed” against upfront margin payments.',
        mules: [
          { bank: 'BOB', p: 0.87, alloc: 0.52, ageDays: 18, dormDays: 74, kyc: 'Minimal', ds: 1 },
          { bank: 'SBI', p: 0.79, alloc: 0.28, ageDays: 95, dormDays: 55, kyc: 'Full', ds: 0 },
          { bank: 'HDFC', p: 0.64, alloc: 0.2, ageDays: 260, dormDays: 18, kyc: 'Full', ds: 0 },
        ],
        zone: { name: 'Lucknow', lat: 26.8467, lng: 80.9462, r: 18, signal: 'Branch + phone-circle overlap — 2 mules onboarded via same KYC agent' },
        channel: { atm: 26, wallet: 38, upi: 30, crypto: 6 },
        note: 'District ring issued on KYC + phone-circle evidence. Patrol coordination advised with <b>Lucknow City Cyber</b>.',
      },
      base,
    ),
  ];

  const feed: FeedEvent[] = (
    [
      ['ledger', 2, 'Block <b>#4,721,884</b> committed · evidence channel'],
      ['freeze', 4, 'CFCFRMS confirmed · TKN-88C1-2D04 · <b>₹2,20,000 secured</b> · NCRP-…4391'],
      ['alert', 6, 'LEA ack 42s · Cyber PS Bengaluru · Tier-1 ATM dispatch'],
      ['system', 9, 'Federated round #211 complete · 24/24 banks · DP ε=0.81'],
      ['forecast', 13, 'Tier-1 forecast issued · <b>NCRP-…4471</b> · ATM-SBI-BLR-0873 · 11.2s'],
      ['complaint', 14, 'NCRP complaint · Digital Arrest · <b>₹18.5 L</b> · Bengaluru'],
      ['forecast', 26, 'Tier-1 forecast issued · <b>NCRP-…4468</b> · ATM-HDFC-DEL-0421 · 9.8s'],
      ['complaint', 27, 'NCRP complaint · Investment scam · <b>₹9.2 L</b> · New Delhi'],
      ['system', 38, 'Chakravyuh-Bench eval pass · hit@1 0.74 · calibration error 2.1%'],
      ['forecast', 44, 'Tier-2 zone forecast · <b>NCRP-…4446</b> · Lucknow ring 18km'],
    ] as [FeedEvent['type'], number, string][]
  ).map((f) => ({ t: base - f[1] * 60000, type: f[0], html: f[2] }));

  const A = (m: number, ch: Alert['ch'], to: string, tier: Alert['tier'], msg: string, status: Alert['status'], ack: number | null): Alert => ({
    t: base - m * 60000,
    ch,
    to,
    tier,
    msg,
    status,
    ack,
  });

  const alerts: Alert[] = [
    A(1, 'SMS', 'Cyber PS Bengaluru · 96xxx21', 'T1', 'Tier-1 forecast ATM-SBI-BLR-0873 · window 14:46–16:30 IST · deploy field team · CCTV pull code OV3-4471', 'acked', 42),
    A(3, 'API', 'SBI Fraud Desk · FL node', 'T1', 'Score ping TKN-7F3A-C210 · P(mule) 0.94 · freeze request queued', 'acked', 8),
    A(5, 'API', 'HDFC ATM Ops · DEL region', 'T1', 'Watchlist push ATM-HDFC-DEL-0421 · ranked #1 · window 15:04–17:32', 'acked', 11),
    A(8, 'EMAIL', 'nodal.cyber@icici · risk desk', 'T2', 'Zone forecast Lucknow 18km · 3 tokenized accounts · patrol coordination advised', 'acked', 96),
    A(12, 'SMS', 'SP Cyber · Jaipur', 'T2', 'Zone ring Jaipur 24km · KYC cluster · window 15:10–18:52 IST', 'delivered', null),
    A(16, 'API', 'YES Bank mule desk', 'T3', 'Rail-mix alert · wallet 68% · agent-network cashout expected', 'acked', 23),
    A(21, 'EMAIL', 'LEA coordinator · Kochi', 'T3', 'Wallet rail focus — no debit card on account · monitor agent top-ups', 'acked', 188),
    A(26, 'API', 'PNB fraud analytics', 'T4', 'Watchlist enrollment · insufficient signal · no forecast issued', 'sent', null),
    A(31, 'SMS', 'Cyber PS Lucknow', 'T2', 'Zone forecast Lucknow · window 14:59–17:49 IST', 'acked', 64),
    A(38, 'DASH', 'Investigator desk · 4 active', 'T1', 'Dashboard push · 4 interdiction clocks running', 'acked', 3),
    A(44, 'API', 'BOB Fraud Desk', 'T2', 'Score ping TKN-5C11-8820 · P(mule) 0.87 · freeze queued', 'acked', 9),
    A(52, 'SMS', 'Cyber PS New Delhi', 'T1', 'Tier-1 forecast ATM-HDFC-DEL-0421 · team dispatch ETA 11m', 'acked', 51),
  ];

  const selCase = [...cases].sort((a, b) => urgencyOf(a, base) - urgencyOf(b, base))[0].id;

  return { cases, feed, alerts, selCase };
}

const STATERANK: Record<string, number> = { win: 0, pre: 1, watch: 2, elapsed: 3 };
function urgencyOf(c: Case, at: number) {
  const rank = STATERANK[caseStateAt(c, at)];
  const med = c.p50 - (at - c.depositAt) / 1000;
  return rank * 1e9 + med;
}
function caseStateAt(c: Case, at: number): Case['_st'] {
  if (c.tier === 'T4') return 'watch';
  const e = (at - c.depositAt) / 1000;
  return e < c.p10 ? 'pre' : e <= c.p90 ? 'win' : 'elapsed';
}
