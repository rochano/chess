/*
 * Chess rules and the computer player, ported from the original single-file game (index.html, ENGINE block).
 * Pure functions with no DOM access, so the same code runs in the page, in a Web Worker, and in tests.
 * Squares are 0..63, a8 = 0, h1 = 63. A piece is "w"/"b" + one of K Q R B N P.
 */
export type Color = 'w' | 'b';
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type Piece = `${Color}${PieceType}`;
export type Board = (Piece | null)[];

export interface Castling { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean; }
export interface GameState {
  board: Board;
  turn: Color;
  castle: Castling;
  /** En passant target square, or -1. */
  ep: number;
  /** Half-move clock for the 50-move rule. */
  half: number;
  /** Piece taken by the move that produced this state. */
  captured: Piece | null;
}
export interface Move {
  from: number;
  to: number;
  promo?: 'Q' | 'R' | 'B' | 'N';
  double?: boolean;
  ep?: boolean;
  castle?: 'K' | 'Q';
}
export type Level = 1 | 2 | 3;

export const GLYPH: Record<PieceType, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟︎' };
export const VAL: Record<PieceType, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
export const NAME: Record<PieceType, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export const opp = (c: Color): Color => (c === 'w' ? 'b' : 'w');
export const sqName = (i: number) => 'abcdefgh'[i & 7] + (8 - (i >> 3));
const color = (p: Piece) => p[0] as Color;
const type = (p: Piece) => p[1] as PieceType;

export function initialState(): GameState {
  const back: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const board: Board = new Array(64).fill(null);
  for (let c = 0; c < 8; c++) {
    board[c] = `b${back[c]}`; board[8 + c] = 'bP';
    board[48 + c] = 'wP'; board[56 + c] = `w${back[c]}`;
  }
  return { board, turn: 'w', castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: -1, half: 0, captured: null };
}

export function attacked(board: Board, sq: number, by: Color): boolean {
  const r = sq >> 3, c = sq & 7;
  const pr = by === 'w' ? r + 1 : r - 1;
  if (pr >= 0 && pr < 8) {
    for (const dc of [-1, 1]) {
      const cc = c + dc;
      if (cc >= 0 && cc < 8 && board[pr * 8 + cc] === by + 'P') return true;
    }
  }
  for (const [dr, dc] of KN) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] === by + 'N') return true;
  }
  for (const [dr, dc] of KG) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] === by + 'K') return true;
  }
  for (const [dirs, a, b] of [[DIAG, 'B', 'Q'], [ORTH, 'R', 'Q']] as const) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = board[rr * 8 + cc];
        if (p) { if (color(p) === by && (type(p) === a || type(p) === b)) return true; break; }
        rr += dr; cc += dc;
      }
    }
  }
  return false;
}

export function kingSq(board: Board, c: Color) { return board.indexOf(`${c}K`); }
export function inCheck(board: Board, c: Color) { const k = kingSq(board, c); return k >= 0 && attacked(board, k, opp(c)); }

export function pseudoMoves(st: GameState, side: Color): Move[] {
  const { board } = st, out: Move[] = [];
  const add = (from: number, to: number, extra?: Partial<Move>) => out.push({ from, to, ...extra });
  const promos = ['Q', 'R', 'B', 'N'] as const;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || color(p) !== side) continue;
    const r = i >> 3, c = i & 7, t = type(p);
    if (t === 'P') {
      const dir = side === 'w' ? -1 : 1, start = side === 'w' ? 6 : 1, last = side === 'w' ? 0 : 7;
      const r1 = r + dir;
      if (r1 >= 0 && r1 < 8) {
        const one = r1 * 8 + c;
        if (!board[one]) {
          if (r1 === last) for (const q of promos) add(i, one, { promo: q });
          else add(i, one);
          const two = (r + 2 * dir) * 8 + c;
          if (r === start && !board[two]) add(i, two, { double: true });
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const to = r1 * 8 + cc, tp = board[to];
          if (tp && color(tp) !== side) {
            if (r1 === last) for (const q of promos) add(i, to, { promo: q });
            else add(i, to);
          } else if (to === st.ep) add(i, to, { ep: true });
        }
      }
    } else if (t === 'N' || t === 'K') {
      for (const [dr, dc] of t === 'N' ? KN : KG) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const to = rr * 8 + cc, tp = board[to];
        if (!tp || color(tp) !== side) add(i, to);
      }
      if (t === 'K') {
        const home = side === 'w' ? 60 : 4, o = opp(side);
        if (i === home && !attacked(board, home, o)) {
          if (st.castle[`${side}K`] && !board[home + 1] && !board[home + 2] && board[home + 3] === `${side}R` &&
              !attacked(board, home + 1, o) && !attacked(board, home + 2, o)) add(i, home + 2, { castle: 'K' });
          if (st.castle[`${side}Q`] && !board[home - 1] && !board[home - 2] && !board[home - 3] && board[home - 4] === `${side}R` &&
              !attacked(board, home - 1, o) && !attacked(board, home - 2, o)) add(i, home - 2, { castle: 'Q' });
        }
      }
    } else {
      const dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH);
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const to = rr * 8 + cc, tp = board[to];
          if (tp) { if (color(tp) !== side) add(i, to); break; }
          add(i, to);
          rr += dr; cc += dc;
        }
      }
    }
  }
  return out;
}

