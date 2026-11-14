/**
 * "Bot that plays like you": what a player's games teach a bot, and how that bot picks moves.
 *
 * Kept small so one Firestore document per player holds it (one read to challenge, one write per game):
 * - book:  the player's own moves in the first moves of their games, by position (how they open)
 * - style: counters from whole games (do they take pieces when they can, give check, castle,
 *          which pieces they move, how often a move drops material)
 */
import {
  applyMove, bestMove, Color, GameState, inCheck, legalMoves, Level, Move, negamax, PieceType, posKey, quiesce,
} from './engine';

export interface GhostStyle {
  /** Games learned from, and how many of them as White / Black. */
  n: number; nw: number; nb: number;
  /** Own moves seen; captures taken / positions where one was possible; checks given / possible. */
  mv: number; cap: number; capN: number; chk: number; chkN: number;
  /** Moves by piece type. */
  pP: number; pN: number; pB: number; pR: number; pQ: number; pK: number;
  /** Games where they castled. */
  cas: number;
  /** Moves that gave away material (rough check: what the capture search sees). */
  blun: number;
}
export interface Ghost extends GhostStyle {
  name: string;
  /** "hash:move:count;..." see encodeBook. */
  book: string;
  /** How challengers did against this bot, from the bot's side. */
  gw: number; gd: number; gl: number;
}
/** What the computer side needs to play as someone's bot (sent to the worker). */
export interface GhostPlay { style: GhostStyle; book: Record<string, Record<string, number>>; }

export const EMPTY_STYLE: GhostStyle = { n: 0, nw: 0, nb: 0, mv: 0, cap: 0, capN: 0, chk: 0, chkN: 0, pP: 0, pN: 0, pB: 0, pR: 0, pQ: 0, pK: 0, cas: 0, blun: 0 };
export const STYLE_KEYS = Object.keys(EMPTY_STYLE) as (keyof GhostStyle)[];
/** Moves per side remembered for the opening book, and the most positions kept. */
export const BOOK_PLIES = 24;
export const BOOK_MAX = 700;
/** Games before other players can challenge the bot. */
export const GHOST_MIN_GAMES = 3;

/** Short, stable id for a position (FNV-1a of the position key, base 36). */
export function posHash(st: GameState): string {
  const s = posKey(st);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
const FILES = 'abcdefgh';
export const moveCode = (m: Move) => FILES[m.from & 7] + (8 - (m.from >> 3)) + FILES[m.to & 7] + (8 - (m.to >> 3)) + (m.promo ? m.promo.toLowerCase() : '');
const sq = (s: string) => (8 - +s[1]) * 8 + FILES.indexOf(s[0]);
export function findMove(st: GameState, code: string): Move | undefined {
  const from = sq(code.slice(0, 2)), to = sq(code.slice(2, 4)), promo = code[4]?.toUpperCase();
  return legalMoves(st).find(m => m.from === from && m.to === to && (!promo || m.promo === promo));
}

export function decodeBook(s: string): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const e of (s || '').split(';')) {
    const [h, m, c] = e.split(':');
    if (!h || !m || !(+c > 0)) continue;
    (out[h] ??= {})[m] = (out[h][m] || 0) + +c;
  }
  return out;
}
/** Most-played first; the least-used positions drop off once the book is full. */
export function encodeBook(b: Record<string, Record<string, number>>): string {
  const rows: [string, string, number][] = [];
  for (const h in b) for (const m in b[h]) rows.push([h, m, b[h][m]]);
  rows.sort((x, y) => y[2] - x[2]);
  return rows.slice(0, BOOK_MAX).map(r => r.join(':')).join(';');
}

/** Material the side to move can count on (static eval plus capture search), from its own point of view. */
const safeValue = (st: GameState) => quiesce(st, -Infinity, Infinity, 0);

/**
 * What one finished game teaches: `positions[i]` is the position before `moves[i]`. Only `me`'s moves count.
 * Returns null for games too short to say anything.
 */
