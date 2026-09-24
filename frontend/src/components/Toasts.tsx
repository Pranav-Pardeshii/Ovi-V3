import { useStore } from '../store/useStore';
import { Icon } from './Icon';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + t.kind} onClick={() => dismiss(t.id)}>
          <Icon n={t.kind === 'ok' ? 'check' : t.kind === 'crit' || t.kind === 'warn' ? 'warn' : 'live'} />
          <div>
            <div className="t-t">{t.title}</div>
            <div className="t-m">{t.msg}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