export function applyMove(st: GameState, m: Move): GameState {
  const board = st.board.slice();
  const p = board[m.from]!;
  let captured = board[m.to];
  board[m.to] = m.promo ? (`${color(p)}${m.promo}` as Piece) : p;
  board[m.from] = null;
  if (m.ep) {
    const cap = m.to + (color(p) === 'w' ? 8 : -8);
    captured = board[cap]; board[cap] = null;
  }
  if (m.castle === 'K') { board[m.to - 1] = board[m.to + 1]; board[m.to + 1] = null; }
  if (m.castle === 'Q') { board[m.to + 1] = board[m.to - 2]; board[m.to - 2] = null; }
  const castle = { ...st.castle };
  if (type(p) === 'K') { castle[`${color(p)}K`] = false; castle[`${color(p)}Q`] = false; }
  for (const sq of [m.from, m.to]) {
    if (sq === 63) castle.wK = false;
    if (sq === 56) castle.wQ = false;
    if (sq === 7) castle.bK = false;
    if (sq === 0) castle.bQ = false;
  }
  return {
    board, turn: opp(st.turn), castle,
    ep: m.double ? (m.from + m.to) / 2 : -1,
    half: type(p) === 'P' || captured ? 0 : st.half + 1,
    captured: captured || null,
  };
}

export function legalMoves(st: GameState): Move[] {
  return pseudoMoves(st, st.turn).filter(m => !inCheck(applyMove(st, m).board, st.turn));
}

/** Position key for threefold repetition. En passant only counts when a capture is actually available. */
export function posKey(st: GameState): string {
  let ep = -1;
  if (st.ep >= 0 && legalMoves(st).some(m => m.ep)) ep = st.ep;
  const c = st.castle;
  return st.board.map(p => p || '.').join('') + st.turn + (c.wK ? 'K' : '') + (c.wQ ? 'Q' : '') + (c.bK ? 'k' : '') + (c.bQ ? 'q' : '') + ep;
}

export function insufficient(board: Board): boolean {
  const rest = board.filter((p): p is Piece => !!p && type(p) !== 'K');
  if (rest.length === 0) return true;
  return rest.length === 1 && (type(rest[0]) === 'N' || type(rest[0]) === 'B');
}

export function perft(st: GameState, d: number): number {
  if (d === 0) return 1;
  let n = 0;
  for (const m of legalMoves(st)) n += perft(applyMove(st, m), d - 1);
  return n;
}

