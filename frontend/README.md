# OVI · Cashout Interdiction Platform — Frontend

React 18 + TypeScript + Vite + Tailwind port of the original single-file OVI dashboard.
The simulation (sim clock, case lifecycle, spawns, freeze confirmations) runs client-side
for now; a FastAPI backend will replace it via the typed layer in `src/api/`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (dev server already proxies /api → :8000)
npm run build      # type-check + production bundle in dist/
```

## Structure

```
src/
  main.tsx                 boot: seed store, start sim engine, mount <App/>
  App.tsx                  shell: sidebar/topbar/statusline + page switch + hotkeys 1–8
  types.ts                 domain types (Case, Mule, Alert, Slide, …)
  lib/                     pure helpers — formatting (INR/IST), hashing/RNG
  data/
    constants.ts           banks, tiers, rails, pipeline stages, page meta
    build.ts               deterministic seed data + mule/case enrichment
  sim/
    engine.ts              5 Hz tick loop (clock, schedules, lifecycle)
    selectors.ts           derived state (balances, urgency, freeze queue)
    graph.ts               tokenized money-trail graph builder (canvas + report)
  store/useStore.ts        zustand store — all state + actions (toasts, freeze flow…)
  components/              Icon sprite, chips, panels, charts, toasts, slide-over shell
  features/                one folder per page:
    overview/ complaints/ graph/ mules/ cashout/ freeze/ alerts/ drift/ details/
  report/                  FIR-style investigation report (HTML gen + print overlay)
  api/                     FastAPI client + typed endpoints (swap-in point)
  index.css                design tokens + console component classes (Tailwind layer)
```

## Notes

- Keyboard `1–8` switches views; `Esc` closes the report overlay.
- Sim speed (1× / 20× / 120×) scales the demo clock; cases spawn every ~95 s.
- All data is synthetic demo data; hashes are deterministic fake digests.
- Leaflet uses the keyless Esri dark-gray basemap with an offline fallback note.
