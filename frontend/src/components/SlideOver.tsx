import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import { SlideBody, SlideFoot, SlideHead } from '../features/details/slides';

export function SlideOver() {
  const slide = useStore((s) => s.slide);
  const closeSlide = useStore((s) => s.closeSlide);
  const open = slide != null;
  return (
    <>
      <div className={'overlay' + (open ? ' show' : '')} onClick={closeSlide} />
      <aside className={'slideover' + (open ? ' show' : '')}>
        {slide && (
          <>
            <SlideHead slide={slide} />
            <div className="so-body">
              <SlideBody slide={slide} />
            </div>
            <SlideFoot slide={slide} />
          </>
        )}
      </aside>
    </>
  );
}

export function SlideHeadShell({ icon, title, sub }: { icon: string; title: React.ReactNode; sub?: React.ReactNode }) {
  const closeSlide = useStore((s) => s.closeSlide);
  return (
    <div className="so-head">
      <Icon n={icon} />
      <span>{title}</span>
      {sub ? <span className="so-sub">{sub}</span> : null}
      <button className="so-x" onClick={closeSlide}>
        <Icon n="close" s={13} />
      </button>
    </div>
  );
}
