import { PAGES_ORDER, PAGE_META } from '../data/constants';
import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import { nowMs, unackedAlerts, windowsOpen } from '../sim/selectors';
import { istDate } from '../lib/format';

export function Sidebar() {
  const page = useStore((s) => s.page);
  const goto = useStore((s) => s.goto);
  const tick = useStore((s) => s.tickId);
  const win = windowsOpen();
  const pend = unackedAlerts();
  void tick;
  return (
    <aside className="sidebar">
      <div className="brand">
        <svg className="brand-glyph" viewBox="0 0 34 34">
          <rect x={1} y={1} width={32} height={32} rx={8} fill="none" stroke="#8B7CF6" strokeWidth={1.4} />
          <circle cx={17} cy={17} r={7.5} fill="none" stroke="#8B7CF6" strokeWidth={1.4} strokeDasharray="3.5 3.5" />
          <circle cx={17} cy={17} r={2.2} fill="#8B7CF6" />
          <path d="M17 4v4M17 26v4M4 17h4M26 17h4" stroke="#8B7CF6" strokeWidth={1.4} />
        </svg>
        <div>
          <div className="brand-name">
            OVI
          </div>
          <div className="brand-sub">INTERDICTION PLATFORM</div>
        </div>
      </div>
      <nav className="nav">
        {PAGES_ORDER.map((k) => {
          const p = PAGE_META[k];
          const badge = k === 'cashout' ? win : k === 'alerts' ? pend : 0;
          return (
            <div key={k} className={'nav-item' + (k === page ? ' on' : '')} onClick={() => goto(k)}>
              <span className="nav-num">{p.num}</span>
              <Icon n={p.icon} />
              <span>{p.title}</span>
              {badge > 0 && (
                <span className="nav-badge" style={{ display: '' }}>
                  {badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        I4C · NCRP / CFCFRMS
        <br />
        v3.4.1 · RYZENUP · {istDate(nowMs())}
        <br />
        <span style={{ color: 'var(--t4)' }}>SYNTHETIC DEMO DATA</span>
      </div>
    </aside>
  );
}
