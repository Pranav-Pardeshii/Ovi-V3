import { create } from 'zustand';
import type {
  Alert,
  Case,
  ConfirmedSeed,
  FeedEvent,
  FeedType,
  Mule,
  MuleSeed,
  PageKey,
  ReportRec,
  Slide,
  Toast,
  ToastKind,
  Tier,
} from '../types';
import { buildSeed, finCase } from '../data/build';
import { BANKS, CITIES, SCAMS, STREETS } from '../data/constants';
import { INR, INRc, clamp, msFmt } from '../lib/format';
import { hexN, weightedPick } from '../lib/rng';
import { atm } from '../data/build';
import { caseState, countMed, muleBal, shortTarget } from '../sim/selectors';

export interface SchedItem {
  at: number;
  fn: () => void;
}

interface Store {
  // clock / simulation
  page: PageKey;
  speed: number;
  simMs: number;
  base: number;
  tickId: number;
  liveSeq: number;

  // domain state
  cases: Case[];
  feed: FeedEvent[];
  alerts: Alert[];
  sched: SchedItem[];
  confirmedSeed: ConfirmedSeed[];
  nextId: number;
  spawned: number;
  reports: Record<string, ReportRec>;
  frozenYTD: number;
  frozen0: number;
  recoveredYTD: number;
  recovered0: number;
  closedCount: number;
  fabric: number;
  blkAt: number;
  comp24: number;
  dispatched24: number;
  trend7: number[];
  selCase: string | null;
  selAtm: number;

  // ui state
  toasts: Toast[];
  slide: Slide | null;
  reportCase: string | null;

