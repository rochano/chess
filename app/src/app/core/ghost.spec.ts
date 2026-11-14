import { applyMove, GameState, initialState, legalMoves, Move } from './engine';
import {
  addBook, addStyle, decodeBook, EMPTY_STYLE, encodeBook, findMove, ghostLevel, ghostMove, ghostSide, learnGame, moveCode, posHash, traits,
} from './ghost';

/** Play a list of moves ("e2e4 e7e5 ...") and return the positions before each move and the moves. */
function game(line: string): { positions: GameState[]; moves: Move[] } {
  let st = initialState();
  const positions: GameState[] = [], moves: Move[] = [];
  for (const c of line.split(' ')) { const m = findMove(st, c)!; expect(m).toBeTruthy(); positions.push(st); moves.push(m); st = applyMove(st, m); }
  return { positions, moves };
}
const LINE = 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 e1g1 f8c5 d2d3 d7d6 c1g5 h7h6 g5f6 d8f6 b1c3 c8g4';

describe('bot that plays like you', () => {
  it('learns only its own side, with castling and opening moves', () => {
    const { positions, moves } = game(LINE);
    const r = learnGame(positions, moves, 'w')!;
    expect(r.style.mv).toBe(8);
    expect(r.style.nw).toBe(1);
    expect(r.style.cas).toBe(1);
    expect(r.style.pN).toBe(2);
    expect(r.book[posHash(initialState())]).toEqual({ e2e4: 1 });
    const blk = learnGame(positions, moves, 'b')!;
    expect(blk.style.nb).toBe(1);
    expect(blk.book[posHash(initialState())]).toBeUndefined();
  });

  it('skips games that are too short', () => {
    const { positions, moves } = game('e2e4 e7e5 d1h5');
    expect(learnGame(positions, moves, 'w')).toBeNull();
  });

  it('book survives encoding and merging', () => {
    const { positions, moves } = game(LINE);
    const a = learnGame(positions, moves, 'w')!.book;
    const both = addBook(a, a);
    const back = decodeBook(encodeBook(both));
    expect(back[posHash(initialState())]).toEqual({ e2e4: 2 });
    expect(decodeBook('')).toEqual({});
  });

  it('plays its own opening move from the book, and always a legal move', () => {
    const { positions, moves } = game(LINE);
    const r = learnGame(positions, moves, 'w')!;
    const play = { style: addStyle(addStyle(r.style, r.style), r.style), book: r.book };
    for (let i = 0; i < 5; i++) expect(moveCode(ghostMove(initialState(), play)!)).toBe('e2e4');
    let st = initialState();
    for (let ply = 0; ply < 12; ply++) {
      const m = ghostMove(st, { style: { ...EMPTY_STYLE }, book: {} })!;
      expect(legalMoves(st).some(x => x.from === m.from && x.to === m.to)).toBe(true);
      st = applyMove(st, m);
      if (!legalMoves(st).length) break;
    }
  });

  it('describes side, level and style in plain words', () => {
    const s = { ...EMPTY_STYLE, n: 5, nw: 1, nb: 4, mv: 100, cap: 18, capN: 20, chk: 10, chkN: 20, pQ: 25, pP: 25, pN: 15, pB: 15, pR: 10, pK: 10, cas: 4, blun: 2 };
    expect(ghostSide(s)).toBe('b');
    expect(ghostLevel(s)).toBe(3);
    expect(ghostLevel({ ...s, blun: 40 })).toBe(1);
    const t = traits(s).map(x => x.en);
    expect(t.length).toBeLessThanOrEqual(3);
    expect(t).toContain('Takes every piece it can');
  });
});
