import { inject, Injectable, signal } from '@angular/core';
import { track } from '../core/analytics';
import { Color, initialState } from '../core/engine';
import { GameService } from '../core/game.service';
import {
  addBook, addStyle, decodeBook, EMPTY_STYLE, encodeBook, favouriteFirst, Ghost, GHOST_MIN_GAMES, ghostLevel, ghostSide, learnGame,
  STYLE_KEYS, traits,
} from '../core/ghost';
import { I18nService } from '../core/i18n.service';
import { UiService } from '../core/ui.service';
import { HOME_URL } from '../share/share.service';
import { CloudService } from './cloud.service';
import { FIREBASE_CONFIG } from './firebase-config';

/** One bot as the challenge card shows it. */
export interface GhostCard {
  uid: string; ghost: Ghost | null; mine: boolean;
  traits: { th: string; en: string }[]; first: string; side: Color; level: 1 | 2 | 3; ready: boolean;
}

/**
 * "Bot that plays like you". After each game a player finishes against the computer or online, their moves teach
 * their bot (ghosts/{uid}: one read and one write per game). Other players can then play that bot,
 * from the leaderboard or from a link (?vs=UID). Wins of the bot turn into points for its owner.
 */
@Injectable({ providedIn: 'root' })
export class GhostService {
  private g = inject(GameService);
  private cloud = inject(CloudService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  /** The bot on the challenge card (null while loading or closed). */
  readonly card = signal<GhostCard | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  /** This player's own bot, for the leaderboard's "Mine" tab. */
  readonly mine = signal<Ghost | null>(GhostService.cached());
  /** Points just added from the bot's wins, shown once. */
  readonly botPoints = signal(0);

  private static cached(): Ghost | null { try { return JSON.parse(localStorage.getItem('chess-ghost') || 'null'); } catch { return null; } }

  init() {
    this.g.events.subscribe(e => {
      if (e.kind !== 'end') return;
      // Let the result card appear first; learning runs a short capture search on every move.
      setTimeout(() => { void this.learn(); void this.scoreChallenge(); }, 1500);
    });
    const vs = new URLSearchParams(location.search).get('vs');
    if (vs && /^[A-Za-z0-9]{10,40}$/.test(vs)) setTimeout(() => this.open(vs), 600);
    setTimeout(() => void this.claim(), 4000);
  }

  /** Teach this player's bot from the game that just ended (their side only). */
  private async learn() {
    const mode = this.g.mode(), me = this.g.myColor();
    if ((mode !== 'cpu' && mode !== 'online') || !me) return;
    const h = this.g.history();
    const positions = h.map(x => x.st), moves = [...h.slice(1).map(x => x.last!), this.g.last()!].filter(Boolean);
    const got = learnGame(positions, moves, me);
    if (!got) return;
    try {
      await this.cloud.start();
      const uid = this.cloud.uid; if (!uid) return;
      const F = await import('firebase/firestore');
      const ref = F.doc(this.cloud.firestore, 'ghosts', uid);
      const old = (await F.getDoc(ref)).data() as Ghost | undefined;
      const style = addStyle(old ?? EMPTY_STYLE, got.style);
      // Merge, so the challengers' counters (gw, gd, gl) are never touched by the owner's write.
      const next: Record<string, unknown> = { name: this.cloud.myName(), book: encodeBook(addBook(decodeBook(old?.book ?? ''), got.book)), updated: F.serverTimestamp() };
      for (const k of STYLE_KEYS) next[k] = style[k];
      if (old) await F.setDoc(ref, next, { merge: true });
      else await F.setDoc(ref, { ...next, gw: 0, gd: 0, gl: 0 });
      const saved = { gw: old?.gw ?? 0, gd: old?.gd ?? 0, gl: old?.gl ?? 0, ...next, updated: undefined } as unknown as Ghost;
      this.mine.set(saved);
      try { localStorage.setItem('chess-ghost', JSON.stringify(saved)); } catch { /* private mode */ }
      if (style.n === GHOST_MIN_GAMES) track('ghost_ready');
    } catch (err) { console.warn('ghost learn', err); }
  }

  /** After a game against someone's bot, add the result to that bot's record (from the bot's side). */
  private async scoreChallenge() {
    const gh = this.g.ghost(), o = this.g.over();
    if (!gh || !o || this.g.mode() !== 'cpu') return;
    const k = o.type === 'draw' ? 'gd' : o.winner === gh.side ? 'gw' : 'gl';
    track('ghost_end', { result: k });
    try {
      await this.cloud.start();
      if (!this.cloud.uid || this.cloud.uid === gh.uid) return;
      const F = await import('firebase/firestore');
      await F.updateDoc(F.doc(this.cloud.firestore, 'ghosts', gh.uid), { [k]: F.increment(1), hit: F.serverTimestamp() });
    } catch (err) { console.warn('ghost result', err); }
  }

  /** Turn the bot's new wins into points: 1 each, at most 5 a day (the rules check the same). */
  async claim() {
    try {
      await this.cloud.start();
      const uid = this.cloud.uid; if (!uid) return;
      const F = await import('firebase/firestore');
      const [gs, ps] = await Promise.all([F.getDoc(F.doc(this.cloud.firestore, 'ghosts', uid)), F.getDoc(F.doc(this.cloud.firestore, 'players', uid))]);
      if (!gs.exists() || !ps.exists()) return;
      const gw = Number(gs.data()['gw'] || 0), p = ps.data();
      const had = Number(p['bot'] || 0), at = p['botAt']?.toMillis?.() ?? 0;
      const add = Math.min(5, gw - had);
      if (add < 1 || Date.now() - at < 20.1 * 3600e3) return;
      await F.updateDoc(ps.ref, { pts: Number(p['pts']) + add, bot: had + add, botAt: F.serverTimestamp(), updated: F.serverTimestamp() });
      this.botPoints.set(add);
      track('ghost_points', { points: add });
    } catch (err) { console.warn('ghost points', err); }
  }

  /** Someone's bot, read with a plain fetch (public, no sign-in wait; same reason as the leaderboard). */
  private async fetchGhost(uid: string): Promise<Ghost | null> {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/ghosts/${uid}?key=${FIREBASE_CONFIG.apiKey}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const f: Record<string, Record<string, unknown>> = (await r.json()).fields || {};
    const val = (k: string) => { const x = f[k]; return x ? (x['integerValue'] ?? x['doubleValue'] ?? x['stringValue']) : undefined; };
    const out: any = { name: String(val('name') ?? ''), book: String(val('book') ?? '') };
    for (const k of [...STYLE_KEYS, 'gw', 'gd', 'gl']) out[k] = Number(val(k) ?? 0);
    return out as Ghost;
  }

  /** Open the challenge card for a player's bot. */
  async open(uid: string, from: 'menu' | 'leader' = 'menu') {
    this.card.set(null); this.failed.set(false); this.loading.set(true);
    this.ui.closeAll(); this.ui.ghostFrom = from; this.ui.show('ghost');
    track('ghost_open');
    try {
      const ghost = await this.fetchGhost(uid);
      this.card.set(this.describe(uid, ghost));
      if (ghost && uid === this.cloud.uid) { this.mine.set(ghost); try { localStorage.setItem('chess-ghost', JSON.stringify(ghost)); } catch { /* private mode */ } }
    } catch (err) { console.warn('ghost open', err); this.failed.set(true); }
    this.loading.set(false);
  }

  describe(uid: string, ghost: Ghost | null): GhostCard {
    const s = ghost ?? { ...EMPTY_STYLE };
    const side = ghostSide(s);
    return {
      uid, ghost, mine: !!uid && uid === this.cloud.uid, traits: ghost ? traits(s) : [],
      first: ghost ? favouriteFirst(decodeBook(ghost.book), initialState(), side) : '',
      side, level: ghostLevel(s), ready: s.n >= GHOST_MIN_GAMES,
    };
  }

  play() {
    const c = this.card(); if (!c?.ghost || !c.ready) return;
    this.ui.closeAll();
    this.g.newGhostGame({ uid: c.uid, name: c.ghost.name, side: c.side, level: c.level, play: { style: c.ghost, book: decodeBook(c.ghost.book) } });
    track('ghost_start', { level: c.level });
  }

  /** Play the same bot again (the result card's "Play again"). */
  rematch() {
    const gh = this.g.ghost(); if (!gh) return false;
    this.g.newGhostGame(gh);
    track('ghost_start', { level: gh.level, again: 1 });
    return true;
  }

  /** Link that opens this player's bot for whoever taps it. */
  link(method: string) { return `${HOME_URL}?vs=${this.cloud.uid}&utm_source=${method}&utm_medium=share&utm_campaign=bot`; }

  async shareMine() {
    if (!this.cloud.uid) await this.cloud.start();
    const text = this.i18n.t('ลองแข่งกับบอทที่เล่นเหมือนฉันดูสิ ชนะได้ไหม?', 'Can you beat a bot that plays just like me?');
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    track('share', { method: 'bot' });
    if (nav.share) { try { await nav.share({ text, url: this.link('bot') }); return 'shared'; } catch { return ''; } }
    try { await navigator.clipboard.writeText(text + ' ' + this.link('copy')); return 'copied'; } catch { return ''; }
  }
}
