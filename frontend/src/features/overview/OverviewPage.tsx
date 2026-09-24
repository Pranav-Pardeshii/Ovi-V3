import { useRef } from 'react';
import type { Case, Tier } from '../../types';
import { useStore } from '../../store/useStore';
import { Panel, StatCard } from '../../components/Panel';
import { TierChip, Chev } from '../../components/Chips';
import { DonutChart, DonutLegend, TrendLine } from '../../components/charts';
import { INR, INRc, istDate, shortCd } from '../../lib/format';
import { countMed, nowMs, shortTarget, totalAtRisk, urgency } from '../../sim/selectors';
import { FeedRow } from '../details/slides';

function CaseRow({ c }: { c: Case }) {
  const openSlide = useStore((s) => s.openSlide);
  const cd =
    c.tier === 'T4' ? 'WATCH' : c._st === 'elapsed' ? 'ELAPSED' : shortCd(Math.max(0, countMed(c)));
  return (
    <div className="lrow" onClick={() => openSlide({ kind: 'case', id: c.id })}>
      <span className="lr-id">#{c.short}</span>
      <TierChip t={c.tier} />
      <span className="lr-amt" style={c._st === 'win' ? { color: 'var(--red)' } : undefined}>
        {INRc(c.amount)}
      </span>
      <span className="lr-target">{shortTarget(c)}</span>
      <span
        className="lr-cd mono"
        style={{ color: c._st === 'win' ? 'var(--red)' : c._st === 'elapsed' ? 'var(--tx3)' : 'var(--tx2)' }}
      >
        {cd}
      </span>
      <Chev />
    </div>
  );
}

export function OverviewPage() {
  const tick = useStore((s) => s.tickId);
  void tick;
  const cases = useStore((s) => s.cases);
  const feed = useStore((s) => s.feed);
  const trend7 = useStore((s) => s.trend7);
  const frozenYTD = useStore((s) => s.frozenYTD);
  const frozen0 = useStore((s) => s.frozen0);
  const recoveredYTD = useStore((s) => s.recoveredYTD);
  const recovered0 = useStore((s) => s.recovered0);
  const spawned = useStore((s) => s.spawned);
  const openSlide = useStore((s) => s.openSlide);

  const ar = totalAtRisk();
  const prev = useRef<number | null>(null);
  const prevT = useRef<number>(nowMs());
  let bleed: string | null = null;
  if (prev.current != null && prev.current > ar) {
    const dt = (nowMs() - prevT.current) / 1000;
    const dpm = ((prev.current - ar) * 60) / dt;
    bleed = '▾ −' + INR(Math.max(0, dpm)) + ' / MIN';
  }
  prev.current = ar;
  prevT.current = nowMs();

  const counts: Record<Tier, number> = { T1: 0, T2: 0, T3: 0, T4: 0 };
  cases.forEach((c) => counts[c.tier]++);
  const sorted = [...cases].sort(urgency);

  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">01</span>
        <span className="pg-title">Overview</span>
        <span className="pg-sub">{istDate(nowMs())} · I4C CENTRAL · CLICK ANY ROW FOR DETAIL</span>
      </div>
      <div className="scgrid">
        <StatCard label="ACTIVE CASES" value={cases.length} delta={spawned ? '+' + spawned + ' TODAY' : 'LIVE'} deltaClass="nt" />
        <StatCard
          label="FUNDS AT RISK"
          value={INRc(ar)}
          delta={bleed ?? 'MONITORING'}
          deltaClass={bleed ? 'dn' : 'nt'}
        />
        <StatCard
          label="FROZEN · YTD"
          value={INRc(frozenYTD)}
          delta={'+' + INRc(Math.max(0, frozenYTD - frozen0)) + ' SESSION'}
          deltaClass="up"
        />
        <StatCard
          label="RECOVERED · YTD"
          value={INRc(recoveredYTD)}
          delta={'+' + INRc(Math.max(0, recoveredYTD - recovered0)) + ' SESSION'}
          deltaClass="up"
        />
      </div>
      <div className="ov-grid">
        <Panel
          icon="target"
          title="HIGH-PRIORITY CASES"
          meta={<span>{cases.length} active</span>}
        >
          <div>
            {sorted.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
          </div>
        </Panel>
        <div className="ov-right">
          <Panel icon="shield" title="FORECAST CONFIDENCE">
            <div className="p-body donut-wrap">
              <DonutChart counts={counts} />
              <DonutLegend counts={counts} onTier={(t) => openSlide({ kind: 'tier', tier: t })} />
            </div>
          </Panel>
          <Panel icon="pulse" title="COMPLAINTS · 7 DAYS">
            <div className="p-body">
              <TrendLine v={trend7} labels={['12', '13', '14', '15', '16', '17', '18']} />
              <div className="chart-cap">
                NCRP filings · <b>{trend7[6]} today</b> · peak {Math.max(...trend7)} on 18 SEP
              </div>
            </div>
          </Panel>
          <Panel
            icon="live"
            title="LIVE"
            meta={
              <button className="linkbtn" onClick={() => openSlide({ kind: 'feed' })}>
                VIEW ALL
              </button>
            }
          >
            <div className="feed">
              {feed.slice(0, 4).map((e, i) => (
                <FeedRow key={i} t={e.t} type={e.type} html={e.html} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
