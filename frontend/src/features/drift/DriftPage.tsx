import type { Slide } from '../../types';
import { useStore } from '../../store/useStore';
import { StatCard } from '../../components/Panel';
import { Icon } from '../../components/Icon';

interface Card {
  icon: string;
  l: string;
  v: string;
  d: string;
  cls: 'up' | 'dn' | 'nt';
  dotCls?: string;
  slide: Slide['kind'];
}

const CARDS: Card[] = [
  { icon: 'target', l: 'CALIBRATION', v: 'ECE 1.9%', d: 'OK · target < 5%', cls: 'up', slide: 'cal' },
  { icon: 'pulse', l: 'AUC-ROC', v: '0.931', d: 'OK · target > 0.92', cls: 'up', slide: 'auc' },
  { icon: 'warn', l: 'FEATURE DRIFT', v: 'PSI 0.27', d: 'ACTION · velocity_ratio', cls: 'dn', dotCls: 'warn', slide: 'psi' },
  { icon: 'hash', l: 'MODEL REGISTRY', v: 'v3.4.1', d: 'current · 3 superseded', cls: 'nt', slide: 'registry' },
];

export function DriftPage() {
  const openSlide = useStore((s) => s.openSlide);
  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">08</span>
        <span className="pg-title">Model Assurance</span>
        <span className="pg-sub">CALIBRATION · DRIFT · REGISTRY · CLICK A CARD FOR DETAIL</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-[13px]">
        {CARDS.map((c) => (
          <div
            key={c.l}
            className="statcard cursor-pointer"
            onClick={() => openSlide({ kind: c.slide } as Slide)}
          >
            <div className="sc-l">{c.l}</div>
            <div className="sc-v">{c.v}</div>
            <div className={'sc-d ' + c.cls}>
              <span className={'dot' + (c.dotCls ? ' ' + c.dotCls : '')} />
              {c.d}
            </div>
            <div className="mt-[11px]">
              <span className="linkbtn">
                DETAILS <Icon n="chevr" s={9} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
