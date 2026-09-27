import { useStore } from '../../store/useStore';
import { Icon } from '../../components/Icon';
import { Panel } from '../../components/Panel';
import { TierChip, Chev } from '../../components/Chips';
import { INRc, shortCd } from '../../lib/format';
import { ago, elapsedSec, urgency } from '../../sim/selectors';
import type { Case } from '../../types';

function windowPill(c: Case): { text: string; cls: string } {  if (c.tier === 'T4') return { text: 'WATCH', cls: 'elapsed' };
  if (c._st === 'elapsed') return { text: 'ELAPSED', cls: 'elapsed' };
  if (c._st === 'win') return { text: 'CLOSES ' + shortCd(Math.max(0, c.p90 - elapsedSec(c))), cls: 'win' };
  return { text: 'OPENS ' + shortCd(Math.max(0, c.p10 - elapsedSec(c))), cls: 'pre' };
}

export function ComplaintsPage() {
  const tick = useStore((s) => s.tickId);
  void tick;
  const cases = useStore((s) => s.cases);
  const openSlide = useStore((s) => s.openSlide);
  const spawnCase = useStore((s) => s.spawnCase);
  const q = [...cases].sort(urgency);
  const open = cases.filter((c) => c._st === 'win').length;

  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">02</span>
        <span className="pg-title">Complaints</span>
        <span className="pg-sub">
          {q.length} ACTIVE · {open} WINDOW OPEN · TRIAGE ORDER · CLICK A CASE FOR THE FULL FILE
        </span>
      </div>
      <Panel
        icon="inbox"
        title="NCRP QUEUE · BY URGENCY"
        meta={
          <>
            <span>{open} actionable</span> ·{' '}
            <button className="linkbtn" onClick={() => spawnCase()}>
              <Icon n="bolt" s={10} /> FILE TEST COMPLAINT
            </button>
          </>
        }
      >
        <div>
          {q.map((c) => {
            const pill = windowPill(c);
            return (
              <div
                key={c.id}
                className={'lrow' + (c._st === 'win' ? ' win' : '')}
                onClick={() => openSlide({ kind: 'case', id: c.id })}
              >
                <span className="lr-id">#{c.short}</span>
                <TierChip t={c.tier} />
                <span className="lr-target">
                  {c.scam} · {c.city}
                </span>
                <span className="lr-amt" style={c._st === 'win' ? { color: 'var(--red)' } : undefined}>
                  {INRc(c.amount)}
                </span>
                <span className={'lr-state ' + pill.cls}>{pill.text}</span>
                <span className="lr-cd mono" style={{ width: 'auto', color: 'var(--tx3)', fontSize: 10 }}>
                  {ago(c.filedAt)}
                </span>
                <Chev />
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
