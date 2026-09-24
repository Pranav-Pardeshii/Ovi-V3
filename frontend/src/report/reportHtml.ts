import type { Case } from '../types';
import { useStore, nowMs } from '../store/useStore';
import { INR, INRc, hms, istDate, istHM, istTime, p2 } from '../lib/format';
import { hexN } from '../lib/rng';
import { PIPE, RAILN, TIERM } from '../data/constants';
import { buildGraph } from '../sim/graph';
import { atRisk, muleBal, shortTarget } from '../sim/selectors';

export const REPORT_CSS = `
.rp{background:#fff;color:#18202E;font:12px/1.6 "IBM Plex Sans",-apple-system,"Segoe UI",Arial,sans-serif;padding:44px 50px}
.rp *{box-sizing:border-box}
.rp-top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #18202E;padding-bottom:14px;margin-bottom:16px}
.rp-h1{font-size:20px;font-weight:700;letter-spacing:.02em;margin:0}
.rp-h2{font-size:12px;font-weight:700;letter-spacing:.14em;color:#5A6578;margin:22px 0 8px;text-transform:uppercase;border-bottom:1px solid #D8DDE6;padding-bottom:4px;page-break-after:avoid}
.rp-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 18px;margin:12px 0;page-break-inside:avoid}
.rp-meta>div{border-left:2px solid #E3E7EE;padding-left:9px;min-width:0}
.rp-meta .k{font-size:7.5px;font-weight:700;letter-spacing:.12em;color:#78829A;text-transform:uppercase}
.rp-meta .v{font-family:"IBM Plex Mono",monospace;font-size:10.5px;margin-top:2px;word-break:break-word}
.rp-t{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
.rp-t th{text-align:left;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:#5A6578;border-bottom:1.5px solid #18202E;padding:5px 7px}
.rp-t td{border-bottom:1px solid #E3E7EE;padding:5.5px 7px;vertical-align:top;font-family:"IBM Plex Mono",monospace;font-size:9.5px}
.rp-p{margin:8px 0;color:#2A3346}
.rp-callout{border:1px solid #D8DDE6;border-left:3px solid #18202E;background:#F7F9FC;padding:10px 13px;margin:10px 0;font-size:11px;page-break-inside:avoid}
.rp-hash{font-family:"IBM Plex Mono",monospace;font-size:9px;color:#5A6578;line-height:1.7}
.rp-cert{margin-top:22px;border-top:2px solid #18202E;padding-top:12px;font-size:9.5px;color:#404B60;line-height:1.7;page-break-inside:avoid}
.rp-tag{display:inline-block;font:700 8px "IBM Plex Mono",monospace;letter-spacing:.12em;padding:3px 8px;border:1px solid #18202E;margin:0 0 0 8px;vertical-align:2px}
@media print{.rp{padding:0}}`;

const RP_TIER_C: Record<string, string> = { T1: '#B3261E', T2: '#A05A00', T3: '#806600', T4: '#556070' };
const rpTier = (t: Case['tier']) => `<b style="color:${RP_TIER_C[t]}">${t} · ${TIERM[t].n}</b>`;
const rpSec = (n: string, t: string, inner: string) => `<h2 class="rp-h2">${n} · ${t}</h2>` + inner;
const rpMeta = (pairs: [string, string][]) =>
  '<div class="rp-meta">' + pairs.map((p) => `<div><div class="k">${p[0]}</div><div class="v">${p[1]}</div></div>`).join('') + '</div>';
