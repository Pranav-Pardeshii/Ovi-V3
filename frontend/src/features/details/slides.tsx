import { useEffect, useState } from 'react';
import type { Case, Slide, Tier } from '../../types';
import { useStore } from '../../store/useStore';
import { Icon } from '../../components/Icon';
import { SlideHeadShell } from '../../components/SlideOver';
import { BankChip, Cell, HashChip, HTM, PBar, TierChip } from '../../components/Chips';
import { ShapChart } from '../../components/charts';
import { INR, INRc, hms, istHM, istTime } from '../../lib/format';
import { PIPE, RAILC, RAILN, TIERM, Wt, WtN } from '../../data/constants';
import { allMules, muleBal, nowMs, shortTarget, winLabel, elapsedSec } from '../../sim/selectors';
import { mulberry32 } from '../../lib/rng';

/* =================== heads =================== */

export function SlideHead({ slide }: { slide: Slide }) {
  const { icon, title, sub } = useSlideMeta(slide);
  return <SlideHeadShell icon={icon} title={title} sub={sub} />;
}

function useSlideMeta(slide: Slide): { icon: string; title: React.ReactNode; sub?: React.ReactNode } {
  const cases = useStore((s) => s.cases);
  switch (slide.kind) {
    case 'case': {
      const c = cases.find((x) => x.id === slide.id);
      return { icon: 'inbox', title: 'CASE · ' + (c?.id ?? slide.id) };
    }
    case 'mule': {
      const f = allMules().find((x) => x.m.tok === slide.tok);
      return { icon: 'mule', title: 'MULE ACCOUNT', sub: f ? f.c.short : '' };
    }
    case 'tier':
      return { icon: 'shield', title: 'CONFIDENCE TIER ' + slide.tier };
    case 'atm': {
      const c = cases.find((x) => x.id === slide.caseId);
      const a = c?.atms[slide.index];
      return { icon: 'target', title: 'ATM FORECAST', sub: a?.id ?? '' };
    }
    case 'rail': {
      const c = cases.find((x) => x.id === slide.caseId);
      return { icon: 'wallet', title: 'RAIL MIX · WHY', sub: c?.short ?? '' };
    }
    case 'feed':
      return { icon: 'live', title: 'LIVE FEED · FULL' };
    case 'ledger':
      return { icon: 'check', title: 'CONFIRMED · ON-CHAIN EVIDENCE' };
    case 'draft':
      return { icon: 'lock', title: 'CFCFRMS REQUEST · DRAFT' };
    case 'node':
      return { icon: 'graph', title: 'NODE INSPECTOR' };
    case 'cal':
      return { icon: 'target', title: 'CALIBRATION · RELIABILITY' };
    case 'auc':
      return { icon: 'pulse', title: 'AUC-ROC · ROLLING 12 WEEKS' };
    case 'psi':
      return { icon: 'warn', title: 'FEATURE DRIFT · PSI BY WEEK' };
    case 'registry':
      return { icon: 'hash', title: 'MODEL REGISTRY · MLflow + ONNX' };
  }
}

/* =================== bodies =================== */

export function SlideBody({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case 'case':
      return <CaseSlideBody id={slide.id} />;
    case 'mule':
      return <MuleSlideBody tok={slide.tok} />;
    case 'tier':
      return <TierSlideBody tier={slide.tier} />;
    case 'atm':
      return <AtmSlideBody caseId={slide.caseId} index={slide.index} />;
    case 'rail':
      return <RailSlideBody caseId={slide.caseId} />;
    case 'feed':
      return <FeedSlideBody />;
    case 'ledger':
      return <LedgerSlideBody />;
    case 'draft':
      return <DraftSlideBody caseId={slide.caseId} tok={slide.tok} />;
    case 'node':
      return <NodeSlideBody node={slide.node} caseId={slide.caseId} />;
    case 'cal':
      return (
        <>
          <CalChart />
          <div className="chart-cap">
            Isotonic on held-out 60k · <b>ECE 1.9%</b> · a “0.92” is empirically right 92% of the time — uncalibrated XGBoost with scale_pos_weight≈19 would say 0.92 when the truth is ~0.4.
          </div>
        </>
      );
    case 'auc':
      return (
        <>
          <AucChart />
          <div className="chart-cap">Evaluated weekly on Chakravyuh-Bench-v0 · no degradation trend.</div>
        </>
      );
    case 'psi':
      return (
        <>
          <PsiTable />
          <div className="chart-cap">
            <b>velocity_ratio PSI 0.27 (W36)</b> — crossed the 0.25 action line. Retrain v3.4.2 queued with corrected velocity features; approval vote open on the Model Governance channel.
          </div>
        </>
      );
    case 'registry':
      return <RegistrySlideBody />;
  }
}

