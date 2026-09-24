import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Panel({
  icon,
  title,
  meta,
  children,
  bodyClass,
  bodyStyle,
}: {
  icon?: string;
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  bodyClass?: string;
  bodyStyle?: React.CSSProperties;
}) {
  return (
    <section className="panel">
      <div className="p-head">
        {icon && <Icon n={icon} />}
        <span>{title}</span>
        {meta != null && <span className="p-meta">{meta}</span>}
      </div>
      {bodyClass || bodyStyle ? (
        <div className={'p-body' + (bodyClass ? ' ' + bodyClass : '')} style={bodyStyle}>
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaClass = 'nt',
  valueStyle,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  deltaClass?: 'up' | 'dn' | 'nt';
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="statcard">
      <div className="sc-l">{label}</div>
      <div className="sc-v" style={valueStyle}>
        {value}
      </div>
      {delta != null && <div className={'sc-d ' + deltaClass}>{delta}</div>}
    </div>
  );
}
