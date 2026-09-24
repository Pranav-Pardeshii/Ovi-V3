import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { reportBody, downloadReport } from './reportHtml';
import '../report/report.css';

export function ReportOverlay() {
  const id = useStore((s) => s.reportCase);
  const reports = useStore((s) => s.reports);
  const closeReport = useStore((s) => s.closeReport);
  const anchorReport = useStore((s) => s.anchorReport);
  const tick = useStore((s) => s.tickId);
  void tick;

  useEffect(() => {
    if (!id) return;
    document.body.classList.add('report-open');
    return () => document.body.classList.remove('report-open');
  }, [id]);

  const c = useStore((s) => s.cases.find((x) => x.id === id));
  if (!id || !c) return null;
  // recompute when the report gets anchored (reports object identity changes)
  void reports;

  return (
    <div className="report-overlay show">
      <div className="rpwrap">
        <div className="rpbar">
          <span className="rb-title">
            <Icon n="doc" s={11} />
            INVESTIGATION REPORT · {c.id}
          </span>
          <button className="btn" onClick={closeReport}>
            <Icon n="close" s={11} /> CLOSE
          </button>
          <button className="btn pri" onClick={() => window.print()}>
            <Icon n="doc" s={11} /> PRINT / SAVE PDF
          </button>
          <button className="btn" onClick={() => downloadReport(c)}>
            <Icon n="arrow" s={11} /> DOWNLOAD .HTML
          </button>
          <button className="btn" onClick={() => anchorReport(c.id)}>
            <Icon n="hash" s={11} /> ANCHOR TO FABRIC
          </button>
        </div>
        <div className="rppaper" dangerouslySetInnerHTML={{ __html: reportBody(c) }} />
      </div>
    </div>
  );
}