/* ---------- case ---------- */

function CaseSlideBody({ id }: { id: string }) {
  const c = useStore((s) => s.cases.find((x) => x.id === id));
  const openSlide = useStore((s) => s.openSlide);
  const [lit, setLit] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setLit((i) => {
        if (i >= PIPE.length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 320);
    return () => clearInterval(t);
  }, [playing]);

  if (!c) return <div className="sub-note">Case no longer active.</div>;
  const win = c.tier !== 'T4';
  return (
    <>
      <div className="kv">
        <Cell k="AMOUNT" v={INRc(c.amount)} big />
        <Cell k="FORECAST TIER" v={<TierChip t={c.tier} />} />
        <Cell k="WINDOW" v={win ? istHM(c.depositAt + c.p10 * 1000) + ' – ' + istHM(c.depositAt + c.p90 * 1000) + ' IST' : '—'} />
        <Cell k="MULES FLAGGED" v={c.mules.length + ' · federated'} />
        <Cell k="SCAM PATTERN" v={c.scam} />
        <Cell k="BANK · CITY" v={c.vBank + ' · ' + c.city} />
        <Cell k="VICTIM · MASKED" v={c.victim} />
        <Cell k="FILED · NCRP" v={istTime(c.filedAt) + ' IST'} />
      </div>
      <div className="narr">
        <HTM html={c.narr} />
      </div>
      <div className="so-sec">PIPELINE · MEASURED (CLICK REPLAY)</div>
      <div className="vpipe">
        {PIPE.map((p, i) => (
          <div key={p[0]} className={'vp' + (i < lit ? ' on' : '')}>
            <span className="vp-t">T+{c.pt[i].toFixed(1)}s</span>
            <span>{p[0]}</span>
            <span style={{ marginLeft: 'auto' }}>
              <HashChip seed={c.id + 'p' + i} />
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 9 }}>
        <button
          className="btn"
          onClick={() => {
            setLit(0);
            setPlaying(true);
          }}
        >
          <Icon n="play" s={10} /> REPLAY PIPELINE
        </button>
      </div>
      <div className="so-sec">MULES · FEDERATED SCORES (CLICK FOR SHAP)</div>
      {c.mules.map((m) => (
        <div
          key={m.tok}
          className="lrow"
          style={{ padding: '8px 4px' }}
          onClick={() => openSlide({ kind: 'mule', tok: m.tok })}
        >
          <span className="mono" style={{ font: '600 11px var(--mono)' }}>
            {m.tok}
          </span>
          <BankChip b={m.bank} />
          <span style={{ flex: 1, minWidth: 0 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PBar p={m.p} sm />
          </span>
          <span className="mono" style={{ width: 72, textAlign: 'right', font: '600 11px var(--mono)' }}>
            {INRc(muleBal(c, m))}
          </span>
          <Icon n="chevr" s={11} />
        </div>
      ))}
      <div className="so-sec">AUDIT ANCHORS · FABRIC</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <HashChip seed={c.id + 'blk'} />
        <HashChip seed={c.id + 'ev1'} />
        <HashChip seed={c.id + 'ev2'} />
      </div>
    </>
  );
}

export function CaseSlideFoot({ id }: { id: string }) {
  const c = useStore((s) => s.cases.find((x) => x.id === id));
  const goto = useStore((s) => s.goto);
  const selectCase = useStore((s) => s.selectCase);
  const openReport = useStore((s) => s.openReport);
  if (!c) return null;
  return (
    <>
      <button
        className="btn pri"
        onClick={() => {
          selectCase(c.id);
          goto('cashout');
        }}
      >
        <Icon n="target" s={12} /> OPEN FORECAST
      </button>
      <button
        className="btn"
        onClick={() => {
          selectCase(c.id);
          goto('analysis');
        }}
      >
        <Icon n="graph" s={12} /> TOKEN GRAPH
      </button>
      <button className="btn" onClick={() => goto('freeze')}>
        <Icon n="lock" s={12} /> FREEZE QUEUE
      </button>
      <button className="btn" onClick={() => openReport(c.id)}>
        <Icon n="doc" s={12} /> GENERATE REPORT
      </button>
    </>
  );
}

/* ---------- mule ---------- */

function MuleSlideBody({ tok }: { tok: string }) {
  const tick = useStore((s) => s.tickId);
  void tick;
  const f = allMules().find((x) => x.m.tok === tok);
  if (!f) return <div className="sub-note">Account no longer active.</div>;
  const { c, m } = f;
  const status = m.frozen
    ? 'FROZEN · ' + INRc(m.frozenAmt)
    : m.status === 'sent'
      ? 'REQUEST SENT · SLA RUNNING'
      : m.status === 'confirmed'
        ? 'FROZEN'
        : 'SCORED · IN QUEUE';
  const color = m.p >= 0.85 ? '#F87171' : m.p >= 0.7 ? '#FB923C' : m.p >= 0.5 ? '#FBBF24' : '#818DA8';
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ font: '600 16px var(--mono)' }}>{m.tok}</span>
        <BankChip b={m.bank} />
        <TierChip t={c.tier} />
        <span style={{ marginLeft: 'auto', font: '600 22px var(--mono)', color }}>
          {m.p.toFixed(2)}
        </span>
        <span className="sub-note">P(MULE)</span>
      </div>
      <div className="kv">
        <Cell k="BALANCE · LIVE" v={INR(muleBal(c, m))} big />
        <Cell k="STATUS" v={status} />
        <Cell k="ACCOUNT AGE" v={m.ageDays + 'd'} />
        <Cell k="DORMANCY → BURST" v={m.dormDays + 'd'} />
        <Cell k="DEVICE" v={m.deviceShare ? 'SHARED ×3' : 'none'} />
        <Cell k="KYC" v={m.kyc} />
      </div>
      <div className="so-sec">SHAP · WHY THIS SCORE</div>
      <ShapChart m={m} />
      <div className="sub-note" style={{ marginTop: 10 }}>
        Isotonic-calibrated on held-out 60k — “{m.p.toFixed(2)}” is empirically correct {Math.round(m.p * 100)}% of the
        time. Features as-of complaint timestamp (no future leakage). Red pushes toward mule · blue pushes against.
      </div>
      <div className="so-sec">ALL FEATURES</div>
      <div className="kv">
        {Object.entries(m.feats).map((x) => (
          <Cell key={x[0]} k={x[0].toUpperCase()} v={x[1]} />
        ))}
      </div>
    </>
  );
}

