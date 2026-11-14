import { effect, inject, Injectable, signal } from '@angular/core';
import { track } from '../core/analytics';
import { al, audioState, ctx, env, musicLevel, mv, orchLoad, sfx, splay } from '../audio/engine';
import { applyMove, fromFEN, GLYPH, inCheck, kingSq, legalMoves, NAME, sqName } from '../core/engine';
import { GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { PrefsService } from '../core/prefs.service';
import { UiService } from '../core/ui.service';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Legacy = { Battle: any; Intro: any; PieceTip: any };

/**
 * The 3D battlefield and the intro scenes. three.js and the scene code load lazily after the first paint,
 * so the board shows right away; the 2D board works on its own if WebGL is missing.
 */
@Injectable({ providedIn: 'root' })
export class BattleService {
  private g = inject(GameService);
  private prefs = inject(PrefsService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private legacy?: Legacy;

  readonly ready = signal(false);
  readonly ok = signal(true);
  readonly active = signal(false);
  readonly follow = signal(this.prefs.get().follow !== false);

  constructor() {
    // Redraw the scene whenever what it shows changes.
    effect(() => {
      this.g.st(); this.g.selected(); this.g.last(); this.g.hintMove(); this.g.stuck(); this.g.over();
      if (this.ready() && this.active()) this.legacy!.Battle.refresh();
    });
  }

  async init() {
    const THREE = await import('three');
    (window as any).THREE = THREE;
    const { create } = await import('./legacy3d');
    this.legacy = create(this.deps()) as Legacy;
    const B = this.legacy.Battle;
    this.ok.set(!!B.ok);
    B.follow = this.follow();
    if (B.ok && this.prefs.get().view !== '2d') this.active.set(!!B.setActive(true));
    this.ready.set(true);
    B.refresh();
    this.g.events.subscribe(ev => {
      if (ev.kind === 'move') B.animate(ev.move, ev.prev);
      else if (ev.kind === 'start') B.focus?.(-1);
    });
    document.addEventListener('pointerdown', () => { try { ctx(); orchLoad(this.legacy!.Intro.INST); } catch { /* no audio */ } }, { once: true, capture: true });
    // ?intro=easy|normal|hard plays a scene straight away (for checking how they look)
    const q = new URLSearchParams(location.search).get('intro');
    if (q !== null) { this.ui.closeAll(); this.intro(this.legacy.Intro.SCENES[q] ? q : 'normal'); }
  }

  private deps() {
    const g = this.g, prefs = this.prefs, i18n = this.i18n;
    const G = {
      get st() { return g.st(); }, set st(v) { g.st.set(v); },
      get moves() { return legalMoves(g.st()); }, set moves(_v) { /* derived from st */ },
      get last() { return g.last(); }, set last(v) { g.last.set(v); },
      get selected() { return g.selected(); },
      get hint() { return g.hintMove(); },
      get stuck() { return g.stuck(); },
      get over() { return g.over(); },
      get mode() { return g.mode(); },
      get level() { return g.level(); },
      get history() { return g.history(); },
      look: null, arrows: null,
    };
    const prefsProxy = new Proxy({}, {
      get: (_t, k: string) => (prefs.get() as any)[k],
      set: (_t, k: string, v) => { prefs.set(k as any, v); return true; },
    });
    return {
      G, prefs: prefsProxy, savePrefs: () => {}, onSquare: (i: number) => g.onSquare(i), render: () => {},
      tr: (s: string) => i18n.tr(s), T: (th: string, en: string) => i18n.t(th, en), LANG: i18n.lang(),
      myColor: () => g.myColor(), track, esc: (t: string) => String(t).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';'),
      anyOverlay: () => this.ui.any(), hide: () => {}, $: (id: string) => document.getElementById(id),
      applyMove, inCheck, kingSq, legalMoves, fromFEN, GLYPH, NAME, sqName,
      ctx, env, splay, orchLoad, musicLevel, mv, al, sfx, A: audioState,
    };
  }

  toggleView() {
    const B = this.legacy?.Battle; if (!B) return;
    const on = !this.active();
    if (!B.setActive(on)) { this.ok.set(false); return; }
    this.active.set(on);
    this.prefs.set('view', on ? '3d' : '2d');
  }
  toggleFollow() {
    const B = this.legacy?.Battle; if (!B) return;
    B.follow = !B.follow; this.follow.set(B.follow); this.prefs.set('follow', B.follow);
  }
  resetView() { this.legacy?.Battle.resetView(); }
  focus(sq: number) { this.legacy?.Battle.focus?.(sq); }

  /** Play the 5-second intro scene for this game (Settings can turn it off). */
  intro(scene?: string) {
    const I = this.legacy?.Intro; if (!I) return;
    I.run(scene);
    this.follow.set(this.legacy!.Battle.follow);
  }
  tipShow(sq: number, x: number, y: number) { this.legacy?.PieceTip.show(sq, x, y); }
  tipHide() { this.legacy?.PieceTip.hide(); }
}
