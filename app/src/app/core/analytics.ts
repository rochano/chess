/** Send a Google Analytics event (gtag is loaded in index.html). Shared links carry utm tags. */
export function track(name: string, params: Record<string, unknown> = {}) {
  try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', name, params); } catch { /* blocked */ }
}
