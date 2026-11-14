import { inject, Injectable } from '@angular/core';
import { musicDuck, musicSting, musicLevel, offlineRender, orchLoad, ctx, sfx, ORCH, INST, SFX_INST } from '../audio/engine';
import { track } from '../core/analytics';
import { applyMove, GLYPH, inCheck, initialState, kingSq, legalMoves, NAME, opp, sqName, VAL } from '../core/engine';
import { fmtClock } from '../core/format';
import { GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { AVATAR, ICON, THEMES } from '../core/icons';
import { PrefsService } from '../core/prefs.service';
import { Overlay, UiService } from '../core/ui.service';
import { SergeantService } from '../sergeant/sergeant.service';
import { create } from './legacy-share';
import { ReferralService } from '../cloud/referral.service';
import { invitedBy } from '../cloud/ref';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const HOME_URL = 'https://rochano.github.io/chess/';
/** Apps Script web app (scores and weekly products). Moves to Firestore in phase 2. */
export const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzR5Edv4-nxiu8JTiFFI6XN2dKPWkdO5pv2VUbx501zWHC3-KgDLwC8R9IN8wdZ8YkfwA/exec';

function lsGet<T>(k: string, d: T): T { try { const v = JSON.parse(localStorage.getItem(k)!); return v == null ? d : v; } catch { return d; } }
function lsSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }

/** After a game: result card entrance, product tip, the recap video and sharing (showResult in the original). */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private g = inject(GameService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private prefs = inject(PrefsService);
  private sergeant = inject(SergeantService);
  private L: any;
  private referral = inject(ReferralService);
  private picks?: Promise<any[]>;
  /** Approved products of the friend who invited this player, in the shape of a shop item (none if nobody invited them). */
  private refPicks() {
    const ref = invitedBy();
    if (!ref) return Promise.resolve([]);
    return this.picks ??= this.referral.approvedFor(ref).then(ps => ps.map(p => ({
      id: 'pick-' + p.id, title: p.title, note: p.note, url: p.url, img: p.img, moods: p.moods, affiliate: true, by: p.name, ref: p.ref,
    }))).catch(() => { this.picks = undefined; return []; });
  }

  init() {
    this.L = create(this.deps());
    this.g.events.subscribe(ev => { if (ev.kind === 'end') this.showResult(); });
    // Fetch the product list early so the tip is ready when a game ends.
    if (this.i18n.lang() === 'th' && this.prefs.get().shop !== 'off') setTimeout(() => this.L.Shop.load(), 3000);
    const id = new URLSearchParams(location.search).get('preview');
    if (id) setTimeout(() => this.L.Shop.preview(id), 300);
  }

  private deps() {
    const g = this.g, i18n = this.i18n, prefs = this.prefs, ui = this.ui, sergeant = this.sergeant;
    const G = {
      get st() { return g.st(); }, get last() { return g.last(); }, get over() { return g.over(); },
      set over(v) { g.over.set(v); },
      get mode() { return g.mode(); }, get cpuColor() { return g.cpuColor(); }, get ghost() { return g.ghost()?.name; }, get level() { return g.level(); }, get names() { return g.names(); },
      get history() { return g.history(); }, get captured() { return g.captured(); }, get clocks() { return g.clocks(); },
      get tc() { return g.tc(); }, get stress() { return sergeant.stress; }, get keys() { return g.keys(); },
      reported: false,
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
      // The original code reads .hidden right after show/hide, so update the element now, not on the next render.
      show: (id: string) => { const el = document.getElementById(id); if (el) el.hidden = false; ui.show(overlay(id)); },
      hide: (id: string) => { const el = document.getElementById(id); if (el) el.hidden = true; ui.hide(overlay(id)); },
      newGame: () => g.newGame(), showResult: () => this.showResult(), lsGet, lsSet, HOME_URL, SHEET_URL, refPicks: () => this.refPicks(),
      GLYPH, NAME, VAL, sqName, opp, inCheck, legalMoves, applyMove, initialState, kingSq, fmt: fmtClock,
      esc: (t: string) => String(t).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';'),
      ctx, sfx, musicSting, musicLevel, orchLoad, ORCH, INST, SFX_INST, offlineRender, musicDuck, AVATAR, ICON, THEMES,
    };
  }

  readonly recapTitle = () => this.i18n.t('ดูรีแคปเกมนี้', 'Watch the recap');
  readonly recapSub = () => this.i18n.t('วิดีโอ 4 ตาสุดท้าย แชร์ให้เพื่อนดูได้', 'The last 4 moves as a video to share');
  thumb: string | null = null;

  showResult() {
    const o = this.g.over(); if (!o) return;
    const L = this.L;
    const shopReady = L.Shop.after();
    L.Share.prepare();
    const th = document.getElementById('recapThumb') as HTMLImageElement | null;
    if (th) th.hidden = true;
    const job = L.Share.gifJob;
    if (job) job.then((b: Blob | null) => {
      const img = document.getElementById('recapThumb') as HTMLImageElement | null;
      if (b && L.Share.gifJob === job && img) { if (L.Recap.thumb) URL.revokeObjectURL(L.Recap.thumb); img.src = L.Recap.thumb = URL.createObjectURL(b); img.hidden = false; }
    });
    // Open once the suggested product (if any) is ready, so everything arrives in one smooth sequence;
    // a slow photo gets 1.8s, after that the product follows on its own.
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    Promise.all([wait(o.type === 'mate' ? 650 : 200), Promise.race([Promise.resolve(shopReady).catch(() => {}), wait(1800)])])
      .then(() => { if (this.g.over() !== o) return; this.ui.show('result'); requestAnimationFrame(() => L.ResultFx.card()); });
  }

  openRecap() { this.L.Recap.open(); }
  closeRecap() { this.L.Recap.close(); }
  shareGo() { try { (document.getElementById('recapVid') as HTMLVideoElement).pause(); } catch { /* none */ } this.L.Share.go(); }
  shareOpen(m: 'line' | 'facebook') { this.L.Share.open(m); }
  shareCopy() { this.L.Share.copy(); }
}
