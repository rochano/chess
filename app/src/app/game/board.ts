import { Component, computed, inject, signal } from '@angular/core';
import { CpuService } from '../core/cpu.service';
import {
  applyMove, Color, GameState, GLYPH, initialState, inCheck, kingSq, legalMoves, Level, Move, outcome, PieceType, posKey,
} from '../core/engine';
import { I18nService } from '../core/i18n.service';
import { TrPipe } from '../core/tr.pipe';

/**
 * Phase 0 board: you (White) against the computer, using the ported engine.
 * The full game screen (clocks, 3D view, Sergeant, recap, story…) is ported in phase 1.
 */
@Component({
  selector: 'app-board',
  imports: [TrPipe],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class BoardComponent {
  private cpu = inject(CpuService);
  protected i18n = inject(I18nService);

  readonly you: Color = 'w';
  readonly level = signal<Level>(2);
  readonly st = signal<GameState>(initialState());
  readonly keys = signal<string[]>([posKey(initialState())]);
  readonly selected = signal<number | null>(null);
  readonly last = signal<Move | null>(null);
  readonly thinking = signal(false);
  readonly squares = Array.from({ length: 64 }, (_, i) => i);

  readonly moves = computed(() => legalMoves(this.st()));
  readonly targets = computed(() => {
    const s = this.selected();
    return new Set(s === null ? [] : this.moves().filter(m => m.from === s).map(m => m.to));
  });
  readonly checkSq = computed(() => (inCheck(this.st().board, this.st().turn) ? kingSq(this.st().board, this.st().turn) : -1));
  readonly result = computed(() => {
    const o = outcome(this.st());
    if (o) return o;
    const k = this.keys(), now = k[k.length - 1];
    return k.filter(x => x === now).length >= 3 ? ({ kind: 'repetition' } as const) : null;
  });
  readonly status = computed(() => {
    const r = this.result(), tr = (s: string) => this.i18n.tr(s);
    if (r?.kind === 'checkmate') return tr('Checkmate.') + ' ' + (r.winner === this.you ? this.i18n.t('คุณชนะ!', 'You win!') : this.i18n.t('คอมพิวเตอร์ชนะ', 'The computer wins.'));
    if (r) return this.i18n.t('เสมอ', 'Draw') + ' (' + r.kind + ')';
    if (this.thinking()) return this.i18n.t('คอมพิวเตอร์กำลังคิด…', 'The computer is thinking…');
    return (this.checkSq() >= 0 ? tr('Check!') + ' ' : '') + this.i18n.t('ตาคุณเดิน', 'Your move');
  });

  glyph(i: number) { const p = this.st().board[i]; return p ? GLYPH[p[1] as PieceType] : ''; }
  pieceColor(i: number) { return this.st().board[i]?.[0] ?? ''; }
  dark(i: number) { return ((i >> 3) + (i & 7)) % 2 === 1; }

  tap(i: number) {
    if (this.thinking() || this.result() || this.st().turn !== this.you) return;
    const sel = this.selected();
    if (sel !== null && this.targets().has(i)) {
      // Promotion picker comes with the phase 1 game screen; for now a pawn becomes a queen.
      const m = this.moves().find(x => x.from === sel && x.to === i && (!x.promo || x.promo === 'Q'))!;
      this.play(m);
      void this.cpuTurn();
      return;
    }
    this.selected.set(this.pieceColor(i) === this.you && sel !== i ? i : null);
  }

  private play(m: Move) {
    const next = applyMove(this.st(), m);
    this.st.set(next);
    this.keys.update(k => [...k, posKey(next)]);
    this.last.set(m);
    this.selected.set(null);
  }

  private async cpuTurn() {
    if (this.result()) return;
    this.thinking.set(true);
    const m = await this.cpu.think(this.st(), this.level(), this.keys());
    this.thinking.set(false);
    if (m) this.play(m);
  }

  newGame(level: Level = this.level()) {
    this.level.set(level);
    this.st.set(initialState());
    this.keys.set([posKey(initialState())]);
    this.last.set(null);
    this.selected.set(null);
  }
}
