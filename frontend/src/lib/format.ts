export const p2 = (n: number) => String(n).padStart(2, '0');
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const INR = (v: number) => '₹' + Math.round(v).toLocaleString('en-IN');
export const INRc = (v: number) =>
  v >= 1e7 ? '₹' + (v / 1e7).toFixed(2) + ' Cr' : v >= 1e5 ? '₹' + (v / 1e5).toFixed(2) + ' L' : INR(v);

export function hms(s: number) {
  s = Math.max(0, Math.round(s));
  return p2((s / 3600) | 0) + ':' + p2(((s % 3600) / 60) | 0) + ':' + p2(s % 60);
}
export function msFmt(s: number) {
  s = Math.max(0, Math.round(s));
  return ((s / 60) | 0) + 'm ' + p2(Math.round(s % 60)) + 's';
}
export const shortCd = (s: number) =>
  s < 0 ? '—' : s < 3600 ? ((s / 60) | 0) + 'm' : ((s / 3600) | 0) + 'h' + p2(((s % 3600) / 60) | 0);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Sim timestamps are UTC ms; IST display = +5:30. */
export function istTime(t: number) {
  const d = new Date(t + 19800000);
  return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds());
}
export function istHM(t: number) {
  const d = new Date(t + 19800000);
  return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes());
}
export function istDate(t: number) {
  const d = new Date(t + 19800000);
  return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}