export function learnGame(positions: GameState[], moves: Move[], me: Color): { style: GhostStyle; book: Record<string, Record<string, number>> } | null {
  const style = { ...EMPTY_STYLE }, book: Record<string, Record<string, number>> = {};
  let castled = 0;
  for (let i = 0; i < moves.length && i < positions.length; i++) {
    const st = positions[i], m = moves[i];
    if (st.turn !== me || !st.board[m.from]) continue;
    style.mv++;
    const legal = legalMoves(st);
    const takes = (x: Move) => !!st.board[x.to] || !!x.ep;
    if (legal.some(takes)) { style.capN++; if (takes(m)) style.cap++; }
    const checks = (x: Move) => { const c = applyMove(st, x); return inCheck(c.board, c.turn); };
    if (legal.some(checks)) { style.chkN++; if (checks(m)) style.chk++; }
    style[('p' + st.board[m.from]![1]) as keyof GhostStyle]++;
    if (m.castle) castled = 1;
    // Gave away material: after the move, the opponent's captures win back 1.5 pawns or more than before.
    const before = safeValue(st), after = -safeValue(applyMove(st, m));
    if (before - after >= 150) style.blun++;
    if (i < BOOK_PLIES) { const h = posHash(st), c = moveCode(m); (book[h] ??= {})[c] = (book[h][c] || 0) + 1; }
  }
  if (style.mv < 5) return null;
  style.n = 1; style.nw = me === 'w' ? 1 : 0; style.nb = me === 'b' ? 1 : 0; style.cas = castled;
  return { style, book };
}

export function addStyle(a: GhostStyle, b: GhostStyle): GhostStyle {
  const o = { ...a };
  for (const k of STYLE_KEYS) o[k] = (a[k] || 0) + (b[k] || 0);
  return o;
}
export function addBook(a: Record<string, Record<string, number>>, b: Record<string, Record<string, number>>) {
  const o: Record<string, Record<string, number>> = {};
  for (const src of [a, b]) for (const h in src) for (const m in src[h]) (o[h] ??= {})[m] = (o[h][m] || 0) + src[h][m];
  return o;
}

const rate = (a: number, b: number, d: number) => (b >= 4 ? a / b : d);
/** How often their moves drop material, smoothed towards average for players with few games. */
export function blunderRate(s: GhostStyle) { return (s.blun + 2) / (s.mv + 20); }
/** The computer level that matches the player's play (used for points and the strength shown). */
export function ghostLevel(s: GhostStyle): Level { const b = blunderRate(s); return b < 0.07 ? 3 : b < 0.16 ? 2 : 1; }
/** The side the bot plays: the colour the player has most games with (their opening moves are for that side). */
export function ghostSide(s: GhostStyle): Color { return s.nb > s.nw ? 'b' : 'w'; }

/** Typical share of moves by piece, to tell what a player favours. */
const USUAL: Record<PieceType, number> = { P: 0.28, N: 0.17, B: 0.15, R: 0.14, Q: 0.13, K: 0.13 };
function pieceShare(s: GhostStyle): Record<PieceType, number> {
  const t = s.mv || 1;
  return { P: s.pP / t, N: s.pN / t, B: s.pB / t, R: s.pR / t, Q: s.pQ / t, K: s.pK / t };
}

/** Plain words for how the player plays, most telling first. */
export function traits(s: GhostStyle): { th: string; en: string }[] {
  const out: { th: string; en: string; w: number }[] = [];
  const capR = rate(s.cap, s.capN, 0.55), chkR = rate(s.chk, s.chkN, 0.25), sh = pieceShare(s), b = blunderRate(s);
  if (capR >= 0.7) out.push({ th: 'เห็นหมากให้กินเป็นต้องกิน', en: 'Takes every piece it can', w: capR - 0.6 });
  else if (capR <= 0.4) out.push({ th: 'ไม่รีบกิน ชอบวางแผน', en: 'Patient, not greedy', w: 0.5 - capR });
  if (chkR >= 0.4) out.push({ th: 'ชอบรุกคิง', en: 'Loves to give check', w: chkR - 0.3 });
  if (sh.Q - USUAL.Q >= 0.05) out.push({ th: 'ชอบออกควีน', en: 'Brings the queen out', w: sh.Q - USUAL.Q });
  if (sh.N - USUAL.N >= 0.05) out.push({ th: 'สายม้า', en: 'A knight lover', w: sh.N - USUAL.N });
  if (sh.P - USUAL.P >= 0.08) out.push({ th: 'ดันเบี้ยเยอะ', en: 'Pushes lots of pawns', w: sh.P - USUAL.P });
  if (s.n >= 3 && s.cas / s.n >= 0.6) out.push({ th: 'เข้าป้อมเร็ว', en: 'Castles early', w: s.cas / s.n - 0.5 });
  if (b < 0.07) out.push({ th: 'รอบคอบ เสียหมากยาก', en: 'Careful, rarely drops a piece', w: 0.3 });
  else if (b > 0.2) out.push({ th: 'ใจร้อน เดินไว', en: 'Plays fast and loose', w: 0.2 });
  out.sort((x, y) => y.w - x.w);
  return out.slice(0, 3).map(({ th, en }) => ({ th, en }));
}

