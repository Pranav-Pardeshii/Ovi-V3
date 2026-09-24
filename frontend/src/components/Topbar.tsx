import { useEffect, useRef, useState } from 'react';
import { PAGE_META } from '../data/constants';
import { useStore } from '../store/useStore';
import { istTime } from '../lib/format';
import { nowMs } from '../sim/selectors';

const SPEEDS = [1, 20, 120];

export function Topbar() {
  const page = useStore((s) => s.page);
  const speed = useStore((s) => s.speed);
  const setSpeed = useStore((s) => s.setSpeed);
  const tick = useStore((s) => s.tickId);
  const liveSeq = useStore((s) => s.liveSeq);
  const [hot, setHot] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setHot(true);
    const t = setTimeout(() => setHot(false), 700);
    return () => clearTimeout(t);
  }, [liveSeq]);
  void tick;

  const meta = PAGE_META[page];
  return (
    <header className="topbar">
      <div className="tb-left">
        <span className="tb-crumb">{meta.crumb}</span>
        <span style={{ color: 'var(--line2)' }}>/</span>
        <span className="tb-title">{meta.title}</span>
      </div>
      <div className="tb-right">
        <span className={'livepill' + (hot ? ' hot' : '')}>
          <i />
          SIMULATION
        </span>
        <span className="tb-clock">{istTime(nowMs())} IST</span>
        <div className="speedctl">
          <span>SPEED</span>
          {SPEEDS.map((sp) => (
            <button key={sp} data-sp={sp} className={sp === speed ? 'on' : ''} onClick={() => setSpeed(sp)}>
              {sp}×
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
