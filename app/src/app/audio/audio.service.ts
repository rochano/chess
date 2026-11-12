import { effect, inject, Injectable } from '@angular/core';
import { Color, inCheck, PieceType, VAL } from '../core/engine';
import { GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { PrefsService } from '../core/prefs.service';
import { UiService } from '../core/ui.service';
import { installAudioListeners, musicSting, setAudioHost, sfx, startMusic, stopMusic, updateMusic } from './engine';

/** Connects the ported audio engine to the game: sound effects on game events, music that follows the game. */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private g = inject(GameService);
  private ui = inject(UiService);
  private prefs = inject(PrefsService);
  private i18n = inject(I18nService);
  /** Optional: the Sergeant's stress per side (from the Sergeant, when ported). */
  stress: () => Record<Color, number> = () => ({ w: 0, b: 0 });
  /** Optional: stop the Sergeant's voice when the page goes away. */
  stopVoice: () => void = () => {};

  readonly sfx = sfx;

  init() {
    setAudioHost({ prefs: () => this.prefs.get(), mood: () => this.mood(), stopVoice: () => this.stopVoice(), lang: () => this.i18n.lang() });
    installAudioListeners();
    // Every button press clicks, like the original.
    document.addEventListener('click', e => { if ((e.target as Element).closest?.('.btn, .seg button, .tool')) sfx.click(); });
    this.g.events.subscribe(ev => {
      switch (ev.kind) {
        case 'select': sfx.select(); break;
        case 'stuck': sfx.click(); break;
        case 'tick': sfx.tick(); break;
        case 'start': sfx.move(); startMusic(); break;
        case 'move': {
          const { move: m, next, check } = ev;
          if (this.g.mode() === 'train' && this.g.over()) { sfx.end(this.g.over(), false); break; }
          if (this.g.over() || !this.g.moves().length || next.half >= 100) break; // 'end' plays the final sound
          if (check) sfx.check(); else if (m.promo) sfx.promote(); else if (m.castle) sfx.castle(); else if (next.captured) sfx.capture(); else sfx.move();
          break;
        }
        case 'end': {
          const o = ev.over, me = this.g.myColor();
          sfx.end(o, this.g.mode() === 'cpu' && o.winner === 'b');
          musicSting(o.type === 'draw' ? 'draw' : me && o.winner !== me ? 'lose' : 'win');
          break;
        }
      }
    });
    // Music on/off and volume follow Settings.
    let wasOn = this.prefs.get().music;
    effect(() => {
      const p = this.prefs.value();
      if (p.music !== wasOn) { wasOn = p.music; if (p.music) startMusic(); else stopMusic(); }
      else if (p.music) startMusic(); // picks up a new volume or soundtrack
      updateMusic();
    });
  }

  /** Pick the theme and intensity from what is happening now (musicMood in the original). */
  private mood(): { theme: string; level: number } {
    const g = this.g;
    if (this.ui.isOpen('menu') || this.ui.isOpen('credits')) return { theme: 'menu', level: 0 };
    const o = g.over();
    if (o) { const me = g.myColor(); return { theme: o.type === 'draw' ? 'afterDraw' : me && o.winner !== me ? 'afterLose' : 'afterWin', level: 0 }; }
    if (!g.history().length) return { theme: 'battle', level: 0 };
    const me = g.myColor() || g.st().turn, hard = g.mode() === 'cpu' && g.level() === 3;
    return { theme: hard && this.pressure(me) >= 2 ? 'boss' : 'battle', level: this.pressure(me) + (hard && g.history().length > 10 ? 1 : 0) };
  }

  private pressure(side: Color) {
    const g = this.g, st = g.st();
    let p = g.history().length >= 14 ? 1 : 0;
    if (inCheck(st.board, side)) p += 1;
    if (g.tc() && g.history().length) { const ms = g.clocks()[side]; if (ms < 10000) p += 2; else if (ms < 30000) p += 1; }
    const material = st.board.reduce((s, x) => s + (x ? (x[0] === side ? 1 : -1) * VAL[x[1] as PieceType] : 0), 0);
    if (material <= -300) p += 1;
    if (this.stress()[side] >= 70) p += 1;
    if (st.board.filter(Boolean).length <= 10) p += 1;
    return Math.min(3, p);
  }
}
