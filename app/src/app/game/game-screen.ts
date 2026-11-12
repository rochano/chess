import { Component, computed, inject } from '@angular/core';
import { Color, GLYPH, opp, PieceType, sqName, NAME, VAL } from '../core/engine';
import { fmtClock } from '../core/format';
import { GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { AVATAR, ICON } from '../core/icons';
import { PrefsService } from '../core/prefs.service';
import { SafeHtmlPipe } from '../core/safe-html.pipe';
import { TrPipe } from '../core/tr.pipe';
import { UiService } from '../core/ui.service';
import { TauntComponent } from '../sergeant/taunt';
import { BattleService } from '../battle/battle.service';
import { StreamerComponent, StreamerService } from '../sergeant/streamer';

/** The table: top bar, board, players, clocks and tools (the .app block of the original page). */
@Component({
  selector: 'app-game-screen',
  imports: [TrPipe, SafeHtmlPipe, TauntComponent, StreamerComponent],
  templateUrl: './game-screen.html',
  host: { style: 'display: contents' },
})
export class GameScreenComponent {
  protected g = inject(GameService);
  protected i18n = inject(I18nService);
  protected ui = inject(UiService);
  protected prefs = inject(PrefsService);
  protected streamer = inject(StreamerService);
  protected battle = inject(BattleService);
  protected readonly ICON = ICON;
  protected readonly AVATAR = AVATAR;
  protected readonly GLYPH = GLYPH;
  protected readonly fmt = fmtClock;
  protected readonly sides: Color[] = ['b', 'w'];

  /** The flat board turns round when this device plays Black. */
  protected flipped = computed(() => this.g.myColor() === 'b');
  protected order = computed(() => {
    const sq = Array.from({ length: 64 }, (_, i) => i);
    return this.flipped() ? sq.reverse() : sq;
  });
  protected files = computed(() => [...(this.flipped() ? 'hgfedcba' : 'abcdefgh')]);
  protected ranks = computed(() => (this.flipped() ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1]));

  protected turnText = computed(() => {
    const g = this.g;
    return this.i18n.tr(g.over() ? 'Game over' : g.thinking() ? 'Computer is thinking' : (g.st().turn === 'w' ? 'White' : 'Black') + ' to move');
  });
  protected status = computed(() => this.i18n.trS(this.g.statusText()));
  protected levelName = computed(() => ['', 'Easy', 'Normal', 'Hard'][this.g.level()]);

  constructor() {
    // Overlays pause the clock, as in the original game.
    this.g.paused = () => this.ui.any() || !!this.g.pendingPromo();
  }

  sqClass(i: number) {
    const g = this.g, last = g.last(), hint = g.hintMove(), t = g.targets();
    return {
      dark: ((i >> 3) + (i & 7)) % 2 === 1,
      last: !!last && (last.from === i || last.to === i),
      sel: g.selected() === i,
      hint: !!hint && (hint.from === i || hint.to === i),
      check: i === g.checkSq() && g.over()?.type !== 'mate',
      mate: i === g.checkSq() && g.over()?.type === 'mate',
      can: !!g.stuck() && g.moves().some(m => m.from === i),
      target: t.has(i),
      take: t.has(i) && (!!g.st().board[i] || !!t.get(i)!.ep),
    };
  }
  label(i: number) {
    const p = this.g.st().board[i];
    return sqName(i) + (p ? ', ' + (p[0] === 'w' ? 'white ' : 'black ') + NAME[p[1] as PieceType] : ', empty');
  }
  glyph(i: number) { const p = this.g.st().board[i]; return p ? GLYPH[p[1] as PieceType] : ''; }
  pc(i: number) { return this.g.st().board[i]?.[0] ?? ''; }

  caps(c: Color) {
    const list = [...this.g.captured()[c]].sort((a, b) => VAL[b[1] as PieceType] - VAL[a[1] as PieceType]);
    const material = (x: Color) => this.g.captured()[x].reduce((s, p) => s + VAL[p[1] as PieceType], 0);
    return { list, diff: Math.round((material(c) - material(opp(c))) / 100) };
  }
  glyphOf(p: string) { return GLYPH[p[1] as PieceType]; }

  tap(i: number) { this.g.onSquare(i); }

  reset() {
    if (!this.g.history().length) { this.ui.show('menu'); return; }
    this.ui.confirm('Start over?', 'This game will be cleared and you can pick new settings.', 'Start over', () => { this.g.newGame(); this.ui.show('menu'); });
  }
  resign() {
    const who = this.g.myColor() || this.g.st().turn;
    const [me, them] = who === 'w' ? ['White', 'Black'] : ['Black', 'White'];
    this.ui.confirm('Resign this game?', `${me} resigns and ${them} is awarded the win.`, 'Resign', () => this.g.resign());
  }
  again() { this.g.newGame(); this.ui.show('menu'); }
  toggleMusic() { this.prefs.set('music', !this.prefs.get().music); }
  openSettings() { this.ui.backToMenu = false; this.ui.show('settings'); }
}
