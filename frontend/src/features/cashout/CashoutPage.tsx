import { useEffect, useRef } from 'react';
import type { Case } from '../../types';
import { useStore } from '../../store/useStore';
import { Icon } from '../../components/Icon';
import { Panel } from '../../components/Panel';
import { BankChip, TierChip } from '../../components/Chips';
import { INRc, clamp, hms, istHM, shortCd } from '../../lib/format';
import { CITIES, RAILC, RAILN, pColor, tierColor } from '../../data/constants';
import { atRisk, countMed, elapsedSec, nowMs, selCaseC, shortTarget, urgency } from '../../sim/selectors';
import L from 'leaflet';

/* ---------- Leaflet forecast map (keyless Esri dark-gray basemap + fallback) ---------- */

function ForecastMap({ c }: { c: Case }) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupsRef = useRef<{ mark: L.LayerGroup; dens: L.LayerGroup; zone: L.LayerGroup } | null>(null);
  const selAtm = useStore((s) => s.selAtm);
  const selectAtm = useStore((s) => s.selectAtm);
  const selRef = useRef(selAtm);
  selRef.current = selAtm;

  useEffect(() => {
    const map = L.map(divRef.current!, { zoomControl: true, center: [22.6, 79.6], zoom: 5 });
    const tiles = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri · Esri, HERE, Garmin', maxNativeZoom: 16, maxZoom: 18 },
    ).addTo(map);
    const labels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxNativeZoom: 16, maxZoom: 18 },
    ).addTo(map);
    let terr = 0,
      fell = false;
    const onTerr = () => {
      if (++terr > 8 && !fell) {
        fell = true;
        tiles.remove();
        labels.remove();
        const note = new L.Control({ position: 'bottomright' });
        note.onAdd = function () {
          const d = L.DomUtil.create('div', 'tile-note');
          d.textContent = 'BASEMAP OFFLINE · FORECAST OVERLAY ONLY';
          return d;
        };
        note.addTo(map);
      }
    };
    tiles.on('tileerror', onTerr);
    labels.on('tileerror', onTerr);
    groupsRef.current = {
      mark: L.layerGroup().addTo(map),
      dens: L.layerGroup().addTo(map),
      zone: L.layerGroup().addTo(map),
    };
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 80);
    return () => {
      try {
        map.remove();
      } catch {
        /* already removed */
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const g = groupsRef.current;
    if (!map || !g) return;
    g.mark.clearLayers();
    g.dens.clearLayers();
    g.zone.clearLayers();
    const amk = (pin: React.ReactNode, color: string, cls = '') =>
      L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="amk ${cls}"><span class="amk-dot" style="--tc:${color}"></span><span class="amk-pin" style="--tc:${color}">${pin}</span></div>`,
      });

    if (c.tier === 'T1' && c.atms.length) {
      c.atms.forEach((a, i) => {
        const col = i === 0 ? tierColor('T1') : pColor(0.5 + i * 0.09);
        const mk = L.marker([a.lat, a.lng], {
          icon: amk(`<b>${i + 1}</b>${a.bank}`, col, selRef.current === i ? 'sel' : ''),
        });
        mk.on('click', () => selectAtm(i));
        mk.addTo(g.mark);
      });
      c.atms.slice(0, 3).forEach((a) => {
        L.circle([a.lat + 0.004, a.lng - 0.003], {
          radius: 420 + a.comps[0] * 850,
          stroke: false,
          fillColor: '#FB923C',
          fillOpacity: 0.07,
        }).addTo(g.dens);
        L.circle([a.lat - 0.003, a.lng + 0.003], {
          radius: 250 + a.comps[0] * 500,
          stroke: false,
          fillColor: '#F87171',
          fillOpacity: 0.06,
        }).addTo(g.dens);
      });
      map.fitBounds(L.latLngBounds(c.atms.map((a) => [a.lat, a.lng] as [number, number])).pad(0.35));
    } else if (c.tier === 'T2' && c.zone) {
      L.circle([c.zone.lat, c.zone.lng], {
        radius: c.zone.r * 1000,
        color: '#FB923C',
        weight: 1.4,
        opacity: 0.85,
        dashArray: '6 6',
        fillColor: '#FB923C',
        fillOpacity: 0.06,
      }).addTo(g.zone);
      L.marker([c.zone.lat, c.zone.lng], { icon: amk(`<b>Z</b>${c.zone.name.toUpperCase()}`, '#FB923C') }).addTo(g.mark);
      map.fitBounds(
        L.latLngBounds([
          [c.zone.lat - c.zone.r / 111, c.zone.lng - c.zone.r / 111],
          [c.zone.lat + c.zone.r / 111, c.zone.lng + c.zone.r / 111],
        ]),
      );
    } else {
      const cityLL = (CITIES[c.city] || [20, 78]) as [number, number];
      L.marker(cityLL, {
        icon: amk(`<b>${c.tier === 'T3' ? 'R' : 'W'}</b>${c.city.toUpperCase()}`, tierColor(c.tier)),
      }).addTo(g.mark);
      if (c.tier === 'T3')
        L.circle(cityLL, {
          radius: 30000,
          color: tierColor('T3'),
          weight: 1,
          dashArray: '3 6',
          opacity: 0.5,
          fillOpacity: 0.03,
        }).addTo(g.zone);
      map.setView(cityLL, 10);
    }
  }, [c, selAtm, selectAtm]);

  return <div className="csmap" ref={divRef} />;
}

/* ---------- rank panel (tier-dependent) ---------- */

function RankPanel({ c }: { c: Case }) {
  const tick = useStore((s) => s.tickId);
  void tick;
  const selAtm = useStore((s) => s.selAtm);
  const openSlide = useStore((s) => s.openSlide);

  if (c.tier === 'T1' && c.atms.length) {
    return (
      <Panel icon="target" title="ATM RANKER · TIER 1" meta={<span>click for detail</span>}>
        <div>
          {c.atms.map((a, i) => (
            <div key={a.id} className="rk" style={selAtm === i ? { background: 'var(--bg2)' } : undefined} onClick={() => openSlide({ kind: 'atm', caseId: c.id, index: i })}>
              <div className="rk-rank mono">{i + 1}</div>
              <div className="rk-main">
                <div className="rk-id">{a.id}</div>
                <div className="rk-loc">
                  {a.loc} · <BankChip b={a.bank} />
                </div>
              </div>
              <div className="rk-score">{a.score.toFixed(2)}</div>
              <Icon n="chevr" s={12} />
            </div>
          ))}
        </div>
      </Panel>
    );
  }
  if (c.tier === 'T2' && c.zone) {
    return (
      <Panel icon="pin" title="DISTRICT ZONE · TIER 2">
        <div className="p-body" style={{ padding: '9px 13px' }}>
          {[
            ['ZONE', c.zone.name.toUpperCase() + ' DISTRICT'],
            ['RADIUS', c.zone.r + ' km ring'],
            ['SIGNAL', c.zone.signal],
            ['PATROL', 'Cyber PS ' + c.zone.name + ' + ZIP unit'],
          ].map((r) => (
            <div key={r[0]} className="zone-r">
              <span>{r[0]}</span>
              <span>{r[1]}</span>
            </div>
          ))}
          <div className="rk-note">
            District-level only — <b>no ATM precision claimed at Tier 2.</b>
          </div>
        </div>
      </Panel>
    );
  }
  if (c.tier === 'T3') {
    return (
      <Panel icon="wallet" title="RAIL FORECAST · TIER 3">
        <div className="p-body" style={{ padding: '9px 13px' }}>
          {(Object.entries(c.channel) as [keyof typeof c.channel, number][])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map((r) => (
              <div key={r[0]} className="zone-r">
                <span>{RAILN[r[0]]} RAIL</span>
                <span style={{ color: RAILC[r[0]] }}>{r[1]}%</span>
              </div>
            ))}
          <div className="rk-note">
            Lead mule age {c.mules[0].ageDays} days — no debit card. <b>Chasing wallet rail, not ATM.</b>
          </div>
        </div>
      </Panel>
    );
  }
  return (
    <Panel icon="eye" title="WATCHLIST · TIER 4">
      <div className="p-body" style={{ padding: '9px 13px' }}>
        {[
          ['MODE', 'watchlist enrollment'],
          ['GEO FORECAST', 'none issued'],
          ['ESCALATION', 'auto-promote on new signal'],
        ].map((r) => (
          <div key={r[0]} className="zone-r">
            <span>{r[0]}</span>
            <span>{r[1]}</span>
          </div>
        ))}
        <div className="rk-note">
          Signal available: “account exists” only. <b>Ovi never fabricates ATM precision.</b>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- page ---------- */

export function CashoutPage() {
  const tick = useStore((s) => s.tickId);
  void tick;
  const cases = useStore((s) => s.cases);
  const selectCase = useStore((s) => s.selectCase);
  const openSlide = useStore((s) => s.openSlide);
  const openReport = useStore((s) => s.openReport);

  const c = selCaseC();
  if (!c) {
    return (
      <div className="page">
        <div className="sub-note">No active cases.</div>
      </div>
    );
  }

  const at = nowMs();
  const e = elapsedSec(c, at);
  const T4 = c.tier === 'T4';
  const span = c.p90 * 1.06;
  const stateChip = T4 ? (
    <TierChip t={c.tier} />
  ) : c._st === 'win' ? (
    <span className="tier t1 pulse">
      <i />
      WINDOW OPEN · CLOSES {shortCd(c.p90 - e)}
    </span>
  ) : c._st === 'elapsed' ? (
    <span className="tier t4">
      <i />
      WINDOW ELAPSED
    </span>
  ) : (
    <span className="tier t2">
      <i />
      PRE-WINDOW · OPENS IN {shortCd(c.p10 - e)}
    </span>
  );
  const marks: [string, number][] = [
    ['DEP', 0],
    ['P10', c.p10 / span],
    ['P50', c.p50 / span],
    ['P90', c.p90 / span],
  ];
  const mix = (Object.entries(c.channel) as [keyof typeof c.channel, number][]).filter((x) => x[1] > 0);

  return (
    <div className="page">
      <div className="page-head">
        <span className="pg-num">05</span>
        <span className="pg-title">Cashout Forecast</span>
        <span className="pg-sub">FORWARD-LOOKING RANKER · TIME-TO-CASHOUT · CONFIDENCE TIERS</span>
        <button className="linkbtn" style={{ marginLeft: 10 }} onClick={() => openReport(c.id)}>
          <Icon n="doc" s={10} /> GENERATE REPORT
        </button>
      </div>
      <div className="cs-cases">
        {[...cases].sort(urgency).map((x) => (
          <div
            key={x.id}
            className={'cs-chip' + (x.id === c.id ? ' sel' : '') + (x._st === 'win' ? ' win' : '')}
            onClick={() => selectCase(x.id)}
          >
            <i style={{ background: tierColor(x.tier) }} />
            <span className="csc-id mono">#{x.short}</span>
            <span className="csc-cd mono">
              {x.tier === 'T4' ? 'WATCH' : x._st === 'elapsed' ? 'ELAPSED' : shortCd(Math.max(0, countMed(x, at)))}
            </span>
          </div>
        ))}
      </div>
      <div className="clockband">
        <div className="cb-left">
          <div style={{ cursor: 'pointer' }} onClick={() => openSlide({ kind: 'tier', tier: c.tier })}>
            {stateChip}
          </div>
          {T4 ? (
            <>
              <div className="cd nf mono">NO GEOGRAPHIC CLAIM</div>
              <div className="cb-cap mono" style={{ color: 'var(--t4)' }}>
                HONEST DEGRADATION — INSUFFICIENT SIGNAL
              </div>
            </>
          ) : (
            <>
              <div className={'cd pre mono ' + (c._st === 'win' ? 'win' : c._st === 'elapsed' ? 'el' : '')}>
                {c._st === 'elapsed' ? '+' + hms(e - c.p90) + ' ELAPSED' : hms(countMed(c, at))}
              </div>
              <div className="cb-cap">TIME-TO-CASHOUT · MEDIAN (P50)</div>
              <div className="cb-ci mono">
                P10–P90 · {shortCd(c.p10)} – {shortCd(c.p90)} from deposit · survival-model 80% CI
              </div>
            </>
          )}
        </div>
        <div className="cb-mid">
          {T4 ? (
            <div className="sub-note" style={{ width: '100%', textAlign: 'center', padding: '20px 0' }}>
              No timeline rendered — watchlist enrollment only. Ovi does not fabricate ATM precision when the graph
              signal is insufficient.
            </div>
          ) : (
            <div className="tl">
              <div className="tl-track" />
              <div
                className="tl-win"
                style={{ left: (c.p10 / span) * 100 + '%', width: ((c.p90 - c.p10) / span) * 100 + '%' }}
              >
                <span>CASHOUT WINDOW</span>
              </div>
              <div className="tl-now" style={{ left: clamp((e / span) * 100, 0, 100) + '%' }}>
                <span>NOW</span>
              </div>
              {marks.map((m) => (
                <div key={m[0]} className="tl-m" style={{ left: clamp(m[1] * 100, 0, 100) + '%' }}>
                  <b>{m[0]}</b>
                  {istHM(c.depositAt + m[1] * span * 1000)}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="cb-right">
          {[
            ['WINDOW OPENS', c._st === 'pre' ? istHM(c.depositAt + c.p10 * 1000) + ' IST' : 'OPEN', c._st !== 'pre'],
            ['MEDIAN · P50', istHM(c.depositAt + c.p50 * 1000) + ' IST', false],
            ['WINDOW CLOSES', istHM(c.depositAt + c.p90 * 1000) + ' IST', true],
            ['TARGET', shortTarget(c), false],
            ['AT RISK', INRc(atRisk(c, at)), false],
          ].map((r) => (
            <div key={r[0] as string} className="cb-r">
              <span>{r[0] as string}</span>
              <span className={r[2] ? 'hotv' : ''}>{r[1] as string}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="cs-grid">
        <Panel icon="pin" title="GIS · FORECAST MAP">
          <div className="p-body" style={{ padding: 8 }}>
            <ForecastMap c={c} />
            <div className="map-note">
              <Icon n="warn" s={11} />
              <span>
                AT RISK:{' '}
                <b className="mono">
                  {INRc(atRisk(c, at))}
                </b>{' '}
                · decays as the window progresses
              </span>
            </div>
          </div>
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, minWidth: 0 }}>
          <RankPanel c={c} />
          <Panel
            icon="wallet"
            title="RAIL MIX"
            meta={
              <button className="linkbtn" onClick={() => openSlide({ kind: 'rail', caseId: c.id })}>
                WHY?
              </button>
            }
          >
            <div className="p-body" style={{ padding: '11px 13px' }}>
              <div className="cmix">
                {mix.map((x) => (
                  <div key={x[0]} className="cm-seg" style={{ width: x[1] + '%', background: RAILC[x[0]] }}>
                    {x[1] >= 10 ? RAILN[x[0]] + ' ' + x[1] + '%' : ''}
                  </div>
                ))}
                {c.channel.atm === 0 && (
                  <div className="cm-seg z" style={{ width: '12%' }}>
                    ATM 0%
                  </div>
                )}
              </div>
              <div className="cm-legend" style={{ marginTop: 9 }}>
                {(Object.entries(c.channel) as [keyof typeof c.channel, number][]).map((x) => (
                  <span key={x[0]}>
                    <i style={{ background: RAILC[x[0]] }} />
                    {RAILN[x[0]]} {x[1]}%
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
