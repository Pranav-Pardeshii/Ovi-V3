import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Icon } from '../../components/Icon';
import { Panel } from '../../components/Panel';
import { INRc, clamp } from '../../lib/format';
import { BANKS, pColor } from '../../data/constants';
import { buildGraph, hull, type GEdge, type GNode } from '../../sim/graph';
import { muleBal, selCaseC, nowMs } from '../../sim/selectors';

const anchorX = (nd: GNode) => {
  if (nd.type === 'victim') return 110;
  if (nd.id === 'H1') return 340;
  if (nd.id === 'H2') return 560;
  if (nd.type === 'atm') return 880;
  return 760;
};

export function GraphPage() {
  const tick = useStore((s) => s.tickId);
  void tick;
  const cases = useStore((s) => s.cases);
  const selCase = useStore((s) => s.selCase);
  const selectCase = useStore((s) => s.selectCase);
  const openSlide = useStore((s) => s.openSlide);

  const cur = selCaseC();
  const caseId = cur?.id ?? null;
  const [hops, setHops] = useState(4);
  const [replaying, setReplaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hopsRef = useRef(hops);
  const replayRef = useRef<{ t0: number; maxSeq: number } | null>(null);
  const setReplayingRef = useRef(setReplaying);
  setReplayingRef.current = setReplaying;

  hopsRef.current = hops;

  useEffect(() => {
    if (!caseId) return;
    const c = useStore.getState().cases.find((x) => x.id === caseId);
    if (!c) return;
    const G = buildGraph(c);
    const wrap = wrapRef.current!;
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d')!;
    const tip = tipRef.current!;

    let W = 0,
      H = 0,
      dpr = 1,
      sc = 1,
      ox = 0,
      oy = 0,
      dash = 0,
      dead = false;
    let hover: GNode | null = null;
    let drag: GNode | null = null;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(50, r.width * dpr);
      cv.height = Math.max(50, r.height * dpr);
      W = r.width;
      H = r.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const visSet = () => {
      const dep: Record<number, number> = { 0: 0 };
      const q = [0];
      const adj: Record<number, number[]> = {};
      G.e.forEach((ed) => {
        (adj[ed.a] = adj[ed.a] || []).push(ed.b);
      });
      while (q.length) {
        const u = q.shift()!;
        (adj[u] || []).forEach((v) => {
          if (!(v in dep)) {
            dep[v] = dep[u] + 1;
            q.push(v);
          }
        });
      }
      return new Set(G.n.map((nd, i) => (dep[i] !== undefined && dep[i] <= hopsRef.current ? i : -1)).filter((i) => i >= 0));
    };
    let vis = visSet();

    const step = () => {
      const at = nowMs();
      for (let i = 0; i < G.n.length; i++) {
        const a = G.n[i];
        for (let j = i + 1; j < G.n.length; j++) {
          const b = G.n[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const d2 = Math.max(dx * dx + dy * dy, 140);
          const d = Math.sqrt(d2);
          const f = Math.min(3200 / d2, 3.2);
          const nx = dx / d,
            ny = dy / d;
          a.vx += nx * f * 0.5;
          a.vy += ny * f * 0.5;
          b.vx -= nx * f * 0.5;
          b.vy -= ny * f * 0.5;
        }
        a.vx += (anchorX(a) - a.x) * 0.009;
        a.vy += (280 - a.y) * 0.003;
      }
      G.e.forEach((ed) => {
        const a = G.n[ed.a],
          b = G.n[ed.b];
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = clamp((d - 175) * 0.005, -1.6, 1.6);
        const nx = dx / d,
          ny = dy / d;
        a.vx += nx * f;
        a.vy += ny * f;
        b.vx -= nx * f;
        b.vy -= ny * f;
      });
      void at;
      G.n.forEach((nd) => {
        nd.vx = clamp(nd.vx * 0.84, -2.4, 2.4);
        nd.vy = clamp(nd.vy * 0.84, -2.4, 2.4);
        if (nd !== drag) {
          nd.x += nd.vx;
          nd.y += nd.vy;
          nd.x = clamp(nd.x, 40, 940);
          nd.y = clamp(nd.y, 36, 544);
        }
      });
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      sc = Math.min(W / 980, H / 560);
      ox = (W - 980 * sc) / 2;
      oy = (H - 560 * sc) / 2;
      ctx.translate(ox, oy);
      ctx.scale(sc, sc);
      dash -= 0.45;

      // Leiden community hulls
      [0, 1].forEach((cm) => {
        const pts = G.n.filter((nd, i) => vis.has(i) && nd.comm === cm).map((nd) => ({ x: nd.x, y: nd.y }));
        if (pts.length < 3) return;
        const h = hull(pts);
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        ctx.beginPath();
        h.forEach((p, i) => {
          const px = cx + (p.x - cx) * 1.28,
            py = cy + (p.y - cy) * 1.28;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = cm ? 'rgba(139,124,246,0.05)' : 'rgba(56,189,248,0.05)';
        ctx.strokeStyle = cm ? 'rgba(139,124,246,0.3)' : 'rgba(56,189,248,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 5]);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = cm ? 'rgba(172,159,249,.55)' : 'rgba(56,189,248,.55)';
        ctx.font = '9px IBM Plex Mono';
        ctx.fillText('LEIDEN C' + (cm + 1) + ' · n=' + pts.length, h[0].x, h[0].y - 10);
      });

      // edges
      G.e.forEach((ed) => {
        if (!vis.has(ed.a) || !vis.has(ed.b)) return;
        const a = G.n[ed.a],
          b = G.n[ed.b];
        const rep = replayRef.current;
        const lit = rep && ed.seq <= rep.maxSeq;
        const dimmed = rep && !lit;
        ctx.globalAlpha = dimmed ? 0.22 : 1;
        ctx.strokeStyle = ed.forecast ? 'rgba(248,113,113,.55)' : 'rgba(166,175,198,.3)';
        ctx.lineWidth = Math.max(1, Math.log10(ed.amount) * 0.7 - 1.6);
        if (ed.forecast || rep) {
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = dash;
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / d,
          uy = dy / d;
        const ax = b.x - ux * 20,
          ay = b.y - uy * 20;
        ctx.beginPath();
        ctx.moveTo(ax + ux * 7, ay + uy * 7);
        ctx.lineTo(ax - uy * 4.5, ay + ux * 4.5);
        ctx.lineTo(ax + uy * 4.5, ay - ux * 4.5);
        ctx.closePath();
        ctx.fillStyle = ed.forecast ? 'rgba(248,113,113,.7)' : 'rgba(166,175,198,.5)';
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // replay pulse
      const rep = replayRef.current;
      if (rep && rep.maxSeq >= 0) {
        const es = [...G.e].sort((a, b) => a.seq - b.seq);
        const idx = Math.min(es.length - 1, rep.maxSeq);
        const e = es[idx];
        const el = performance.now() - rep.t0;
        const per = 680;
        const qq = (el % per) / per;
        const s = qq * qq * (3 - 2 * qq);
        const a = G.n[e.a],
          b = G.n[e.b];
        const px = a.x + (b.x - a.x) * s;
        const py = a.y + (b.y - a.y) * s;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, 7);
        ctx.fillStyle = 'rgba(172,159,249,.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 13, 0, 7);
        ctx.strokeStyle = 'rgba(172,159,249,.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = '600 10px IBM Plex Mono';
        ctx.fillStyle = '#AC9FF9';
        ctx.fillText(INRc(e.amount), px + 14, py - 8);
      }

      // nodes
      G.n.forEach((nd, i) => {
        if (!vis.has(i)) return;
        const R = nd.type === 'victim' ? 15 : nd.type === 'atm' ? 12 : (nd.p ?? 0) > 0.9 ? 10 : 8;
        const rep = replayRef.current;
        const dimmed = rep && !nd.lit && nd.type !== 'victim';
        ctx.globalAlpha = dimmed ? 0.25 : 1;
        if (nd === hover) {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, R + 9, 0, 7);
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(238,241,248,.6)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (nd.lit) {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, R + 6, 0, 7);
          ctx.fillStyle = 'rgba(172,159,249,.16)';
          ctx.fill();
        }
        if (nd.type === 'atm') {
          ctx.fillStyle = '#12141C';
          ctx.strokeStyle = BANKS[nd.bank] || '#818DA8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          if ('roundRect' in ctx) (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(nd.x - R, nd.y - R, R * 2, R * 2, 3);
          else (ctx as any).rect(nd.x - R, nd.y - R, R * 2, R * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, R, 0, 7);
          ctx.fillStyle = '#12141C';
          ctx.fill();
          ctx.strokeStyle = BANKS[nd.bank] || '#818DA8';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (nd.type === 'victim') {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, R + 4, 0, 7);
          ctx.strokeStyle = '#8B7CF6';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        if (nd.type === 'mule') {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, R + 4.5, -Math.PI / 2, -Math.PI / 2 + (nd.p ?? 0) * Math.PI * 2);
          ctx.strokeStyle = pColor(nd.p ?? 0);
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
        ctx.font = '9px IBM Plex Mono';
        ctx.fillStyle = nd.type === 'victim' ? '#8B7CF6' : '#6E7994';
        ctx.textAlign = 'center';
        ctx.fillText(nd.type === 'victim' ? 'VICTIM' : nd.type === 'atm' ? nd.label!.slice(-7) : nd.tok!.slice(4), nd.x, nd.y + R + 13);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      });
    };

    const advanceRep = () => {
      const rep = replayRef.current;
      if (!rep) return;
      const per = 680;
      const el = performance.now() - rep.t0;
      const es: GEdge[] = [...G.e].sort((a, b) => a.seq - b.seq);
      const idx = Math.min(es.length - 1, (el / per) | 0);
      if (idx > rep.maxSeq) {
        rep.maxSeq = idx;
        G.n[es[idx].b].lit = true;
        G.n[es[idx].a].lit = true;
      }
      if (el > es.length * per + 1700) {
        G.n.forEach((nd) => (nd.lit = false));
        replayRef.current = null;
        setReplayingRef.current(false);
      }
    };

    const toLogical = (ev: MouseEvent) => {
      const r = wrap.getBoundingClientRect();
      return { x: (ev.clientX - r.left - ox) / sc, y: (ev.clientY - r.top - oy) / sc };
    };
    const pick = (p: { x: number; y: number }) => {
      let best: GNode | null = null;
      let bd = 1e9;
      for (let i = 0; i < G.n.length; i++) {
        if (!vis.has(i)) continue;
        const nd = G.n[i];
        const d = Math.hypot(nd.x - p.x, nd.y - p.y);
        if (d < bd) {
          bd = d;
          best = nd;
        }
      }
      return bd < 26 ? best : null;
    };

    const onMove = (ev: MouseEvent) => {
      const p = toLogical(ev);
      if (drag) {
        drag.x = clamp(p.x, 30, 950);
        drag.y = clamp(p.y, 30, 550);
        drag.vx = drag.vy = 0;
        return;
      }
      hover = pick(p);
      cv.style.cursor = hover ? 'pointer' : 'grab';
      const cNow = c;
      if (hover) {
        tip.classList.add('show');
        const r = wrap.getBoundingClientRect();
        tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 240) + 'px';
        tip.style.top = ev.clientY - r.top + 10 + 'px';
        tip.innerHTML =
          hover.type === 'mule'
            ? `<b>${hover.tok}</b> · ${hover.bank}<br>P(mule) <b style="color:${pColor(hover.p ?? 0)}">${(hover.p ?? 0).toFixed(2)}</b> · bal ${INRc(hover.mule ? muleBal(cNow, hover.mule) : 0)}`
            : hover.type === 'atm'
              ? `<b>${hover.label}</b><br>ATM forecast node · ${hover.bank}`
              : hover.type === 'victim'
                ? `<b>VICTIM</b> · ${hover.bank}<br>${INRc(cNow.amount)} at stake`
                : `<b>${hover.tok}</b> · ${hover.bank}<br>intermediate hop`;
      } else tip.classList.remove('show');
    };
    const onLeave = () => {
      hover = null;
      tip.classList.remove('show');
    };
    const onDown = (ev: MouseEvent) => {
      const nd = pick(toLogical(ev));
      if (nd) {
        drag = nd;
        cv.style.cursor = 'grabbing';
      }
    };
    const onUp = () => {
      drag = null;
    };
    const onClick = (ev: MouseEvent) => {
      const nd = pick(toLogical(ev));
      if (nd) openSlide({ kind: 'node', node: nd, caseId: c.id });
    };

    cv.addEventListener('mousemove', onMove);
    cv.addEventListener('mouseleave', onLeave);
    cv.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    cv.addEventListener('click', onClick);

    let raf = 0;
    const frame = () => {
      if (dead) return;
      step();
      draw();
      advanceRep();
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener('mousemove', onMove);
      cv.removeEventListener('mouseleave', onLeave);
      cv.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      cv.removeEventListener('click', onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const startReplay = () => {
    replayRef.current = { t0: performance.now(), maxSeq: -1 };
    setReplaying(true);
  };

  if (!caseId) {
    return (
      <div className="page">
        <div className="sub-note">No active cases.</div>
      </div>
    );
  }

  const c = cases.find((x) => x.id === caseId)!;

  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">03</span>
        <span className="pg-title">Graph Analysis</span>
        <span className="pg-sub">TOKENIZED ONLY · RAW PII NEVER CROSSES BANK BOUNDARY</span>
      </div>
      <Panel
        icon="graph"
        title="MONEY TRAIL"
        bodyClass="!p-2"
        meta={
          <>
            <select
              value={caseId}
              onChange={(e) => {
                selectCase(e.target.value);
                setReplaying(false);
                replayRef.current = null;
              }}
            >
              {cases.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.id} · {x.tier}
                </option>
              ))}
            </select>
            <label className="ctl">
              HOPS ≤{' '}
              <span className="mono" style={{ color: 'var(--acc)' }}>
                {hops}
              </span>
              <input
                type="range"
                min={1}
                max={4}
                value={hops}
                style={{ width: 60 }}
                onChange={(e) => setHops(+e.target.value)}
              />
            </label>
            <button className="btn pri" disabled={replaying} onClick={startReplay}>
              <Icon n="play" s={10} /> {replaying ? 'REPLAYING…' : 'REPLAY'}
            </button>
            <button className="btn" onClick={() => openSlide({ kind: 'ledger' })}>
              <Icon n="hash" s={10} /> LEDGER
            </button>
          </>
        }
      >
        <div className="gwrap" ref={wrapRef}>
          <canvas ref={canvasRef} />
          <div className="gtip" ref={tipRef} />
          <div className="mleg">
            drag nodes · hover for detail
            <br />
            click to inspect · dashed red = forecast
          </div>
        </div>
      </Panel>
    </div>
  );
}
