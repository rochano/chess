import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyMove, Board, evaluate, GameState, initialState, legalMoves, outcome, perft, Piece, posKey,
} from './engine';

function fromFen(fen: string): GameState {
  const [rows, turn, cast, ep] = fen.split(' ');
  const board: Board = [];
  for (const ch of rows.replace(/\//g, '')) {
    if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) board.push(null);
    else board.push(((ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase()) as Piece);
  }
  const epSq = ep === '-' ? -1 : (8 - +ep[1]) * 8 + 'abcdefgh'.indexOf(ep[0]);
  return {
    board, turn: turn as 'w' | 'b', ep: epSq, half: 0, captured: null,
    castle: { wK: cast.includes('K'), wQ: cast.includes('Q'), bK: cast.includes('k'), bQ: cast.includes('q') },
  };
}

const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -';

describe('engine rules', () => {
  it('matches known perft counts from the start', () => {
    const st = initialState();
    expect([1, 2, 3].map(d => perft(st, d))).toEqual([20, 400, 8902]);
  });
  it('matches perft on Kiwipete (castling, en passant, promotion)', () => {
    expect(perft(fromFen(KIWIPETE), 1)).toBe(48);
    expect(perft(fromFen(KIWIPETE), 2)).toBe(2039);
  });
  it('detects checkmate and stalemate', () => {
    expect(outcome(fromFen('7k/6Q1/6K1/8/8/8/8/8 b - -'))).toEqual({ kind: 'checkmate', winner: 'w' });
    expect(outcome(fromFen('7k/5Q2/6K1/8/8/8/8/8 b - -'))).toEqual({ kind: 'stalemate' });
    expect(outcome(fromFen('7k/8/6K1/8/8/8/8/5N2 b - -'))).toEqual({ kind: 'insufficient' });
  });
});

/* The port must behave exactly like the live game: run the original engine from ../index.html side by side. */
describe('parity with the original game', () => {
  const html = readFileSync(resolve(process.cwd(), '../index.html'), 'utf8');
  const src = html.slice(html.indexOf('/*ENGINE START*/'), html.indexOf('/*ENGINE END*/'));
  const legacy = new Function(`${src}; return { initialState, legalMoves, applyMove, evaluate, posKey };`)();

  it('gives the same moves, evaluation and keys along random games', () => {
    for (let g = 0; g < 20; g++) {
      let st = initialState();
      for (let ply = 0; ply < 80; ply++) {
        const mine = legalMoves(st), theirs = legacy.legalMoves(st);
        expect(mine).toEqual(theirs);
        expect(evaluate(st.board)).toBe(legacy.evaluate(st.board));
        expect(posKey(st)).toBe(legacy.posKey(st));
        if (!mine.length) break;
        const m = mine[Math.floor(Math.random() * mine.length)];
        expect(applyMove(st, m)).toEqual(legacy.applyMove(st, m));
        st = applyMove(st, m);
      }
    }
  });
});