export function MuleSlideFoot({ tok }: { tok: string }) {
  const openSlide = useStore((s) => s.openSlide);
  const f = allMules().find((x) => x.m.tok === tok);
  if (!f || !(f.m.status === 'queue' && f.c.tier !== 'T4')) return null;
  return (
    <button className="btn pri" onClick={() => openSlide({ kind: 'draft', caseId: f.c.id, tok })}>
      <Icon n="lock" s={12} /> DRAFT FREEZE REQUEST
    </button>
  );
}

/* ---------- tier ---------- */

function TierSlideBody({ tier }: { tier: Tier }) {
  const cases = useStore((s) => s.cases);
  const openSlide = useStore((s) => s.openSlide);
  const list = cases.filter((c) => c.tier === tier);
  return (
    <>
      <div className="narr" style={{ marginTop: 0 }}>
        <TierChip t={tier} /> — {TIERM[tier].n}. {TIERM[tier].d}
      </div>
      {list.length ? (
        list.map((c) => (
          <div key={c.id} className="lrow" onClick={() => openSlide({ kind: 'case', id: c.id })}>
            <span className="lr-id">#{c.short}</span>
            <span className="lr-target">
              {c.scam} · {c.city}
            </span>
            <span className="lr-amt">{INRc(c.amount)}</span>
            <Icon n="chevr" s={12} />
          </div>
        ))
      ) : (
        <div className="sub-note" style={{ padding: '10px 0' }}>
          No active cases at this tier.
        </div>
      )}
    </>
  );
}

