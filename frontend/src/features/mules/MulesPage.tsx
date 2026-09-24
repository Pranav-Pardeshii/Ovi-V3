import { useState } from 'react';
import type { Tier } from '../../types';
import { useStore } from '../../store/useStore';
import { Icon } from '../../components/Icon';
import { Panel } from '../../components/Panel';
import { BankChip, PBar } from '../../components/Chips';
import { BANKS } from '../../data/constants';
import { INRc } from '../../lib/format';
import { allMules } from '../../sim/selectors';

interface Filters {
  tiers: Set<Tier>;
  bank: string;
  thr: number;
  q: string;
}

const ALL_TIERS: Tier[] = ['T1', 'T2', 'T3', 'T4'];

export function MulesPage() {
  const tick = useStore((s) => s.tickId);
  void tick;
  const openSlide = useStore((s) => s.openSlide);
  const [showF, setShowF] = useState(false);
  const [tiers, setTiers] = useState<Set<Tier>>(new Set(ALL_TIERS));
  const [bank, setBank] = useState('ALL');
  const [thr, setThr] = useState(0.5);
  const [q, setQ] = useState('');

  const accounts = allMules();
  const rows = accounts
    .filter(
      (x) =>
        tiers.has(x.c.tier) &&
        (bank === 'ALL' || x.m.bank === bank) &&
        x.m.p >= thr &&
        (!q || x.m.tok.includes(q.toUpperCase())),
    )
    .sort((a, b) => b.m.p - a.m.p);

  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">04</span>
        <span className="pg-title">Mules</span>
        <span className="pg-sub">GRAPHSAGE → XGBOOST → ISOTONIC CALIBRATION · CLICK A ROW FOR SHAP</span>
      </div>
      <Panel
        icon="mule"
        title="FLAGGED ACCOUNTS"
        meta={
          <>
            <span>
              {rows.length} of {accounts.length} accounts
            </span>
            <button className="linkbtn" onClick={() => setShowF((v) => !v)}>
              <Icon n="filt" s={10} /> FILTERS
            </button>
          </>
        }
      >
        <div
          style={{
            display: showF ? 'flex' : 'none',
            borderBottom: '1px solid var(--line)',
            padding: '11px 14px',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {ALL_TIERS.map((t) => (
            <button
              key={t}
              className={'filtchip' + (tiers.has(t) ? ' on' : '')}
              onClick={() => {
                const next = new Set(tiers);
                next.has(t) ? next.delete(t) : next.add(t);
                setTiers(next);
              }}
            >
              {t}
            </button>
          ))}
          <select value={bank} onChange={(e) => setBank(e.target.value)}>
            <option>ALL BANKS</option>
            {Object.keys(BANKS).map((b) => (
              <option key={b}>
                {b}
              </option>
            ))}
          </select>
          <label className="ctl">
            P ≥ <span className="mono" style={{ color: 'var(--acc)' }}>{thr.toFixed(2)}</span>
            <input
              type="range"
              min={0.3}
              max={0.9}
              step={0.05}
              value={thr}
              onChange={(e) => setThr(+e.target.value)}
            />
          </label>
          <input
            type="text"
            placeholder="search token…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ marginLeft: 'auto', width: 150 }}
          />
        </div>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>TOKEN</th>
                <th>BANK</th>
                <th>P(MULE)</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.m.tok} onClick={() => openSlide({ kind: 'mule', tok: x.m.tok })}>
                  <td className="num" style={{ color: 'var(--tx)' }}>
                    {x.m.tok}
                  </td>
                  <td>
                    <BankChip b={x.m.bank} />
                  </td>
                  <td>
                    <PBar p={x.m.p} sm />
                  </td>
                  <td
                    className="num"
                    style={{ color: x.m.frozen ? 'var(--grn)' : x.m.status === 'sent' ? 'var(--amber)' : 'var(--tx3)' }}
                  >
                    {x.m.frozen ? 'FROZEN ' + INRc(x.m.frozenAmt) : x.m.status === 'sent' ? 'REQ SENT' : 'scored'}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="sub-note" style={{ padding: 20 }}>
                    No accounts match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