/** Sample from move counts; `heat` > 1 flattens towards the less played ones. */
function pick(counts: Record<string, number>, heat = 1): string {
  const e = Object.entries(counts).map(([m, c]) => [m, c ** (1 / heat)] as const);
  let r = Math.random() * e.reduce((a, [, w]) => a + w, 0);
  for (const [m, w] of e) if ((r -= w) <= 0) return m;
  return e[0][0];
}

/**
 * The bot's move: the player's own opening moves while the position is in their book,
 * then a search tuned to their style and about as accurate as they are.
 */
export function ghostMove(st: GameState, g: GhostPlay, avoidKeys?: Set<string>): Move | null {
  const moves = legalMoves(st);
  if (!moves.length) return null;
  const known = g.book[posHash(st)];
  if (known) { const m = findMove(st, pick(known)); if (m) return m; }

  const s = g.style, b = blunderRate(s);
  // As often as they drop material, the bot plays loosely too: a move that gives something away, or any move.
  if (Math.random() < b * 0.8) {
    const before = safeValue(st);
    const loose = moves.filter(m => before + safeValue(applyMove(st, m)) >= 150);
    const pool = loose.length ? loose : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const depth = b < 0.07 ? 3 : 2;
  const capR = rate(s.cap, s.capN, 0.55), chkR = rate(s.chk, s.chkN, 0.25), sh = pieceShare(s);
  const castles = s.n ? s.cas / s.n : 0.5;
  // Accurate players get a quiet bot, loose ones a noisier one.
  const noise = 40 + b * 500;
  let best: Move | null = null, bestV = -Infinity;
  for (const m of moves) {
    const child = applyMove(st, m);
    let v = -negamax(child, depth - 1, -Infinity, Infinity, 1);
    if (Math.abs(v) < 50000) {
      if (st.board[m.to] || m.ep) v += (capR - 0.55) * 160;
      if (inCheck(child.board, child.turn)) v += (chkR - 0.25) * 200;
      const t = st.board[m.from]![1] as PieceType;
      v += (sh[t] - USUAL[t]) * 350;
      if (m.castle) v += (castles - 0.4) * 120;
      if (avoidKeys?.has(posKey(child)) && v > 0) v -= 60;
      v += (Math.random() - 0.5) * noise;
    }
    if (v > bestV) { bestV = v; best = m; }
  }
  return best ?? bestMove(st, 1, 0);
}

/** The player's favourite first move with this colour, if the book has one ("e4", "Nf3"). */
export function favouriteFirst(book: Record<string, Record<string, number>>, start: GameState, side: Color): string {
  let st = start;
  if (side === 'b') {
    // As Black: their usual answer to the first common White move the book has.
    for (const w of ['e2e4', 'd2d4', 'c2c4', 'g1f3']) {
      const m = findMove(start, w); if (!m) continue;
      const c = applyMove(start, m), e = book[posHash(c)];
      if (e) { st = c; break; }
    }
    if (st === start) return '';
  }
  const e = book[posHash(st)]; if (!e) return '';
  const code = Object.entries(e).sort((a, b) => b[1] - a[1])[0][0];
  const p = st.board[sq(code.slice(0, 2))];
  return (p && p[1] !== 'P' ? p[1] : '') + code.slice(2, 4);
}
