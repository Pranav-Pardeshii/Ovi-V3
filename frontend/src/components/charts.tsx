import type { Mule, Tier } from '../types';
import { TIERM, tierColor } from '../data/constants';

/* ---------- forecast-confidence donut (overview) ---------- */
export function DonutChart({ counts }: { counts: Record<Tier, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return <div className="sub-note">No active cases.</div>;
  const R = 52;
  const C = 2 * Math.PI * R;
  let off = 0;
  const segs = (['T1', 'T2', 'T3', 'T4'] as Tier[]).map((t) => {
    const len = (counts[t] / total) * C;
    const s = (
      <circle
        key={t}
        className="dn-seg"
        cx={70}
        cy={70}
        r={R}
        fill="none"
        stroke={tierColor(t)}
        strokeWidth={15}
        strokeDasharray={`${Math.max(0, len - 2).toFixed(1)} ${(C - len + 2).toFixed(1)}`}
        strokeDashoffset={(-off).toFixed(1)}
      />
    );
    off += len;
    return s;
  });
  return (
    <svg className="donut" viewBox="0 0 140 140">
      <g transform="rotate(-90 70 70)">{segs}</g>
      <text x={70} y={67} textAnchor="middle" className="dn-n">
        {total}
      </text>
      <text x={70} y={83} textAnchor="middle" className="dn-l">
        FORECASTS
      </text>
    </svg>
  );
}

export function DonutLegend({
  counts,
  onTier,
}: {
  counts: Record<Tier, number>;
  onTier: (t: Tier) => void;
}) {
  return (
    <div className="dleg">
      {(['T1', 'T2', 'T3', 'T4'] as Tier[]).map((t) => (
        <span key={t} onClick={() => onTier(t)}>
          <i style={{ background: tierColor(t) }} />
          {t} · {TIERM[t].n} <b>{counts[t]}</b>
        </span>
      ))}
    </div>
  );
}

/* ---------- 7-day complaint trend (overview) ---------- */
export function TrendLine({ v, labels }: { v: number[]; labels: string[] }) {
  const w = 290,
    h = 100,
    L = 4,
    R = 4,
    T = 12,
    B = 16;
  const max = Math.max(...v) * 1.18;
  const X = (i: number) => L + ((w - L - R) * i) / (v.length - 1);
  const Y = (val: number) => h - B - ((h - T - B) * val) / max;
  const pts = v.map((val, i) => [X(i), Y(val)] as const);
  const line = pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = 'M' + pts[0][0].toFixed(1) + ',' + (h - B) + ' L' + line + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (h - B) + ' Z';
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="lgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8B7CF6" stopOpacity=".25" />
          <stop offset="1" stopColor="#8B7CF6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lgrad)" />
      <polyline points={line} fill="none" stroke="#8B7CF6" strokeWidth={1.8} />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p[0].toFixed(1)}
          cy={p[1].toFixed(1)}
          r={i === v.length - 1 ? 3.4 : 2.3}
          fill={i === v.length - 1 ? '#AC9FF9' : '#0B0D13'}
          stroke="#8B7CF6"
          strokeWidth={1.4}
        >
          <title>{`${labels[i]} SEP · ${v[i]} complaints`}</title>
        </circle>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={X(i).toFixed(1)} y={h - 3} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize={7.5} fill="#6E7994">
          {l}
        </text>
      ))}
    </svg>
  );
}

/* ---------- SHAP attribution chart (mule detail) ---------- */
export function ShapChart({ m }: { m: Mule }) {
  const maxV = Math.max(...m.shap.map((r) => Math.abs(r.v)));
  const W = 410,
    Lx = 128,
    ax = 214,
    rowH = 25;
  const H = m.shap.length * rowH + 14;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <line x1={ax} y1={4} x2={ax} y2={H - 6} stroke="#303851" strokeWidth={1} />
      <text x={ax - 6} y={H - 2} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={8} fill="#6E7994">
        base 0.011
      </text>
      {m.shap.map((r, i) => {
        const y = i * rowH + 14;
        const w = (Math.abs(r.v) / maxV) * 80;
        const pos = r.v > 0;
        const x = pos ? ax : ax - w;
        return (
          <g key={r.l}>
            <text x={Lx - 8} y={y + 4} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={9} fill="#A6AFC6">
              {r.l}
            </text>
            <rect x={x.toFixed(1)} y={(y - 5).toFixed(1)} width={Math.max(w, 1).toFixed(1)} height={11} rx={2} fill={pos ? '#F87171' : '#38BDF8'} opacity={0.9} />
            <text
              x={(pos ? ax + w + 6 : ax - w - 6).toFixed(1)}
              y={y + 4}
              textAnchor={pos ? 'start' : 'end'}
              fontFamily="IBM Plex Mono"
              fontSize={8.5}
              fill="#6E7994"
            >
              {(r.v > 0 ? '+' : '') + r.v.toFixed(3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
