import { effect, inject, Injectable } from '@angular/core';
import { hasVoice, musicSting, startMusic, al, mv, sfx, splay, stopVoice, voice } from '../audio/engine';
import { BattleService } from '../battle/battle.service';
import { track } from '../core/analytics';
import {
  applyMove, bestMove, evaluate, fromFEN, GLYPH, inCheck, insufficient, kingSq, legalMoves, NAME, negamax, opp, orderScore,
  posKey, pseudoMoves, quiesce, sqName, VAL,
} from '../core/engine';
import { GameService, Mode } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { PrefsService } from '../core/prefs.service';
import { Overlay, UiService } from '../core/ui.service';
import { HOME_URL } from '../share/share.service';
import { create } from './legacy-train';

/* eslint-disable @typescript-eslint/no-explicit-any */
function lsGet<T>(k: string, d: T): T { try { const v = JSON.parse(localStorage.getItem(k)!); return v == null ? d : v; } catch { return d; } }
function lsSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }

/** Road to master, the daily puzzle and the tutorial (ported code), hooked into the game flow. */
@Injectable({ providedIn: 'root' })
export class TrainService {
  private g = inject(GameService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private prefs = inject(PrefsService);
  private battle = inject(BattleService);
  L: any;

  constructor() {
    // Teaching arrows on the flat board follow the lesson and the board's orientation.
    effect(() => { if (this.g.mode() !== 'train') { const c = document.getElementById('coach'); if (c) c.hidden = true; } });
    effect(() => { this.g.arrows(); this.g.myColor(); this.g.redraw(); if (this.L) this.L.drawArrows(); });
  }

  /** Call after the first render: the ported code looks up its elements once. */
  init() {
    this.L = create(this.deps());
    const T = this.L.Train;
    this.g.train = {
      side: () => T.side(), blocked: () => !!(T.done || T.wait), passTurn: () => !!T.passTurn(),
      after: (m, mover) => T.after(m, mover), status: () => T.status(), teaching: () => T.phase === 'teach', hint: () => T.hint(),
    };
    this.syncButtons(); // the menu was drawn before this ran
    // ?puzzle=YYYY-MM-DD opens that day's puzzle straight away.
    const q = new URLSearchParams(location.search);
    if (q.get('puzzle')) setTimeout(() => this.L.Daily.open(q.get('puzzle')), 200);
    else if (!lsGet('chess-tut', 0) && !q.get('preview') && !q.get('vs') && q.get('intro') === null) setTimeout(() => { this.ui.hide('menu'); this.L.Tutorial.open(); }, 200);
  }

  private deps() {
    const g = this.g, i18n = this.i18n, prefs = this.prefs, ui = this.ui;
    const G = {
      get st() { return g.st(); }, set st(v) { g.st.set(v); },
      get moves() { return g.moves(); }, set moves(_v) { /* derived */ },
      get keys() { return g.keys(); }, set keys(v) { g.keys.set(v); },
      get last() { return g.last(); }, set last(v) { g.last.set(v); },
      get mode() { return g.mode(); }, set mode(v: Mode) { g.mode.set(v); },
      get tc() { return g.tc(); }, set tc(v) { g.tc.set(v); },
      get names() { return g.names(); }, set names(v) { g.names.set(v); },
      get over() { return g.over(); }, set over(v) { g.over.set(v); },
      get thinking() { return g.thinking(); }, set thinking(v) { g.thinking.set(v); },
      get selected() { return g.selected(); }, set selected(v) { g.selected.set(v); },
      get hint() { return g.hintMove(); }, set hint(v) { g.hintMove.set(v); },
      get stuck() { return g.stuck(); }, set stuck(v) { g.stuck.set(v); },
      get look() { return g.look(); }, set look(v) { g.look.set(v); },
      get arrows() { return g.arrows(); }, set arrows(v) { g.arrows.set(v); },
      get history() { return g.history(); }, get level() { return g.level(); },
    };
    const prefsProxy = new Proxy({}, {
      get: (_t, k: string) => (prefs.get() as any)[k],
      set: (_t, k: string, v) => { prefs.set(k as any, v); return true; },
    });
    const overlay = (id: string) => id as Overlay;
    return {
      G, prefs: prefsProxy, savePrefs: () => {}, tr: (s: string) => i18n.tr(s), trS: (s: string) => i18n.trS(s),
      T: (th: string, en: string) => i18n.t(th, en), LANG: i18n.lang(), myColor: () => g.myColor(), track,
      $: (id: string) => document.getElementById(id),
      show: (id: string) => { const el = document.getElementById(id); if (el) el.hidden = false; ui.show(overlay(id)); },
      hide: (id: string) => { const el = document.getElementById(id); if (el) el.hidden = true; ui.hide(overlay(id)); },
      closeAll: () => ui.closeAll(), openMenu: () => ui.show('menu'),
      newGame: () => g.newGame(), doMove: (m: any) => g.doMove(m), render: () => g.render(),
      lsGet, lsSet, esc: (t: string) => String(t).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';'), HOME_URL,
      GLYPH, NAME, VAL, sqName, opp, inCheck, legalMoves, applyMove, posKey, fromFEN, insufficient,
      bestMove, negamax, orderScore, evaluate, quiesce, pseudoMoves, kingSq,
      voice, stopVoice, hasVoice, startMusic, musicSting, splay, mv, al, sfx,
      Battle: () => (this.battle as any).legacy?.Battle, Intro: () => (this.battle as any).legacy?.Intro,
    };
  }

  openDaily() { this.L?.Daily.open(); }
  openTrain() { this.L?.Train.openList(); }
  openTutorial() { this.ui.hide('menu'); this.L?.Tutorial.open(); }
  syncButtons() { try { this.L?.Daily.syncButton(); this.L?.Story.syncButton(); } catch { /* not ready */ } }
}