/* ---------- ATM ---------- */

function AtmSlideBody({ caseId, index }: { caseId: string; index: number }) {
  const tick = useStore((s) => s.tickId);
  void tick;
  const c = useStore((s) => s.cases.find((x) => x.id === caseId));
  if (!c) return <div className="sub-note">Case no longer active.</div>;
  const a = c.atms[index];
  if (!a) return null;
  const ramp = ['#4A3F8F', '#5A4EB0', '#6E5CD0', '#8B7CF6', '#AC9FF9'];
  return (
    <>
      <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
        <Cell k="ATM ID" v={a.id} big />
        <Cell k="LOCATION" v={a.loc + ' · ' + c.city} />
        <Cell k="BANK" v={<BankChip b={a.bank} />} />
        <Cell k="RANK · TIER" v={'#' + (index + 1) + ' of ' + c.atms.length + ' · ' + c.tier} />
        <Cell k="SCORE" v={'Σ wᵢ·component = ' + a.score.toFixed(2)} big />
        <Cell k="CASE" v={c.id} />
      </div>
      <div className="so-sec">SCORE COMPONENTS</div>
      {a.comps.map((cv, k) => (
        <div key={WtN[k]} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
          <span className="mono" style={{ width: 84, fontSize: 9, color: 'var(--tx3)', letterSpacing: '0.06em' }}>
            {WtN[k].toUpperCase()}
          </span>
          <span className="pbar" style={{ flex: 1 }}>
            <i style={{ width: cv * 100 + '%', background: ramp[k] }} />
          </span>
          <span className="mono" style={{ width: 36, textAlign: 'right', fontSize: 10 }}>
            {cv.toFixed(2)}
          </span>
          <span className="mono" style={{ width: 36, color: 'var(--tx3)', fontSize: 9 }}>
            ×{Wt[k]}
          </span>
        </div>
      ))}
      <div className="rk-note" style={{ marginTop: 12 }}>
        Top-2 fall inside the P10–P90 cashout window · CCTV pull codes pre-staged · field-team ETA 11 min.
      </div>
    </>
  );
}

export function AtmSlideFoot({ caseId, index }: { caseId: string; index: number }) {
  const c = useStore((s) => s.cases.find((x) => x.id === caseId));
  const toast = useStore((s) => s.toast);
  const pushFeed = useStore((s) => s.pushFeed);
  const closeSlide = useStore((s) => s.closeSlide);
  if (!c) return null;
  const a = c.atms[index];
  if (!a) return null;
  return (
    <button
      className="btn pri"
      onClick={() => {
        toast('FIELD TEAM DISPATCHED', 'Cyber PS ' + c.city + ' · ETA 11 min to ' + a.loc + ' · CCTV pull code OV3-' + c.short, 'ok');
        pushFeed('alert', 'Field team dispatched · ' + a.id + ' · ETA 11m');
        closeSlide();
      }}
    >
      <Icon n="bolt" s={12} /> DISPATCH FIELD TEAM
    </button>
  );
}

/* ---------- rail mix ---------- */

function RailSlideBody({ caseId }: { caseId: string }) {
  const c = useStore((s) => s.cases.find((x) => x.id === caseId));
  if (!c) return null;
  return (
    <>
      <div className="narr" style={{ marginTop: 0 }}>
        <HTM html={c.note} />
      </div>
      <div className="so-sec">RAIL LIKELIHOODS</div>
      {(Object.entries(c.channel) as [keyof typeof c.channel, number][])
        .sort((a, b) => b[1] - a[1])
        .map((r) => (
          <div key={r[0]} className="zone-r">
            <span>{RAILN[r[0]]} RAIL</span>
            <span style={{ color: RAILC[r[0]] }}>{r[1]}%</span>
          </div>
        ))}
      <div className="sub-note" style={{ marginTop: 12 }}>
        Cold-start aware: accounts &lt; 7 days old have no debit card — the model shifts probability from ATM to wallet /
        agent cash-in networks instead of guessing a location.
      </div>
    </>
  );
}

