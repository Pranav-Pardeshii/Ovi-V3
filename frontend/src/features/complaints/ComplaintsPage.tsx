import { useStore } from '../../store/useStore';
import { Icon } from '../../components/Icon';
import { Panel } from '../../components/Panel';
import { TierChip, Chev } from '../../components/Chips';
import { INRc } from '../../lib/format';
import { ago } from '../../sim/selectors';

export function ComplaintsPage() {
  const tick = useStore((s) => s.tickId);
  void tick;
  const cases = useStore((s) => s.cases);
  const openSlide = useStore((s) => s.openSlide);
  const spawnCase = useStore((s) => s.spawnCase);
  const q = [...cases].sort((a, b) => b.filedAt - a.filedAt);

  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">02</span>
        <span className="pg-title">Complaints</span>
        <span className="pg-sub">NCRP 1930 → OVI PIPELINE · CLICK A CASE FOR THE FULL FILE</span>
      </div>
      <Panel
        icon="inbox"
        title="NCRP QUEUE"
        meta={
          <>
            {q.length} active ·{' '}
            <button className="linkbtn" onClick={() => spawnCase()}>
              <Icon n="bolt" s={10} /> FILE TEST COMPLAINT
            </button>
          </>
        }
      >
        <div>
          {q.map((c) => (
            <div key={c.id} className="lrow" onClick={() => openSlide({ kind: 'case', id: c.id })}>
              <span className="lr-id">#{c.short}</span>
              <TierChip t={c.tier} />
              <span className="lr-target">
                {c.scam} · {c.city}
              </span>
              <span className="lr-amt">{INRc(c.amount)}</span>
              <span className="lr-cd mono" style={{ width: 'auto', color: 'var(--tx3)', fontSize: 10 }}>
                {ago(c.filedAt)}
              </span>
              <Chev />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
