import type { Tier } from '../types';
import { BANKS } from '../data/constants';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { hexN } from '../lib/rng';

export function TierChip({ t, pulse }: { t: Tier; pulse?: boolean }) {
  return (
    <span className={'tier ' + t.toLowerCase() + (pulse ? ' pulse' : '')}>
      <i />
      {t}
    </span>
  );
}

export function BankChip({ b }: { b: string }) {
  return (
    <span className="bk">
      <i style={{ background: BANKS[b] }} />
      {b}
    </span>
  );
}

/** Click-to-copy hash chip; the digest is derived deterministically from the seed. */
export function HashChip({ seed }: { seed: string }) {
  const copyHash = useStore((s) => s.copyHash);
  return (
    <span
      className="hchip"
      onClick={(e) => {
        e.stopPropagation();
        copyHash('0x' + hexN(seed, 16));
      }}
    >
      <Icon n="hash" s={10} /> 0x{hexN(seed, 6)}…
    </span>
  );
}

export function PBar({ p, sm }: { p: number; sm?: boolean }) {
  const color = p >= 0.85 ? '#F87171' : p >= 0.7 ? '#FB923C' : p >= 0.5 ? '#FBBF24' : '#818DA8';
  return (
    <span>
      <span className={'pbar' + (sm ? ' sm' : '')}>
        <i style={{ width: (p * 100).toFixed(0) + '%', background: color }} />
      </span>
      <span className="pbv mono">{p.toFixed(2)}</span>
    </span>
  );
}

/** Renders trusted internal HTML fragments (feed lines, narrations with <b>). */
export function HTM({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Cell({ k, v, big }: { k: string; v: React.ReactNode; big?: boolean }) {
  return (
    <div>
      <div className="k">{k}</div>
      <div className={'v' + (big ? ' big' : '')}>{v}</div>
    </div>
  );
}

export const Chev = ({ s = 12 }: { s?: number }) => <span className="lr-chev"><Icon n="chevr" s={s} /></span>;