/* ---------- full feed ---------- */

function FeedSlideBody() {
  const feed = useStore((s) => s.feed);
  return (
    <div className="feed" style={{ maxHeight: '70vh' }}>
      {feed.map((e, i) => (
        <FeedRow key={i} t={e.t} type={e.type} html={e.html} />
      ))}
    </div>
  );
}

export function FeedRow({ t, type, html }: { t: number; type: string; html: string }) {
  const FEEDIC: Record<string, string> = {
    complaint: 'inbox',
    forecast: 'target',
    freeze: 'lock',
    alert: 'bell',
    window: 'clock',
    ledger: 'hash',
    system: 'live',
  };
  return (
    <div className="feed-row">
      <span className="f-t mono">{istTime(t)}</span>
      <Icon n={FEEDIC[type] || 'live'} s={11} />
      <span className="f-x">
        <HTM html={html} />
      </span>
    </div>
  );
}

/* ---------- confirmed ledger ---------- */

function LedgerSlideBody() {
  const confirmedSeed = useStore((s) => s.confirmedSeed);
  const live = allMules().filter((x) => x.m.frozen);
  return (
    <div className="tblwrap" style={{ maxHeight: '70vh' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>ACCOUNT</th>
            <th>BANK</th>
            <th>FROZEN</th>
            <th>CONFIRMED</th>
            <th>ANCHOR</th>
            <th>CASE</th>
          </tr>
        </thead>
        <tbody>
          {live.map((x) => (
            <tr key={x.m.tok}>
              <td className="num">{x.m.tok}</td>
              <td>
                <BankChip b={x.m.bank} />
              </td>
              <td className="num" style={{ color: 'var(--grn)' }}>
                {INR(x.m.frozenAmt)}
              </td>
              <td className="num">{istTime(x.m.sentAt + 6 * 60000)}</td>
              <td>
                <HashChip seed={x.m.tok + 'cf'} />
              </td>
              <td className="num" style={{ color: 'var(--tx3)' }}>
                {x.c.id}
              </td>
            </tr>
          ))}
          {confirmedSeed.map((f) => (
            <tr key={f.tok}>
              <td className="num">{f.tok}</td>
              <td>
                <BankChip b={f.bank} />
              </td>
              <td className="num" style={{ color: 'var(--grn)' }}>
                {INR(f.amt)}
              </td>
              <td className="num">{istTime(f.at)}</td>
              <td>
                <HashChip seed={f.seed} />
              </td>
              <td className="num" style={{ color: 'var(--tx3)' }}>
                NCRP-2026-0918{f.cs}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- CFCFRMS draft ---------- */

function DraftSlideBody({ caseId, tok }: { caseId: string; tok: string }) {
  const tick = useStore((s) => s.tickId);
  void tick;
  const f = allMules().find((x) => x.c.id === caseId && x.m.tok === tok);
  if (!f) return <div className="sub-note">Account no longer active.</div>;
  const { c, m } = f;
  return (
    <>
      <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
        <Cell k="REQUESTING UNIT" v="I4C · NCRP Cyber Desk" />
        <Cell
          k="RESPONDENT BANK"
          v={
            <>
              <BankChip b={m.bank} /> · FL node online
            </>
          }
        />
        <Cell k="ACCOUNT · TOKENIZED" v={m.tok} big />
        <Cell k="LEGAL BASIS" v="DPDP Act 2023 §7(7) — detection of offences · ref. Karnataka HC 2025" />
        <Cell k="AMOUNT AT RISK · LIVE" v={INR(muleBal(c, m))} big />
        <Cell k="EXPECTED RECOVERABLE" v={INRc(muleBal(c, m) * m.p) + ' · P(mule) ' + m.p.toFixed(2)} />
        <Cell
          k="URGENCY"
          v={
            <>
              <TierChip t={c.tier} /> · window {c.tier === 'T4' ? 'n/a' : winLabel(c)}
            </>
          }
        />
      </div>
      <div className="so-sec">EVIDENCE BUNDLE · FABRIC</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <HashChip seed={c.id + 'ev1'} />
        <HashChip seed={c.id + 'ev2'} />
        <HashChip seed={c.id + 'ev3'} />
      </div>
      <div className="sub-note" style={{ marginTop: 12 }}>
        On transmit: request hash anchored to the evidence channel · SLA 15:00 · bank confirmation via CFCFRMS webhook ·
        every field is tamper-evident.
      </div>
    </>
  );
}

export function DraftSlideFoot({ caseId, tok }: { caseId: string; tok: string }) {
  const transmitFreeze = useStore((s) => s.transmitFreeze);
  return (
    <>
      <button className="btn pri" onClick={() => transmitFreeze(caseId, tok)}>
        <Icon n="arrow" s={12} /> TRANSMIT VIA CFCFRMS
      </button>
      <span className="sub-note" style={{ color: 'var(--amber)' }}>
        SLA 15:00
      </span>
    </>
  );
}

/* ---------- graph node inspector ---------- */

function NodeSlideBody({ node, caseId }: { node: import('../../sim/graph').GNode; caseId: string }) {
  const c = useStore((s) => s.cases.find((x) => x.id === caseId));
  if (!c) return null;
  const body =
    node.type === 'mule' ? (
      <>
        <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
          <Cell k="TOKEN" v={node.tok} big />
          <Cell k="BANK" v={<BankChip b={node.bank} />} />
          <Cell
            k="P(MULE) · CALIBRATED"
            v={
              <span style={{ color: pColorOf(node.p ?? 0) }}>{(node.p ?? 0).toFixed(2)}</span>
            }
            big
          />
          <Cell k="BALANCE · LIVE" v={INRc(node.mule ? muleBal(c, node.mule) : 0)} />
        </div>
        <div className="so-sec">KEY FEATURES</div>
        <div className="kv">
          {node.mule &&
            Object.entries(node.mule.feats)
              .slice(0, 6)
              .map((f) => <Cell key={f[0]} k={f[0].toUpperCase()} v={f[1]} />)}
        </div>
      </>
    ) : (
      <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
        <Cell
          k="NODE"
          v={node.type === 'victim' ? 'VICTIM · ' + node.bank : node.type === 'atm' ? node.label + ' · ' + node.bank : node.tok + ' · ' + node.bank}
          big
        />
        <Cell k="TYPE" v={node.type.toUpperCase()} />
        <Cell
          k="ROLE"
          v={node.type === 'victim' ? 'complaint origin' : node.type === 'atm' ? 'forecast cashout point' : 'multi-hop intermediate'}
        />
      </div>
    );
  return body;
}

function pColorOf(p: number) {
  return p >= 0.85 ? '#F87171' : p >= 0.7 ? '#FB923C' : p >= 0.5 ? '#FBBF24' : '#818DA8';
}

export function NodeSlideFoot({ node }: { node: import('../../sim/graph').GNode }) {
  const openSlide = useStore((s) => s.openSlide);
  if (node.type !== 'mule' || !node.tok) return null;
  return (
    <button className="btn pri" onClick={() => openSlide({ kind: 'mule', tok: node.tok! })}>
      <Icon n="pulse" s={12} /> SHAP EXPLANATION
    </button>
  );
}

/* ---------- drift charts ---------- */

function CalChart() {
  const cal: [number, number][] = [
    [0.05, 0.04],
    [0.15, 0.14],
    [0.25, 0.27],
    [0.35, 0.33],
    [0.45, 0.47],
    [0.55, 0.53],
    [0.65, 0.68],
    [0.75, 0.73],
    [0.85, 0.87],
    [0.95, 0.93],
  ];
  const cw = 420,
    ch = 300,
    m = 36,
    pw = cw - 2 * m,
    ph = ch - 2 * m;
  const cx = (t: number) => m + pw * t;
  const cyv = (t: number) => ch - m - ph * t;
  return (
    <svg width="100%" viewBox={`0 0 ${cw} ${ch}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={g}>
          <line x1={m} y1={cyv(g)} x2={m + pw} y2={cyv(g)} stroke="#232937" />
          <line x1={cx(g)} y1={m} x2={cx(g)} y2={ch - m} stroke="#232937" />
          <text x={m - 6} y={cyv(g) + 3} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={8} fill="#6E7994">
            {g.toFixed(2)}
          </text>
          <text x={cx(g)} y={ch - m + 14} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize={8} fill="#6E7994">
            {g.toFixed(1)}
          </text>
        </g>
      ))}
      <line x1={cx(0)} y1={cyv(0)} x2={cx(1)} y2={cyv(1)} stroke="#8B7CF6" strokeDasharray="4 4" opacity=".6" />
      {cal.map((p, i) => (
        <g key={i}>
          <line x1={cx(p[0])} y1={cyv(p[0])} x2={cx(p[0])} y2={cyv(p[1])} stroke={p[1] > p[0] ? '#F87171' : '#38BDF8'} strokeWidth={2} />
          <circle cx={cx(p[0])} cy={cyv(p[1])} r={3.4} fill="#11141C" stroke={p[1] > p[0] ? '#F87171' : '#38BDF8'} strokeWidth={1.6} />
        </g>
      ))}
    </svg>
  );
}

function AucChart() {
  const auc = [0.918, 0.921, 0.925, 0.923, 0.928, 0.926, 0.93, 0.933, 0.929, 0.931, 0.934, 0.931];
  const aw = 420,
    ah = 214,
    am = 34,
    apw = aw - 2 * am,
    aph = ah - 2 * am - 18;
  const ux = (i: number) => am + (apw * i) / 11;
  const uy = (v: number) => ah - am - aph * ((v - 0.9) / 0.05);
  return (
    <svg width="100%" viewBox={`0 0 ${aw} ${ah}`}>
      {[0.9, 0.92, 0.95].map((g) => (
        <g key={g}>
          <line
            x1={am}
            y1={uy(g)}
            x2={am + apw}
            y2={uy(g)}
            stroke={g === 0.92 ? '#8B7CF6' : '#232937'}
            strokeDasharray={g === 0.92 ? '4 4' : undefined}
            opacity={g === 0.92 ? 0.7 : 1}
          />
          <text x={am - 6} y={uy(g) + 3} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={8} fill="#6E7994">
            {g.toFixed(2)}
          </text>
        </g>
      ))}
      <polyline points={auc.map((v, i) => ux(i).toFixed(1) + ',' + uy(v).toFixed(1)).join(' ')} fill="none" stroke="#38BDF8" strokeWidth={1.8} />
      {auc.map((v, i) =>
        i % 2 === 0 ? (
          <text key={i} x={ux(i)} y={ah - am + 14} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize={7.5} fill="#6E7994">
            W{25 + i}
          </text>
        ) : null,
      )}
      <circle cx={ux(11)} cy={uy(auc[11])} r={4} fill="#38BDF8" />
      <text x={ux(11) - 10} y={uy(auc[11]) - 9} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={10} fill="#38BDF8" fontWeight={600}>
        0.931
      </text>
    </svg>
  );
}

function PsiTable() {
  const feats = [
    'Account age',
    'In/out degree',
    'Velocity ratio',
    'Dormancy',
    'Beneficiary reuse',
    'KYC status',
    'Device sharing',
    'Phone mismatch',
    'Amount deviation',
    'TTFW',
  ];
  const rr = mulberry32(77);
  const th: React.CSSProperties = {
    border: '1px solid var(--line)',
    padding: '5px 4px',
    background: 'var(--bg2)',
    font: '600 9px var(--mono)',
    color: 'var(--tx3)',
  };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th
            style={{
              ...th,
              textAlign: 'left',
              padding: '5px 8px',
            }}
          >
            FEATURE
          </th>
          {Array.from({ length: 8 }, (_, i) => (
            <th key={i} style={th}>
              W{29 + i}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {feats.map((f) => (
          <tr key={f}>
            <td style={{ border: '1px solid var(--line)', padding: '5px 8px', font: '500 9.5px var(--mono)', color: 'var(--tx2)' }}>{f}</td>
            {Array.from({ length: 8 }, (_, w) => {
              let base = 0.01 + rr() * 0.05;
              if ((f === 'Velocity ratio' || f === 'Device sharing') && w >= 5) base = 0.09 + (w - 4) * 0.055;
              if (f === 'Velocity ratio' && w === 7) base = 0.27;
              return (
                <td
                  key={w}
                  style={{
                    border: '1px solid var(--line)',
                    padding: '5px 4px',
                    textAlign: 'center',
                    font: '500 9.5px var(--mono)',
                    background:
                      base >= 0.25
                        ? 'color-mix(in srgb,#F87171 30%,transparent)'
                        : base >= 0.1
                          ? 'color-mix(in srgb,#FB923C 22%,transparent)'
                          : 'color-mix(in srgb,#34D399 12%,transparent)',
                    color: base >= 0.25 ? '#FCA5AC' : base >= 0.1 ? '#FDBA8C' : '#8FE7C4',
                  }}
                >
                  {base.toFixed(2)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RegistrySlideBody() {
  const rows: [string, string, string, string][] = [
    ['v3.4.1', 'CURRENT', 'TransXion 3M → RBI mule bench', 'AUC .931 · hit@1 .74'],
    ['v3.4.2', 'PENDING', '+ drift window W33–W36 · velocity fix', 'retrain 02:00 IST'],
    ['v3.4.0', 'SUPERSEDED', 'TransXion 3M → RBI mule bench', 'AUC .927 · hit@1 .71'],
    ['v3.3.2', 'SUPERSEDED', 'TransXion 3M · pre-benchmark', 'AUC .918'],
  ];
  return (
    <>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>VERSION</th>
              <th>STATUS</th>
              <th>PROVENANCE</th>
              <th>EVAL</th>
              <th>GOV ANCHOR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r[0]}>
                <td className="num" style={{ fontWeight: 600 }}>
                  {r[0]}
                </td>
                <td>
                  <span className={'tier ' + (i === 0 ? 't3' : i === 1 ? 't2' : 't4')}>{r[1]}</span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{r[2]}</td>
                <td className="num" style={{ fontSize: 10.5 }}>
                  {r[3]}
                </td>
                <td>
                  <HashChip seed={'reg' + r[0]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chart-cap" style={{ marginTop: 10 }}>
        Every promotion requires a governance-channel anchor: version hash + training-data provenance + eval report.{' '}
        <b>No silent model swaps.</b>
      </div>
    </>
  );
}

/* =================== feet =================== */

export function SlideFoot({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case 'case':
      return <CaseSlideFoot id={slide.id} />;
    case 'mule':
      return <MuleSlideFoot tok={slide.tok} />;
    case 'atm':
      return <AtmSlideFoot caseId={slide.caseId} index={slide.index} />;
    case 'draft':
      return <DraftSlideFoot caseId={slide.caseId} tok={slide.tok} />;
    case 'node':
      return <NodeSlideFoot node={slide.node} />;
    case 'psi':
      return <PsiSlideFoot />;
    default:
      return null;
  }
}

function PsiSlideFoot() {
  const toast = useStore((s) => s.toast);
  const pushFeed = useStore((s) => s.pushFeed);
  const closeSlide = useStore((s) => s.closeSlide);
  return (
    <button
      className="btn pri"
      onClick={() => {
        toast('RETRAIN SCHEDULED', 'v3.4.2 queued for the 02:00 IST window · approval vote opened on Model Governance channel.', 'ok');
        pushFeed('ledger', 'Retrain v3.4.2 scheduled · governance anchor pending');
        closeSlide();
      }}
    >
      <Icon n="clock" s={12} /> SCHEDULE RETRAIN · 02:00 IST
    </button>
  );
}

export type { Case };
