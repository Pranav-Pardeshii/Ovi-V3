import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { StatusLine } from './components/StatusLine';
import { Toasts } from './components/Toasts';
import { SlideOver } from './components/SlideOver';
import { ReportOverlay } from './report/ReportOverlay';
import { IconSprite } from './components/Icon';
import { PAGES_ORDER } from './data/constants';

import { OverviewPage } from './features/overview/OverviewPage';
import { ComplaintsPage } from './features/complaints/ComplaintsPage';
import { GraphPage } from './features/graph/GraphPage';
import { MulesPage } from './features/mules/MulesPage';
import { CashoutPage } from './features/cashout/CashoutPage';
import { FreezePage } from './features/freeze/FreezePage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { DriftPage } from './features/drift/DriftPage';

export function App() {
  const page = useStore((s) => s.page);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (useStore.getState().reportCase) useStore.getState().closeReport();
        return;
      }
      if (useStore.getState().reportCase) return;
      const t = e.target as HTMLElement | null;
      if (t && t.matches('input,select,textarea')) return;
      const i = Number(e.key);
      if (i >= 1 && i <= 8) useStore.getState().goto(PAGES_ORDER[i - 1]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <IconSprite />
      <div className="app">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main className="view">
            {page === 'overview' && <OverviewPage />}
            {page === 'complaint' && <ComplaintsPage />}
            {page === 'analysis' && <GraphPage />}
            {page === 'mules' && <MulesPage />}
            {page === 'cashout' && <CashoutPage />}
            {page === 'freeze' && <FreezePage />}
            {page === 'alerts' && <AlertsPage />}
            {page === 'drift' && <DriftPage />}
          </main>
          <StatusLine />
        </div>
      </div>
      <Toasts />
      <SlideOver />
      <ReportOverlay />
    </>
  );
}
