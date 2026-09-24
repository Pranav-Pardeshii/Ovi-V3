import { Fragment, useState } from 'react';
import type { Alert } from '../../types';
import { useStore } from '../../store/useStore';
import { Icon } from '../../components/Icon';
import { Panel } from '../../components/Panel';
import { HashChip, TierChip } from '../../components/Chips';
import { istTime } from '../../lib/format';
import { TIERM } from '../../data/constants';

const CHANNELS = ['ALL', 'SMS', 'EMAIL', 'API', 'DASH'] as const;
const CH_ICON: Record<Alert['ch'], string> = { SMS: 'sms', EMAIL: 'mail', API: 'api', DASH: 'gauge' };

export function AlertsPage() {
  const tick = useStore((s) => s.tickId);
  void tick;
  const alerts = useStore((s) => s.alerts);
  const dispatched24 = useStore((s) => s.dispatched24);
  const reDispatch = useStore((s) => s.reDispatch);
  const [filter, setFilter] = useState<(typeof CHANNELS)[number]>('ALL');
  const [open, setOpen] = useState(-1);

  const rows = alerts.filter((a) => filter === 'ALL' || a.ch === filter);

  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">07</span>
        <span className="pg-title">Alert Dispatch</span>
        <span className="pg-sub">SMS · EMAIL · API · DASHBOARD · CLICK A ROW TO EXPAND</span>
      </div>
      <Panel icon="bell" title="DISPATCH LOG · 24H" meta={<span>{dispatched24} dispatched</span>}>
        <div
          style={{
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            padding: '10px 14px',
          }}
        >
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              className={'filtchip' + (filter === ch ? ' on' : '')}
              onClick={() => {
                setFilter(ch);
                setOpen(-1);
              }}
            >
              {ch}
            </button>
          ))}
        </div>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>TIME</th>
                <th>CHANNEL</th>
                <th>RECIPIENT</th>
                <th>DELIVERY</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const dots =
                  a.status === 'acked' ? (
                    <>
                      <i className="done" />
                      <i className="done" />
                      <i className="done" />
                    </>
                  ) : a.status === 'delivered' ? (
                    <>
                      <i className="done" />
                      <i className="done" />
                      <i className="pend" />
                    </>
                  ) : (
                    <>
                      <i className="done" />
                      <i className="pend" />
                      <i className="pend" />
                    </>
                  );
                const lbl =
                  a.status === 'acked' ? (
                    <span className="mono" style={{ color: 'var(--grn)', fontSize: 10 }}>
                      ACKED {a.ack}s
                    </span>
                  ) : a.status === 'delivered' ? (
                    <span className="mono" style={{ color: 'var(--amber)', fontSize: 10 }}>
                      DELIVERED
                    </span>
                  ) : (
                    <span className="mono" style={{ color: 'var(--amber)', fontSize: 10 }}>
                      IN FLIGHT
                    </span>
                  );
                return (
                  <Fragment key={i}>
                    <tr onClick={() => setOpen(open === i ? -1 : i)}>
                      <td className="num" style={{ color: 'var(--tx3)' }}>
                        {istTime(a.t)}
                      </td>
                      <td className="mono" style={{ fontSize: 10.5 }}>
                        <Icon n={CH_ICON[a.ch]} s={12} /> {a.ch}
                      </td>
                      <td style={{ fontSize: 11.5 }}>{a.to}</td>
                      <td>
                        <span className="chain">{dots}</span> {lbl}
                      </td>
                    </tr>
                    <tr className="al-detail" style={{ display: open === i ? 'table-row' : 'none' }}>
                      <td colSpan={4}>
                        <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                          <TierChip t={a.tier} />
                          <span className="sub-note">
                            {a.tier} · {TIERM[a.tier].n}
                          </span>
                        </div>
                        <div className="al-msg">{a.msg}</div>
                        <div className="al-tl">
                          <span>
                            DISPATCHED <b>{istTime(a.t)}</b>
                          </span>
                          <span>
                            DELIVERED <b>{istTime(a.t + 2000)}</b>
                          </span>
                          <span>
                            ACK <b>{a.status === 'acked' ? a.ack + 's' : '+ pending'}</b>
                          </span>
                          <span>
                            ANCHOR <HashChip seed={'al' + i + a.t} />
                          </span>
                          {a.status !== 'acked' && (
                            <button
                              className="btn"
                              style={{ marginLeft: 'auto' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                reDispatch(alerts.indexOf(a));
                              }}
                            >
                              <Icon n="bell" s={10} /> RE-DISPATCH
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