const rpTbl = (head: string[], rows: (string | null)[][]) =>
  `<table class="rp-t"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
  (rows.length
    ? rows.map((r) => '<tr>' + r.map((x) => `<td>${x == null ? '—' : x}</td>`).join('') + '</tr>').join('')
    : `<tr><td colspan="${head.length}" style="color:#78829A">—</td></tr>`) +
  '</tbody></table>';

/** FIR-style investigation report for a case, rendered to a standalone HTML string. */
export function reportBody(c: Case): string {
  const s = useStore.getState();
  const gen = nowMs();
  const rep = s.reports[c.id];
  const G = buildGraph(c);
  const edges = [...G.e].sort((a, b) => a.seq - b.seq);
  const frozen = c.mules.filter((m) => m.frozen);
  const frozenAmt = frozen.reduce((a, m) => a + m.frozenAmt, 0);
  const alerts = s.alerts.filter(
    (a) => a.msg.includes(c.short) || c.mules.some((m) => a.msg.includes(m.tok)) || c.atms.some((x) => a.msg.includes(x.id)),
  );
  const repHash = '0x' + hexN(c.id + '|rep|' + (rep ? rep.at : gen), 20);
  const win = c.tier !== 'T4';

  let out = '';
  out +=
    '<div class="rp-top"><div><h1 class="rp-h1">OVI-3 · INVESTIGATION REPORT</h1>' +
    `<div class="rp-hash" style="margin-top:5px">${c.id} · generated ${istDate(gen)} ${istTime(gen)} IST</div></div>` +
    '<div style="text-align:right"><span class="rp-tag">CONFIDENTIAL</span><br><span class="rp-tag" style="margin:5px 0 0">SYNTHETIC DEMO DATA</span></div></div>';

  out += rpMeta(
    [
      ['CASE ID', c.id],
      ['FILED · NCRP', istTime(c.filedAt) + ' IST'],
      ['SCAM PATTERN', c.scam],
      ['AMOUNT', INRc(c.amount)],
      ['VICTIM · MASKED', c.victim],
      ['VICTIM BANK · CITY', c.vBank + ' · ' + c.city],
      ['MULES FLAGGED', c.mules.length + ' · federated'],
      ['FORECAST TIER', rpTier(c.tier)],
    ] as [string, string][],
  );

  out += rpSec(
    '1',
    'CASE SUMMARY',
    `<div class="rp-p">${c.narr}</div>` +
      `<div class="rp-callout"><b>Live position at generation:</b> at risk ${INRc(atRisk(c))} · frozen ${INRc(frozenAmt)} (${frozen.length} of ${c.mules.length} mule accounts) · forecast target: ${c.tier === 'T1' ? 'ATM ' + c.atms[0].id + ' — exact-ATM Tier-1 forecast' : shortTarget(c)}</div>`,
  );

  out += rpSec(
    '2',
    'MONEY TRAIL · TOKENIZED HOP LEDGER',
    rpTbl(
      ['#', 'FROM', 'TO', 'BANKS', 'AMOUNT', 'ΔT', 'EVIDENCE ANCHOR'],
      edges.map((ed, i) => {
        const A = G.n[ed.a],
          B = G.n[ed.b];
        return [
          p2(i + 1),
          A.tok || 'VICTIM',
          B.tok || B.label || '',
          A.bank + ' → ' + B.bank,
          INR(ed.amount),
          '+' + (30 + ((ed.seq * 37) % 160)) + 's',
          '0x' + hexN(c.id + 'e' + ed.seq, 10),
        ];
      }),
    ) +
      `<div class="rp-hash">As-of complaint timestamp · no future leakage · raw PII bank-local · DPDP §7(7) basis · ${c.mules.length} federated score nodes · ε-DP 0.81/round</div>`,
  );

  out += rpSec(
    '3',
    'FLAGGED MULE ACCOUNTS · CALIBRATED SCORES',
    rpTbl(
      ['TOKEN', 'BANK', 'P(MULE)', 'BALANCE / FROZEN', 'STATUS', 'TOP SHAP DRIVERS'],
      c.mules.map((m) => [
        m.tok,
        m.bank,
        m.p.toFixed(2),
        m.frozen ? INR(m.frozenAmt) + ' (frozen)' : INR(muleBal(c, m)),
        m.frozen ? 'FROZEN · confirmed' : m.status === 'sent' ? 'REQUEST SENT · SLA running' : 'scored · queued',
        m.shap.slice(0, 3).map((r) => r.l + ' ' + (r.v > 0 ? '+' : '') + r.v.toFixed(2)).join(' · '),
      ]),
    ) +
      `<div class="rp-hash">P(mule) is isotonic-calibrated (held-out 60k · ECE 1.9%): a stated “${c.mules[0] ? c.mules[0].p.toFixed(2) : '—'}” is empirically correct that share of the time. Positive drivers above push toward mule.</div>`,
  );

  let f4 = '';
  if (win)
    f4 += `<div class="rp-callout"><b>Window (80% CI):</b> opens ${istHM(c.depositAt + c.p10 * 1000)} IST · median ${istHM(c.depositAt + c.p50 * 1000)} IST · closes ${istHM(c.depositAt + c.p90 * 1000)} IST · P10–P90 = ${p2((c.p10 / 60) | 0)}–${p2((c.p90 / 60) | 0)} min from deposit</div>`;
  if (c.tier === 'T1') {
    f4 +=
      rpTbl(
        ['RANK', 'ATM ID', 'LOCATION', 'BANK', 'SCORE Σwᵢ·x'],
        c.atms.map((a, i) => ['#' + (i + 1), a.id, a.loc + ' · ' + c.city, a.bank, a.score.toFixed(2)]),
      ) + '<div class="rp-hash">w = traffic .31 · mule-p .24 · prior .18 · distance .15 · fit .12 · CCTV pull codes pre-staged · field-team ETA 11 min</div>';
  } else if (c.tier === 'T2' && c.zone) {
    f4 +=
      rpTbl(
        ['FIELD', 'VALUE'],
        [
          ['Zone', c.zone.name + ' district'],
          ['Radius', c.zone.r + ' km ring'],
          ['Signal', c.zone.signal],
          ['Patrol', 'Cyber PS ' + c.zone.name + ' + ZIP unit'],
        ],
      ) + '<div class="rp-hash">District-level only — no ATM precision claimed at Tier 2.</div>';
  } else if (c.tier === 'T3') {
    f4 +=
      rpTbl(
        ['RAIL', 'LIKELIHOOD'],
        (Object.entries(c.channel) as [keyof typeof c.channel, number][])
          .sort((a, b) => b[1] - a[1])
          .map((r) => [RAILN[r[0]], r[1] + '%']),
      ) + `<div class="rp-hash">Lead mule age ${c.mules[0].ageDays} days — no debit card issued. Chasing wallet rail, not ATM.</div>`;
  } else {
    f4 +=
      '<div class="rp-callout">Watchlist mode — signal available: “account exists” only. No geographic forecast issued. Ovi-3 does not fabricate ATM precision when graph signal is insufficient; auto-promotion on new mule neighbour or device link.</div>';
  }
  f4 += `<div class="rp-hash">Rail mix: ${(Object.entries(c.channel) as [keyof typeof c.channel, number][]).map((x) => RAILN[x[0]] + ' ' + x[1] + '%').join(' · ')}</div>`;
  out += rpSec('4', 'CASHOUT FORECAST · ' + c.tier, f4);

  out += rpSec(
    '5',
    'ACTIONS TAKEN',
    rpTbl(
      ['ACCOUNT', 'BANK', 'P(MULE)', 'STATUS', 'AMOUNT'],
      c.mules.map((m) => [
        m.tok,
        m.bank,
        m.p.toFixed(2),
        m.frozen
          ? 'FROZEN · confirmed ' + istTime(m.sentAt + 6 * 60000)
          : m.status === 'sent'
            ? 'TRANSMITTED · SLA ' + hms(Math.max(0, 900 - (nowMs() - m.sentAt) / 1000))
            : 'queued — not yet transmitted',
        m.frozen ? INR(m.frozenAmt) : INRc(muleBal(c, m) * m.p) + ' expected',
      ]),
    ) +
      (alerts.length
        ? '<h2 class="rp-h2" style="margin-top:16px">LEA / BANK DISPATCHES</h2>' +
          rpTbl(
            ['TIME', 'CHANNEL', 'RECIPIENT', 'STATUS'],
            alerts.map((a) => [istTime(a.t), a.ch, a.to, a.status === 'acked' ? 'ACKED ' + a.ack + 's' : a.status.toUpperCase()]),
          )
        : '<div class="rp-hash" style="margin-top:8px">No case-tagged dispatches in the current window — see central dispatch log (view 07).</div>'),
  );

  out += rpSec(
    '6',
    'EVIDENCE BUNDLE · CHAIN OF CUSTODY',
    '<h2 class="rp-h2" style="margin-top:2px">PIPELINE TIMINGS</h2>' +
      rpTbl(
        ['STEP', 'T+', 'ANCHOR'],
        PIPE.map((p, i) => [p[0], 'T+' + c.pt[i].toFixed(1) + 's', '0x' + hexN(c.id + 'p' + i, 10)]),
      ) +
      '<h2 class="rp-h2" style="margin-top:16px">FABRIC ANCHORS</h2>' +
      rpTbl(
        ['ITEM', 'DIGEST'],
        [
          ['Case block anchor', '0x' + hexN(c.id + 'blk', 16)],
          ['Evidence bundle · ev1', '0x' + hexN(c.id + 'ev1', 16)],
          ['Evidence bundle · ev2', '0x' + hexN(c.id + 'ev2', 16)],
          ['Graph snapshot', '0x' + hexN(c.id + 'g', 16)],
          ['Investigation report', repHash],
        ],
      ) +
      '<h2 class="rp-h2" style="margin-top:16px">MODEL CARD</h2>' +
      rpTbl(
        ['FIELD', 'VALUE'],
        [
          ['Model', 'OVI-3 v3.4.1 · GraphSAGE → XGBoost · isotonic calibration'],
          ['Evaluation', 'AUC 0.931 · hit@1 0.74 · calibration ECE 1.9% (Chakravyuh-Bench-v0)'],
          ['Provenance', 'TransXion 3M pre-train → RBI mule benchmark fine-tune'],
          ['Legal basis', 'DPDP Act 2023 §7(7) · Karnataka HC 2025 (PhonePe)'],
          ['Privacy posture', 'Raw PII bank-local · tokenized IDs + calibrated scores only · FL 24/24 nodes'],
        ],
      ),
  );

  out += rpSec(
    '7',
    'CERTIFICATION',
    `<div class="rp-cert">This report was generated by the OVI-3 platform from tokenized federated scores; no raw personally identifiable data crossed any bank boundary in its production. All probabilities are isotonic-calibrated and carry explicit confidence tiers — ${rpTier(c.tier)} — reflecting honest signal availability at generation time. Evidence items are anchored to the Hyperledger Fabric evidence channel and are tamper-evident; any post-hoc modification invalidates the digests above.</div>` +
      rpMeta([
        ['GENERATED BY', 'OVI-3 v3.4.1 · I4C central desk'],
        ['GENERATED AT', istDate(gen) + ' ' + istTime(gen) + ' IST'],
        ['REPORT HASH', repHash],
        ['BLOCK ANCHOR', rep ? '#' + rep.block.toLocaleString('en-IN') + ' · ' + rep.hash : 'not yet anchored'],
      ]) +
      '<div class="rp-hash" style="margin-top:6px">Anchoring commits this document’s digest to the Fabric evidence channel, establishing the timestamped chain-of-custody record for court submission.</div>',
  );

  return '<div class="rp">' + out + '</div>';
}

/** Standalone downloadable report file. */
export function downloadReport(c: Case) {
  const doc =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    `<title>OVI-3 Report · ${c.id}</title>` +
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;600;700&display=swap" rel="stylesheet">' +
    `<style>${REPORT_CSS}body{margin:0;padding:24px 0;background:#E9ECF2}</style></head><body>${reportBody(c)}</body></html>`;
  const blob = new Blob([doc], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'OVI3-Report-' + c.id + '.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  useStore.getState().toast('REPORT DOWNLOADED', 'Standalone HTML file — open in any browser and print to PDF if needed.', 'ok');
}
