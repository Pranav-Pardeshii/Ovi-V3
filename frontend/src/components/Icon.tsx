const SPRITE = `<defs>
<symbol id="i-gauge" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 13l4.2-4.6"/><path d="M12 3v2M4.5 6.5l1.4 1.4M19.5 6.5l-1.4 1.4"/></g></symbol>
<symbol id="i-inbox" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l1.5 8v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-5z"/></g></symbol>
<symbol id="i-graph" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7"><circle cx="5.5" cy="17.5" r="2.3"/><circle cx="12" cy="6" r="2.3"/><circle cx="18.5" cy="15" r="2.3"/><path d="M7 15.7l3.7-7.2M13.9 7.7l3.2 5.6" stroke-linecap="round"/></g></symbol>
<symbol id="i-mule" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="8" r="3.4"/><path d="M4.5 20c1-4.2 3.4-5.8 6-5.8s5 1.6 6 5.8"/><path d="M18 7v5M18 15.6h.01"/></g></symbol>
<symbol id="i-target" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></g></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 14.5v2.5"/></g></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 9.5a5.8 5.8 0 0 1 11.6 0c0 4.8 1.9 5.9 1.9 5.9H4.3s1.9-1.1 1.9-5.9"/><path d="M10.3 19a1.9 1.9 0 0 0 3.4 0"/></g></symbol>
<symbol id="i-pulse" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12.5h4L8.5 6l4.2 12 2.3-5.5h6.5"/></g></symbol>
<symbol id="i-live" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><path d="M7 5.5a8.5 8.5 0 0 1 10 0M8.8 8.4a5.6 5.6 0 0 1 6.4 0M7 18.5a8.5 8.5 0 0 0 10 0M8.8 15.6a5.6 5.6 0 0 0 6.4 0"/></g></symbol>
<symbol id="i-hash" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round"><path d="M9 4L7 20M17 4l-2 16M4.5 9h15M3.5 15h15"/></g></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></g></symbol>
<symbol id="i-bank" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 4l9 5.5H3z"/><path d="M5 9.5V18M9.7 9.5V18M14.3 9.5V18M19 9.5V18M3 18h18v2H3z"/></g></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.8l5 5L19.5 6.5"/></g></symbol>
<symbol id="i-warn" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.6h.01"/></g></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round"><path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/></g></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13.5 5.5L20 12l-6.5 6.5"/></g></symbol>
<symbol id="i-chevr" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5.5l7 6.5-7 6.5"/></g></symbol>
<symbol id="i-sms" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 18.5h3"/></g></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 7l8.5 6 8.5-6"/></g></symbol>
<symbol id="i-api" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 4L4.5 12l4 8M15.5 4l4 8-4 8"/></g></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.4 7.6-8 9-4.6-1.4-8-4-8-9V6z"/><path d="M9 12l2.2 2.2L15.5 9.5"/></g></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linejoin="round"><path d="M7.5 4.5l12 7.5-12 7.5z"/></g></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linejoin="round"><path d="M12 21.5s7-6.7 7-11.5a7 7 0 1 0-14 0c0 4.8 7 11.5 7 11.5z"/><circle cx="12" cy="9.8" r="2.4"/></g></symbol>
<symbol id="i-wallet" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12.5" rx="2"/><path d="M15.5 13.2h2.5M3 7.5V6a2 2 0 0 1 2-2h12"/></g></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linejoin="round"><path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/></g></symbol>
<symbol id="i-eye" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></g></symbol>
<symbol id="i-filt" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></g></symbol>
<symbol id="i-doc" viewBox="0 0 24 24"><g stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5h8l4 4V21.5H6z"/><path d="M14 2.5v4h4"/><path d="M9 12h6M9 15.5h6M9 8.5h2.5"/></g></symbol>
</defs>`;

/** Hidden SVG sprite; icons reference symbols via <use>. Render once in App. */
export function IconSprite() {
  return <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: SPRITE }} />;
}

export function Icon({ n, s }: { n: string; s?: number }) {
  return (
    <svg className="ic" style={s ? { width: s, height: s } : undefined} aria-hidden>
      <use href={`#i-${n}`} />
    </svg>
  );
}
