import { useStore } from '../store/useStore';

export function StatusLine() {
  const fabric = useStore((s) => s.fabric);
  return (
    <footer className="statusline">
      <span className="sl">
        FABRIC <b>#{fabric.toLocaleString('en-IN')}</b>
      </span>
      <span className="sl">
        MODEL <b>v3.4.1</b> · CAL <b>2.1%</b>
      </span>
      <span className="sl">
        CFCFRMS <b>OK</b> · DPDP <b>§7(7)</b>
      </span>
      <span className="sl-hint">
        KEYS <b>1–8</b> SWITCH VIEWS
      </span>
    </footer>
  );
}
