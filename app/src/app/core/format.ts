/** Clock text: m:ss, or seconds with a tenth under 10 seconds. */
export function fmtClock(ms: number): string {
  ms = Math.max(0, ms);
  if (ms < 10000) return (ms / 1000).toFixed(1);
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