  // actions
  init: () => void;
  now: () => number;
  goto: (page: PageKey) => void;
  setSpeed: (sp: number) => void;
  tick: (dt: number) => void;
  schedule: (delaySec: number, fn: () => void) => void;
  toast: (title: string, msg: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
  pushFeed: (type: FeedType, html: string) => void;
  openSlide: (slide: Slide) => void;
  closeSlide: () => void;
  openReport: (id: string) => void;
  closeReport: () => void;
  anchorReport: (id: string) => void;
  selectCase: (id: string) => void;
  selectAtm: (i: number) => void;
  copyHash: (h: string) => void;
  flashLive: () => void;
  closeCase: (id: string) => void;
  confirmFreeze: (caseId: string, tok: string) => void;
  transmitFreeze: (caseId: string, tok: string) => void;
  spawnCase: () => void;
  reDispatch: (index: number) => void;
}

let toastSeq = 0;

export const useStore = create<Store>()((set, get) => ({
  page: 'overview',
  speed: 20,
  simMs: 0,
  base: Date.UTC(2026, 8, 18, 8, 50, 0),
  tickId: 0,
  liveSeq: 0,

  cases: [],
  feed: [],
  alerts: [],
  sched: [],
  confirmedSeed: [],
  nextId: 4472,
  spawned: 0,
  reports: {},
  frozenYTD: 1530000,
  frozen0: 1530000,
  recoveredYTD: 42300000,
  recovered0: 42300000,
  closedCount: 14,
  fabric: 4721903,
  blkAt: 120000,
  comp24: 286,
  dispatched24: 128,
  trend7: [212, 241, 228, 263, 255, 281, 286],
  selCase: null,
  selAtm: 0,

  toasts: [],
  slide: null,
  reportCase: null,

  init() {
    const base = get().base;
    const seed = buildSeed(base);
    set({
      cases: seed.cases,
      feed: seed.feed,
      alerts: seed.alerts,
      selCase: seed.selCase,
      confirmedSeed: [
        { tok: 'TKN-88C1-2D04', bank: 'HDFC', amt: 220000, at: base - 9 * 60000, cs: '…4391', seed: 'cf1' },
        { tok: 'TKN-31D7-9A02', bank: 'ICICI', amt: 145000, at: base - 31 * 60000, cs: '…4382', seed: 'cf2' },
      ],
    });
    const c2 = seed.cases.find((c) => c.id === 'NCRP-2026-0918-4468')!;
    get().schedule(15 * 60, () => get().confirmFreeze(c2.id, c2.mules[0].tok));
    get().schedule(4 * 60, () => get().pushFeed('system', 'Federated round #212 complete · 24/24 banks · secure aggregation OK'));
    setTimeout(
      () =>
        get().toast(
          'OVI-3 ONLINE',
          '6 cases loaded · a Tier-1 window opens within minutes. Click any case → GENERATE REPORT for the FIR-style bundle.',
          'info',
        ),
      1200,
    );
  },

  now: () => get().base + get().simMs,

  goto: (page) => {
    if (get().page === page) return;
    set({ page, slide: null });
  },

  setSpeed: (sp) => {
    set({ speed: sp });
    get().toast('SIM SPEED ' + sp + '×', 'Demo clock now runs at ' + sp + '× real time.', 'info');
  },

  schedule(delaySec, fn) {
    const s = get();
    const item: SchedItem = { at: s.base + s.simMs + delaySec * 1000, fn };
    set({ sched: [...s.sched, item].sort((a, b) => a.at - b.at) });
  },

  toast(title, msg, kind = 'info') {
    const id = ++toastSeq;
    const t: Toast = { id, title, msg, kind };
    set((s) => ({ toasts: [t, ...s.toasts].slice(0, 4) }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 6400);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  pushFeed(type, html) {
    const e: FeedEvent = { t: get().base + get().simMs, type, html };
    set((s) => ({ feed: [e, ...s.feed].slice(0, 70) }));
  },

  openSlide: (slide) => set({ slide }),
  closeSlide: () => set({ slide: null }),
  openReport: (id) => set({ reportCase: id, slide: null }),
  closeReport: () => set({ reportCase: null }),

  anchorReport(id) {
    const s = get();
    const c = s.cases.find((x) => x.id === id);
    if (!c) return;
    const rh = '0x' + hexN(c.id + '|rep|' + s.now(), 20);
    set({ reports: { ...s.reports, [id]: { hash: rh, block: s.fabric, at: s.now() } } });
    get().pushFeed('ledger', 'Investigation report anchored · ' + c.short + ' · block <b>#' + s.fabric.toLocaleString('en-IN') + '</b> · evidence channel');
    get().toast('REPORT ANCHORED', rh.slice(0, 18) + '… committed to the Fabric evidence channel · block #' + s.fabric.toLocaleString('en-IN'), 'ok');
  },

  selectCase: (id) => set({ selCase: id, selAtm: 0 }),
  selectAtm: (i) => set({ selAtm: i }),

  copyHash: (h) => {
    try {
      navigator.clipboard.writeText(h);
    } catch {
      /* clipboard unavailable */
    }
    get().toast('HASH COPIED', 'Full digest (' + h.length + ' hex chars) lives on the Fabric evidence channel.', 'ok');
  },

  flashLive: () => set((s) => ({ liveSeq: s.liveSeq + 1 })),

  tick(dt) {
    const s = get();
    s.simMs += dt * s.speed;
    const n = s.base + s.simMs;

    // due scheduled events
    while (s.sched.length && s.sched[0].at <= n) {
      const it = s.sched.shift()!;
      it.fn();
    }

    // fabric block commits
    if (s.simMs >= s.blkAt) {
      s.fabric++;
      s.blkAt += 120000;
      if (Math.random() < 0.15)
        get().pushFeed('ledger', 'Block <b>#' + s.fabric.toLocaleString('en-IN') + '</b> committed · audit channel');
    }

    // case lifecycle: pre → win → elapsed → closed
    for (const c of s.cases) {
      const st = caseState(c, n);
      if (st === c._st) continue;
      const prev = c._st;
      c._st = st;
      if (prev === 'pre' && st === 'win') {
        get().toast('CASHOUT WINDOW OPEN', c.id + ' · ' + shortTarget(c) + ' · median in ' + msFmt(countMed(c, n)), 'crit');
        get().pushFeed('window', 'Window <b>OPEN</b> · ' + c.short + ' · ' + shortTarget(c));
        get().flashLive();
      } else if (prev === 'win' && st === 'elapsed') {
        get().toast(
          'WINDOW ELAPSED',
          c.id + ' — interdiction window closed. Review freeze response and evidence bundle.',
          'warn',
        );
        get().pushFeed('window', 'Window elapsed · ' + c.short);
        get().schedule(25 * 60, () => get().closeCase(c.id));
      }
    }

    // alert delivery progression
    s.alerts.forEach((a) => {
      if (a.status === 'sent' && n - a.t > 40000) a.status = 'delivered';
      if (a.status === 'delivered' && n - a.t > 140000 && !a._acked) {
        a._acked = 1;
        a.status = 'acked';
        a.ack = (54 + Math.random() * 80) | 0;
        get().pushFeed('alert', 'LEA ack ' + a.ack + 's · ' + a.to);
      }
    });

    set({ tickId: s.tickId + 1 });
  },

  closeCase(id) {
    const s = get();
    const i = s.cases.findIndex((c) => c.id === id);
    if (i < 0) return;
    const c = s.cases[i];
    const F = c.mules.filter((m) => m.frozen).reduce((a, m) => a + m.frozenAmt, 0);
    const rec = Math.round(F * 0.92);
    get().pushFeed('system', 'Case closed · ' + c.short + ' · recovered <b>' + INRc(rec) + '</b> of ' + INRc(c.amount));
    if (rec > 0) get().toast('CASE CLOSED', c.short + ' · recovered ' + INRc(rec) + ' of ' + INRc(c.amount), 'ok');
    else get().toast('CASE CLOSED', c.short + ' · ₹0 recovered — funds dissipated before freeze could land.', 'warn');
    set({
      cases: s.cases.filter((x) => x.id !== id),
      recoveredYTD: s.recoveredYTD + rec,
      closedCount: s.closedCount + 1,
      selCase: s.selCase === id ? null : s.selCase,
    });
  },

  confirmFreeze(caseId, tok) {
    const s = get();
    const c = s.cases.find((x) => x.id === caseId);
    if (!c) return;
    const m = c.mules.find((x) => x.tok === tok);
    if (!m || m.frozen) return;
    m.frozen = true;
    m.frozenAmt = muleBal(c, m, s.now());
    m.status = 'confirmed';
    if (!m.sentAt) m.sentAt = s.now();
    set({ frozenYTD: s.frozenYTD + m.frozenAmt });
    get().pushFeed('freeze', 'CFCFRMS confirmed · <b>' + m.tok + '</b> · <b>' + INRc(m.frozenAmt) + ' secured</b> · ' + c.id);
    get().toast(
      'FREEZE CONFIRMED',
      m.bank + ' secured ' + INRc(m.frozenAmt) + ' on ' + m.tok + ' · evidence anchored to block #' + s.fabric.toLocaleString('en-IN'),
      'ok',
    );
  },

  transmitFreeze(caseId, tok) {
    const s = get();
    const c = s.cases.find((x) => x.id === caseId);
    if (!c) return;
    const m = c.mules.find((x) => x.tok === tok);
    if (!m) return;
    m.status = 'sent';
    m.sentAt = s.now();
    get().toast('CFCFRMS REQUEST TRANSMITTED', m.tok + ' · ' + m.bank + ' · SLA 15:00 · hash anchored on evidence channel');
    get().pushFeed('freeze', 'Request transmitted · ' + m.tok + ' · ' + m.bank + ' · SLA 15:00');
    get().schedule((7 + Math.random() * 5) * 60, () => get().confirmFreeze(caseId, tok));
    set({ slide: null });
  },

  spawnCase() {
    const s = get();
    if (s.cases.length >= 8) return;
    const r = Math.random;
    const cityKeys = Object.keys(CITIES);
    const city = cityKeys[(r() * cityKeys.length) | 0];
    const ll = CITIES[city];
    const scam = weightedPick(SCAMS);
    const tier = weightedPick([
      ['T1', 0.42],
      ['T2', 0.3],
      ['T3', 0.16],
      ['T4', 0.12],
    ]) as Tier;
    const amounts: Record<string, [number, number]> = {
      'Digital Arrest': [400000, 2500000],
      'Investment / Trading': [200000, 1600000],
      'Task-based (ROM)': [40000, 220000],
      'Fake Customer Care': [20000, 120000],
      'Loan App': [15000, 80000],
    };
    const amount = Math.round((amounts[scam][0] + r() * (amounts[scam][1] - amounts[scam][0])) / 1000) * 1000;
    const id = 'NCRP-2026-0918-' + s.nextId;
    const banks = Object.keys(BANKS);
    const allocs = [
      [0.58, 0.21, 0.13, 0.08],
      [0.62, 0.24, 0.14],
      [0.7, 0.3],
    ];
    const nM = 2 + ((r() * 2) | 0);
    const al = allocs[3 - nM] || allocs[2];
    const mules: MuleSeed[] = [];
    for (let i = 0; i < nM; i++) {
      const p = clamp(0.5 + r() * 0.45, 0.4, 0.97);
      mules.push({
        bank: banks[(r() * banks.length) | 0],
        p: +p.toFixed(2),
        alloc: al[i],
        ageDays: r() < 0.5 ? (3 + r() * 40) | 0 : (80 + r() * 600) | 0,
        dormDays: (r() * 160) | 0,
        kyc: r() < 0.4 ? 'Minimal' : 'Full',
        ds: r() < 0.6 ? 1 : 0,
      });
    }
    const now = s.now();
    const draft: Omit<Case, 'pt' | 'depositAt' | 'filedAt' | 'short' | '_st' | 'mules'> & { mules: MuleSeed[] } = {
      id,
      depMin: 0,
      tier,
      scam,
      amount,
      victim: '— ·●●●',
      vBank: banks[(r() * banks.length) | 0],
      city,
      p10: 8 + ((r() * 24) | 0),
      p50: 0,
      p90: 0,
      channel: { atm: 0, wallet: 0, upi: 0, crypto: 0 },
      mules,
      atms: [],
      narr: '[Demo-simulated complaint] ' + scam + ' pattern · ' + city + ' · routed through the standard Ovi pipeline.',
      note: '',
    };
    draft.p50 = Math.round(draft.p10 * (2.4 + r() * 1.2));
    draft.p90 = Math.round(draft.p50 * (1.8 + r() * 0.7));
    if (tier === 'T1') {
      for (let i = 0; i < 5; i++) {
        const comps = [
          clamp(0.9 - i * 0.12 + r() * 0.06, 0.2, 1),
          clamp(0.85 - i * 0.1 + r() * 0.06, 0.2, 1),
          clamp(0.72 - i * 0.08 + r() * 0.06, 0.1, 1),
          clamp(0.68 - i * 0.08 + r() * 0.06, 0.1, 1),
          clamp(0.7 - i * 0.07 + r() * 0.06, 0.1, 1),
        ];
        draft.atms.push(
          atm(
            'ATM-' + banks[(r() * banks.length) | 0].slice(0, 4) + '-' + city.slice(0, 3).toUpperCase() + '-0' + (100 + ((r() * 900) | 0)),
            STREETS[(r() * STREETS.length) | 0],
            banks[(r() * banks.length) | 0],
            ll[0] + (r() - 0.5) * 0.06,
            ll[1] + (r() - 0.5) * 0.06,
            comps,
          ),
        );
      }
    }
    if (tier === 'T2')
      draft.zone = { name: city, lat: ll[0], lng: ll[1], r: 16 + ((r() * 14) | 0), signal: 'KYC / phone-circle cluster confirmed by federated banks' };
    const mix = { T1: [62, 22, 16, 0], T2: [24, 42, 28, 6], T3: [0, 68, 24, 8], T4: [22, 30, 40, 8] }[tier];
    draft.channel = { atm: mix[0], wallet: mix[1], upi: mix[2], crypto: mix[3] };
    draft.note = {
      T1: 'Debit card active — ATM primary rail.',
      T2: 'District ring only — no ATM precision claimed at Tier 2.',
      T3: 'Young account — <b>chasing wallet rail, not ATM</b>.',
      T4: 'Watchlist — no geographic forecast issued.',
    }[tier];

    const c = finCase(draft, now);
    set({
      cases: [...s.cases, c],
      nextId: s.nextId + 1,
      spawned: s.spawned + 1,
      comp24: s.comp24 + 1,
      dispatched24: s.dispatched24 + 1,
      trend7: [...s.trend7.slice(0, 6), s.trend7[6] + 1],
    });
    get().pushFeed('complaint', 'NCRP complaint · ' + scam + ' · <b>' + INRc(amount) + '</b> · ' + city);
    get().toast('NCRP COMPLAINT RECEIVED', id + ' · ' + scam + ' · ' + INRc(amount) + ' · ' + city);
    setTimeout(() => {
      get().pushFeed('forecast', 'Tier-' + tier.slice(1) + ' forecast issued in ' + (9 + r() * 3).toFixed(1) + 's · ' + shortTarget(c));
      get().toast('FORECAST ISSUED', id + ' · ' + shortTarget(c), tier === 'T1' ? 'crit' : tier === 'T2' ? 'warn' : 'info');
    }, 2100);
  },

  reDispatch(i) {
    const s = get();
    const a = s.alerts[i];
    if (!a) return;
    a.status = 'acked';
    a.ack = 18;
    get().toast('RE-DISPATCHED', a.to + ' · delivered via backup gateway · ack 18s', 'ok');
    get().pushFeed('alert', 'Re-dispatch OK · ' + a.to);
    set({ tickId: s.tickId + 1 });
  },
}));

/** Sim-clock "now" usable outside React (selectors, report generator). */
export const nowMs = () => useStore.getState().base + useStore.getState().simMs;

export type { Mule };
