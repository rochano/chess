import { computed, inject, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { track } from './analytics';
import { CpuService } from './cpu.service';
import {
  applyMove, bestMove, Color, GameState, inCheck, initialState, insufficient, kingSq, legalMoves, Level, Move, NAME, opp,
  Piece, PieceType, posKey, sqName,
} from './engine';
import { I18nService } from './i18n.service';
import { heroName, OLD_HERO } from './names';
import { PrefsService } from './prefs.service';

export type Mode = 'friend' | 'cpu' | 'online' | 'train';
export interface GameOver {
  type: 'mate' | 'draw' | 'flag' | 'resign' | 'abandon';
  winner?: Color;
  /** Side that stalemated the other (draws by stalemate only). */
  stalemate?: Color;
  /** English sentence(s); shown through I18nService.trS. */
  text: string;
}
interface HistoryEntry {
  st: GameState; captured: Record<Color, Piece[]>; last: Move | null; started: boolean; keysLen: number;
  clk: Record<Color, number>; think: number; pick: number;
}
export type GameEvent =
  | { kind: 'start' }
  | { kind: 'move'; move: Move; prev: GameState; next: GameState; mover: Color; check: boolean }
  | { kind: 'select' } | { kind: 'stuck' } | { kind: 'tick' }
  | { kind: 'end'; over: GameOver };

/**
 * One game in progress: the G object and game-flow functions of the original game (newGame, onSquare, doMove,
 * undo, hint, the clock, the computer's turn) as an Angular service with signals.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  private cpu = inject(CpuService);
  private prefs = inject(PrefsService);
  private i18n = inject(I18nService);

  readonly events = new Subject<GameEvent>();

  readonly mode = signal<Mode>('friend');
  readonly level = signal<Level>(2);
  readonly st = signal<GameState>(initialState());
  readonly keys = signal<string[]>([]);
  readonly history = signal<HistoryEntry[]>([]);
  readonly captured = signal<Record<Color, Piece[]>>({ w: [], b: [] });
  readonly selected = signal<number | null>(null);
  readonly last = signal<Move | null>(null);
  readonly hintMove = signal<Move | null>(null);
  readonly over = signal<GameOver | null>(null);
  readonly thinking = signal(false);
  readonly hinting = signal(false);
  readonly stuck = signal<{ text: string; until: number } | null>(null);
  readonly tc = signal<{ base: number; inc: number } | null>(null);
  readonly clocks = signal<Record<Color, number>>({ w: 0, b: 0 });
  readonly names = signal<Record<Color, string>>({ w: 'Player 1', b: 'Player 2' });
  readonly pendingPromo = signal<Move[] | null>(null);
  /** Square whose piece just landed, for the small lift animation. */
  readonly animTo = signal(-1);

  private started = false;
  private startedAt = Date.now();
  private turnAt = Date.now();
  private selAt = 0;
  private lastTick = performance.now();

  readonly moves = computed(() => legalMoves(this.st()));
  readonly checkSq = computed(() => (inCheck(this.st().board, this.st().turn) ? kingSq(this.st().board, this.st().turn) : -1));
  readonly targets = computed(() => {
    const s = this.selected(), out = new Map<number, Move>();
    if (s !== null) for (const m of this.moves()) if (m.from === s) out.set(m.to, m);
    return out;
  });
  /** The side this device plays, or null when both sides share the device. */
  readonly myColor = computed<Color | null>(() => (this.mode() === 'cpu' ? 'w' : null));
  readonly humanTurn = computed(() => !this.over() && !this.thinking() && this.humanSide(this.st().turn));

  constructor() {
    setInterval(() => this.tick(), 100);
    this.newGame();
  }

  humanSide(c: Color) { const me = this.myColor(); return !me || c === me; }

  /** Overlays pause the clock; the UI sets this. */
  paused = () => false;

  fillNames() {
    const p = this.prefs.get();
    for (const key of ['nameW', 'nameB'] as const) {
      if (!p[key].trim() || OLD_HERO.test(p[key].trim())) this.prefs.set(key, heroName(this.i18n.lang()));
    }
  }

  newGame() {
    this.fillNames();
    const p = this.prefs.get();
    const mode: Mode = p.mode === 'online' ? 'friend' : p.mode; // online play comes in phase 3
    this.mode.set(mode);
    this.level.set(+p.level as Level);
    const [base, inc] = p.clock === '0' ? [0, 0] : p.clock.split('+').map(Number);
    const tc = base ? { base: base * 60000, inc: inc * 1000 } : null;
    this.tc.set(tc);
    this.clocks.set({ w: tc?.base ?? 0, b: tc?.base ?? 0 });
    const st = initialState();
    this.st.set(st);
    this.history.set([]);
    this.captured.set({ w: [], b: [] });
    this.selected.set(null); this.last.set(null); this.hintMove.set(null); this.over.set(null); this.stuck.set(null);
    this.thinking.set(false); this.pendingPromo.set(null);
    this.keys.set([posKey(st)]);
    this.started = false;
    this.names.set({
      w: p.nameW.trim() || (mode === 'cpu' ? 'You' : 'Player 1'),
      b: mode === 'cpu' ? 'Computer' : p.nameB.trim() || 'Player 2',
    });
    this.startedAt = Date.now(); this.turnAt = Date.now(); this.selAt = 0;
    this.events.next({ kind: 'start' });
  }

  onSquare(i: number) {
    if (this.over() || this.thinking() || this.paused()) return;
    if (!this.humanSide(this.st().turn)) return;
    const st = this.st(), p = st.board[i], sel = this.selected();
    if (sel !== null) {
      const cands = this.moves().filter(m => m.from === sel && m.to === i);
      if (cands.length > 1) { this.pendingPromo.set(cands); return; }
      if (cands.length) { this.doMove(cands[0]); return; }
    }
    const next = p && p[0] === st.turn && sel !== i ? i : null;
    this.selected.set(next);
    this.selAt = next === null ? 0 : Date.now();
    this.stuck.set(null);
    if (next !== null && !this.moves().some(m => m.from === next)) {
      // This piece has no legal move: say why and point at the pieces that can move.
      const t = p![1] as PieceType, check = inCheck(st.board, st.turn);
      const until = Date.now() + 4500;
      this.stuck.set({
        until,
        text: check
          ? (t === 'K' ? 'Your king has no safe square: its neighbours are blocked by your own pieces or attacked. ' : `This ${NAME[t]} can't stop the check. `)
            + 'Block the check or capture the attacker. Glowing pieces can move.'
          : `This ${NAME[t]} has no legal move${t === 'K' ? '' : ' (it may be pinned to your king)'}. Glowing pieces can move.`,
      });
      this.selected.set(null);
      this.events.next({ kind: 'stuck' });
      setTimeout(() => { if (this.stuck()?.until === until) this.stuck.set(null); }, 4600);
    } else if (next !== null) this.events.next({ kind: 'select' });
  }

  promote(q: Move['promo']) {
    const c = this.pendingPromo(); this.pendingPromo.set(null);
    const m = c?.find(x => x.promo === q);
    if (m) this.doMove(m);
  }

  doMove(m: Move) {
    const prev = this.st(), mover = prev.turn, now = Date.now();
    this.history.update(h => [...h, {
      st: prev, captured: { w: [...this.captured().w], b: [...this.captured().b] }, last: this.last(), started: this.started,
      keysLen: this.keys().length, clk: { ...this.clocks() }, think: now - this.turnAt,
      pick: this.selAt && this.selected() === m.from ? now - this.selAt : 0,
    }]);
    this.turnAt = now; this.selAt = 0;
    const next = applyMove(prev, m);
    if (next.captured) this.captured.update(c => ({ ...c, [mover]: [...c[mover], next.captured!] }));
    const tc = this.tc();
    if (tc && this.started) this.clocks.update(c => ({ ...c, [mover]: c[mover] + tc.inc }));
    this.started = true;
    this.st.set(next);
    this.last.set(m); this.selected.set(null); this.hintMove.set(null); this.animTo.set(m.to);
    const key = posKey(next);
    this.keys.update(k => [...k, key]);
    const check = inCheck(next.board, next.turn);
    let over: GameOver | null = null;
    if (!legalMoves(next).length) {
      over = check
        ? { type: 'mate', winner: mover, text: `Checkmate. ${mover === 'w' ? 'White' : 'Black'} wins.` }
        : { type: 'draw', stalemate: mover, text: 'Stalemate. The game is a draw.' };
    } else if (next.half >= 100) over = { type: 'draw', text: 'Draw by the fifty-move rule.' };
    else if (this.keys().filter(k => k === key).length >= 3) over = { type: 'draw', text: 'Draw by threefold repetition.' };
    else if (insufficient(next.board)) over = { type: 'draw', text: 'Draw. Neither side can force mate.' };
    this.events.next({ kind: 'move', move: m, prev, next, mover, check });
    if (over) this.finish(over);
    else void this.maybeComputer();
  }

  finish(over: GameOver) {
    this.over.set(over);
    this.thinking.set(false);
    const me = this.myColor();
    track('game_end', {
      opponent: this.mode(), level: this.mode() === 'cpu' ? this.level() : 0, result: over.type,
      outcome: over.type === 'draw' ? 'draw' : !me ? 'local' : over.winner === me ? 'win' : 'loss',
    });
    this.events.next({ kind: 'end', over });
  }

  private async maybeComputer() {
    if (this.mode() !== 'cpu' || this.st().turn !== 'b' || this.over()) return;
    this.thinking.set(true);
    const st = this.st();
    const m = await this.cpu.think(st, this.level(), this.keys());
    if (this.st() !== st) return; // the game moved on (undo, new game)
    this.thinking.set(false);
    if (m && !this.over()) this.doMove(m);
  }

  undo() {
    if (!this.history().length || this.thinking() || this.mode() === 'online') return;
    const h = [...this.history()];
    const pop = () => {
      const e = h.pop()!;
      this.st.set(e.st); this.captured.set(e.captured); this.last.set(e.last); this.started = e.started;
      this.keys.update(k => k.slice(0, e.keysLen));
    };
    pop();
    if (this.mode() === 'cpu') while (this.st().turn === 'b' && h.length) pop();
    this.history.set(h);
    this.over.set(null); this.selected.set(null); this.hintMove.set(null);
    if (this.tc()) this.clocks.update(c => ({ w: Math.max(c.w, 1000), b: Math.max(c.b, 1000) }));
    void this.maybeComputer();
  }

  hint() {
    if (this.over() || this.thinking() || this.mode() === 'online') return;
    this.hinting.set(true);
    setTimeout(() => {
      const m = bestMove(this.st(), 2, 0, new Set(this.keys()));
      this.hinting.set(false);
      if (!m) return;
      this.hintMove.set(m); this.selected.set(m.from);
    }, 30);
  }

  resign() {
    const who = this.myColor() || this.st().turn;
    const [me, them] = who === 'w' ? ['White', 'Black'] : ['Black', 'White'];
    this.finish({ type: 'resign', winner: opp(who), text: `${me} resigned. ${them} wins.` });
  }

  private tick() {
    const now = performance.now(), dt = now - this.lastTick; this.lastTick = now;
    if (!this.tc() || !this.started || this.over() || this.paused()) return;
    const c = this.st().turn;
    const left = this.clocks()[c] - dt;
    if (left <= 0) {
      this.clocks.update(x => ({ ...x, [c]: 0 }));
      const w = opp(c), name = (x: Color) => (x === 'w' ? 'White' : 'Black');
      this.finish({ type: 'flag', winner: w, text: `${name(c)} ran out of time. ${name(w)} wins.` });
      return;
    }
    if (left < 10000 && Math.floor(left / 1000) !== Math.floor(this.clocks()[c] / 1000)) this.events.next({ kind: 'tick' });
    this.clocks.update(x => ({ ...x, [c]: left }));
  }

  /** Status line under the board, as an English sentence for trS. */
  readonly statusText = computed(() => {
    const st = this.st(), over = this.over(), stuck = this.stuck(), hint = this.hintMove();
    if (over) return over.text;
    if (stuck) return stuck.text;
    if (this.hinting()) return 'Thinking about a hint…';
    if (this.checkSq() >= 0) return `Check! ${st.turn === 'w' ? 'White' : 'Black'} must answer it.`;
    if (hint) return `Hint: ${NAME[st.board[hint.from]![1] as PieceType]} ${sqName(hint.from)} to ${sqName(hint.to)}`;
    if (!this.history().length) return this.mode() === 'cpu' ? 'You play White. Tap a piece to see its moves.' : 'Tap a piece to see its moves.';
    return `Move ${Math.floor(this.history().length / 2) + 1}`;
  });

  get elapsedMinutes() { return Math.round((Date.now() - this.startedAt) / 6000) / 10; }
}