/* ---------- Computer player: negamax with alpha-beta and a short capture search ---------- */
export function evaluate(board: Board): number {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const r = i >> 3, c = i & 7, t = type(p), w = color(p) === 'w';
    const centre = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
    let v = VAL[t];
    if (t === 'N' || t === 'B') v += centre * 9 - ((w ? r === 7 : r === 0) ? 12 : 0);
    else if (t === 'P') v += (w ? 6 - r : r - 1) * 7 + (c === 3 || c === 4 ? centre * 5 : 0);
    else if (t === 'Q') v += centre * 2;
    else if (t === 'K') v += (w ? r === 7 : r === 0) && (c <= 2 || c >= 6) ? 18 : 0;
    s += w ? v : -v;
  }
  return s;
}
function orderScore(st: GameState, m: Move) {
  const target = st.board[m.to];
  const victim = m.ep ? 100 : target ? VAL[type(target)] : 0;
  return (victim ? victim * 10 - VAL[type(st.board[m.from]!)] / 10 : 0) + (m.promo === 'Q' ? 9000 : 0);
}
function quiesce(st: GameState, alpha: number, beta: number, qd: number): number {
  const stand = evaluate(st.board) * (st.turn === 'w' ? 1 : -1);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  if (qd >= 4) return alpha;
  const caps = pseudoMoves(st, st.turn).filter(m => st.board[m.to] || m.ep || m.promo === 'Q');
  caps.sort((a, b) => orderScore(st, b) - orderScore(st, a));
  for (const m of caps) {
    const child = applyMove(st, m);
    if (inCheck(child.board, st.turn)) continue;
    const v = -quiesce(child, -beta, -alpha, qd + 1);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

const TIME_UP = Symbol('time');
let stopAt = 0, nodes = 0; // optional time limit for a search
function negamax(st: GameState, depth: number, alpha: number, beta: number, ply: number): number {
  if (stopAt && (++nodes & 255) === 0 && Date.now() > stopAt) throw TIME_UP;
  const moves = legalMoves(st);
  if (!moves.length) return inCheck(st.board, st.turn) ? -(100000 - ply) : 0;
  if (st.half >= 100) return 0;
  if (depth === 0) return quiesce(st, alpha, beta, 0);
  moves.sort((a, b) => orderScore(st, b) - orderScore(st, a));
  for (const m of moves) {
    const v = -negamax(applyMove(st, m), depth - 1, -beta, -alpha, ply + 1);
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return alpha;
}
export function bestMove(st: GameState, depth: number, noise: number, avoidKeys?: Set<string>): Move | null {
  const moves = legalMoves(st);
  moves.sort((a, b) => orderScore(st, b) - orderScore(st, a));
  let best: Move | null = null, bestV = -Infinity;
  for (const m of moves) {
    const child = applyMove(st, m);
    let v = -negamax(child, depth - 1, -Infinity, noise ? Infinity : -bestV, 1);
    if (avoidKeys && avoidKeys.has(posKey(child)) && v > 0) v -= 60; // steer away from repetition when ahead
    if (noise) v += (Math.random() - 0.5) * noise;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

/**
 * The computer opponent. Each level plays in a different way, not just a little better:
 * 1 Easy   plays like a beginner: half its moves are on a whim, it often misses pieces it could take.
 * 2 Normal sees two moves ahead plus every capture sequence, with a little randomness so games vary.
 * 3 Hard   searches four moves ahead (when there is time) and plays the best move it finds.
 */
export function cpuMove(st: GameState, level: Level, avoidKeys?: Set<string>): Move | null {
  const moves = legalMoves(st);
  if (!moves.length) return null;
  if (level === 1) {
    const sign = st.turn === 'w' ? 1 : -1;
    const mate = moves.find(m => { const c = applyMove(st, m); return inCheck(c.board, c.turn) && !legalMoves(c).length; });
    if (mate && Math.random() < 0.25) return mate;
    if (Math.random() < 0.5) return moves[Math.floor(Math.random() * moves.length)];
    const base = evaluate(st.board) * sign;
    let best: Move | null = null, bestV = -Infinity;
    for (const m of moves) {
      const takes = st.board[m.to] || m.ep;
      const v = (takes && Math.random() < 0.5 ? base : evaluate(applyMove(st, m).board) * sign) + (Math.random() - 0.5) * 400;
      if (v > bestV) { bestV = v; best = m; }
    }
    return best;
  }
  if (level === 2) return bestMove(st, 2, 60, avoidKeys);
  let best = bestMove(st, 3, 0, avoidKeys);
  stopAt = Date.now() + 1500;
  try { best = bestMove(st, 4, 0, avoidKeys); } catch (e) { if (e !== TIME_UP) throw e; } finally { stopAt = 0; }
  return best;
}

/** How a position ends, if it does. Repetition needs the game's history, so the caller checks that. */
export type Outcome = { kind: 'checkmate'; winner: Color } | { kind: 'stalemate' | 'fifty' | 'insufficient' } | null;
export function outcome(st: GameState): Outcome {
  if (!legalMoves(st).length) return inCheck(st.board, st.turn) ? { kind: 'checkmate', winner: opp(st.turn) } : { kind: 'stalemate' };
  if (st.half >= 100) return { kind: 'fifty' };
  if (insufficient(st.board)) return { kind: 'insufficient' };
  return null;
}
