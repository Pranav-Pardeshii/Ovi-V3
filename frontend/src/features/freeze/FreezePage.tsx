import { useStore } from '../../store/useStore';
import { Icon } from '../../components/Icon';
import { Panel, StatCard } from '../../components/Panel';
import { BankChip, PBar } from '../../components/Chips';
import { INR, INRc, hms, p2 } from '../../lib/format';
import { allMules, freezeRows, muleBal, nowMs } from '../../sim/selectors';

function ActCell({ status, sentAt, onDraft }: { status: string; sentAt: number; onDraft: () => void }) {
  if (status === 'sent') {
    const left = Math.max(0, 900 - (nowMs() - sentAt) / 1000);
    return <span className={'sla-t' + (left < 180 ? '' : ' ok')}>TRANSMITTED · SLA {hms(left)}</span>;
  }
  return (
    <button
      className="btn"
      onClick={(e) => {
        e.stopPropagation();
        onDraft();
      }}
    >
      <Icon n="arrow" s={10} /> DRAFT REQUEST
    </button>
  );
}

export function FreezePage() {
  const tick = useStore((s) => s.tickId);
  void tick;
  const openSlide = useStore((s) => s.openSlide);
  const frozenYTD = useStore((s) => s.frozenYTD);
  const confirmedSeed = useStore((s) => s.confirmedSeed);
  const rows = freezeRows();
  const accounts = allMules();
  const liveConfirmed = accounts.filter((x) => x.m.frozen);
  const tot =
    liveConfirmed.reduce((s, x) => s + x.m.frozenAmt, 0) + confirmedSeed.reduce((s, f) => s + f.amt, 0);

  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">06</span>
        <span className="pg-title">Freeze Priority</span>
        <span className="pg-sub">RANKED BY EXPECTED RECOVERABLE · CFCFRMS · 15:00 SLA</span>
      </div>
      <div className="fzgrid">
        <StatCard label="QUEUE" value={rows.filter((r) => r.m.status === 'queue').length} valueStyle={{ fontSize: 19 }} />
        <StatCard
          label="TRANSMITTED"
          value={accounts.filter((x) => x.m.status === 'sent').length}
          valueStyle={{ fontSize: 19, color: 'var(--amber)' }}
        />
        <StatCard
          label="CONFIRMED"
          value={liveConfirmed.length + confirmedSeed.length}
          valueStyle={{ fontSize: 19, color: 'var(--grn)' }}
        />
        <StatCard label="FROZEN · YTD" value={INRc(frozenYTD)} valueStyle={{ fontSize: 19 }} />
        <StatCard label="AVG CONFIRM" value="08:32" valueStyle={{ fontSize: 19 }} />
        <StatCard label="SLA COMPLIANCE" value="94%" valueStyle={{ fontSize: 19 }} />
      </div>
      <Panel icon="lock" title="PRIORITY QUEUE" meta={<span>click a row to draft / inspect</span>}>
        <div>
          {rows.map((r, i) => (
            <div
              key={r.m.tok}
              className="frow"
              onClick={() =>
                r.m.status === 'queue'
                  ? openSlide({ kind: 'draft', caseId: r.c.id, tok: r.m.tok })
                  : openSlide({ kind: 'mule', tok: r.m.tok })
              }
            >
              <span className="fr-pri mono">{p2(i + 1)}</span>
              <span className="fr-tok mono">{r.m.tok}</span>
              <span className="fr-bank">
                <BankChip b={r.m.bank} />
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <PBar p={r.m.p} sm />
              </span>
              <span className="fr-bal mono">{INR(muleBal(r.c, r.m))}</span>
              <span
                className="fr-act"
                onClick={(e) => {
                  if (r.m.status === 'queue') {
                    e.stopPropagation();
                    openSlide({ kind: 'draft', caseId: r.c.id, tok: r.m.tok });
                  }
                }}
              >
                <ActCell
                  status={r.m.status}
                  sentAt={r.m.sentAt}
                  onDraft={() => openSlide({ kind: 'draft', caseId: r.c.id, tok: r.m.tok })}
                />
              </span>
            </div>
          ))}
          {!rows.length && (
            <div className="sub-note" style={{ padding: '18px 16px' }}>
              Queue empty — every actionable mule is frozen or elapsed.
            </div>
          )}
        </div>
      </Panel>
      <div style={{ height: 13 }} />
      <Panel
        icon="check"
        title="CONFIRMED · ON-CHAIN"
        meta={
          <>
            <span>
              {liveConfirmed.length + confirmedSeed.length} · {INRc(tot)} secured
            </span>{' '}
            ·{' '}
            <button className="linkbtn" onClick={() => openSlide({ kind: 'ledger' })}>
              VIEW LEDGER
            </button>
          </>
        }
      >
        <div style={{ height: 0 }} />
      </Panel>
    </div>
  );
}
