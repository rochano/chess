/**
 * Invite links. Every player has a short code (the start of their account id). A link with ?ref=CODE remembers
 * who sent a new player here, so that player is counted as their friend and sees that friend's recommended products.
 * Plain functions (no Angular) so the ported share and puzzle code can tag their links too.
 */
const MY = 'chess-myref', BY = 'chess-ref';

function get(k: string) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }
function put(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }

export const REF_RE = /^[A-Za-z0-9]{8}$/;
export const codeOf = (uid: string) => uid.slice(0, 8);

/** This player's own code (known once the account has loaded; kept for the next visit). */
export function myRef() { return get(MY); }
export function setMyRef(uid: string) { if (uid) put(MY, codeOf(uid)); }

/** The code of whoever invited this device's player ('' if nobody). */
export function invitedBy() { return get(BY); }

/** "&ref=CODE" for links this player shares, or nothing before the account has loaded. */
export function refTag() { const c = myRef(); return c ? '&ref=' + c : ''; }

/**
 * Run once at startup, before anything is saved: a ?ref= link counts only on a device that has never played here.
 * Returns true when this visit is a fresh invite that still has to be recorded.
 */
export function captureRef(): boolean {
  const c = new URLSearchParams(location.search).get('ref') || '';
  if (!REF_RE.test(c) || invitedBy()) return false;
  let seen = false;
  try { seen = !!(localStorage.getItem('chess-prefs') || localStorage.getItem('chess-history') || localStorage.getItem(MY)); } catch { return false; }
  if (seen) return false;
  put(BY, c);
  put('chess-ref-new', '1');
  return true;
}
export function inviteToRecord() { return get('chess-ref-new') === '1' ? invitedBy() : ''; }
export function inviteRecorded() { try { localStorage.removeItem('chess-ref-new'); } catch { /* none */ } }
