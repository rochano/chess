import { inject, Injectable, signal } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { track } from '../core/analytics';
import { GameOver, GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { PrefsService } from '../core/prefs.service';
import { CPU_ELO, eloAfter, pointsFor, START_ELO } from './elo';
import { FIREBASE_CONFIG } from './firebase-config';

export interface Player { name: string; p: number; w: number; d: number; l: number; pts: number; elo: number; google?: boolean; }
export type SaveState = '' | 'saving' | 'saved' | 'failed';

/**
 * Firebase: everyone gets an anonymous account on first visit, so scores save without a login.
 * "Sign in with Google" links that account, which keeps the scores and lets them follow the player to other devices.
 */
@Injectable({ providedIn: 'root' })
export class CloudService {
  private g = inject(GameService);
  private prefs = inject(PrefsService);
  private i18n = inject(I18nService);
  readonly user = signal<User | null>(null);
  readonly me = signal<Player | null>(null);
  readonly save = signal<SaveState>('');
  readonly lastDelta = signal<{ elo: number; pts: number } | null>(null);
  readonly error = signal('');
  private app?: FirebaseApp; private auth?: Auth; private db?: Firestore;
  private ready?: Promise<void>;

  init() {
    this.g.events.subscribe(e => { if (e.kind === 'end') void this.report(e.over); });
    // Load the SDK once the game is on screen; nothing waits for it.
    setTimeout(() => void this.start(), 300);
  }

  start() {
    return this.ready ??= (async () => {
      const [{ initializeApp }, A, { getFirestore }] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
      this.app = initializeApp(FIREBASE_CONFIG);
      this.auth = A.getAuth(this.app);
      this.db = getFirestore(this.app);
      await new Promise<void>(res => A.onAuthStateChanged(this.auth!, u => { this.user.set(u); if (u) void this.loadMe(); res(); }));
      if (!this.auth.currentUser) await A.signInAnonymously(this.auth);
    })().catch(err => { console.warn('firebase', err); this.error.set(String(err?.code || err)); this.ready = undefined; });
  }

  private async loadMe() {
    const { doc, getDoc } = await import('firebase/firestore');
    const u = this.user(); if (!u) return;
    const s = await getDoc(doc(this.db!, 'players', u.uid)).catch(() => null);
    this.me.set(s?.exists() ? (s.data() as Player) : null);
  }

  /** The name shown on the leaderboard: the name typed in the menu (or the auto animal name). */
  private myName() { return String(this.prefs.get().nameW || this.g.names().w || 'Player').trim().slice(0, 30); }

  /** One finished game: a record in games/ and the player's totals, in one batch. Lessons and friend games on one device don't count. */
  private async report(over: GameOver) {
    const mode = this.g.mode();
    this.lastDelta.set(null);
    if (mode !== 'cpu') { this.save.set(''); return; }
    this.save.set('saving');
    try {
      await this.start();
      const u = this.user(); if (!u) throw new Error('no user');
      const F = await import('firebase/firestore');
      const level = this.g.level();
      const res: 'w' | 'd' | 'l' = over.type === 'draw' ? 'd' : over.winner === 'w' ? 'w' : 'l';
      const ref = F.doc(this.db!, 'players', u.uid);
      const old = (await F.getDoc(ref)).data() as Player | undefined;
      const base: Player = old ?? { name: this.myName(), p: 0, w: 0, d: 0, l: 0, pts: 0, elo: START_ELO };
      const elo = eloAfter(base.elo, CPU_ELO[level], res === 'w' ? 1 : res === 'd' ? 0.5 : 0);
      const pts = pointsFor(res, level);
      const next = {
        name: this.myName(), p: base.p + 1, w: base.w + (res === 'w' ? 1 : 0), d: base.d + (res === 'd' ? 1 : 0), l: base.l + (res === 'l' ? 1 : 0),
        pts: base.pts + pts, elo, google: !u.isAnonymous, updated: F.serverTimestamp(),
      };
      const batch = F.writeBatch(this.db!);
      batch.set(ref, next);
      batch.set(F.doc(F.collection(this.db!, 'games')), {
        uid: u.uid, name: next.name, opponent: 'cpu', level, result: res, reason: over.type,
        moves: Math.ceil(this.g.history().length / 2), minutes: this.g.elapsedMinutes, at: F.serverTimestamp(),
      });
      await batch.commit();
      this.me.set({ ...next } as Player);
      this.lastDelta.set({ elo: elo - base.elo, pts });
      this.save.set('saved');
    } catch (err) {
      console.warn('save score', err);
      this.save.set('failed');
    }
  }

  async signInGoogle() {
    await this.start();
    const A = await import('firebase/auth');
    const provider = new A.GoogleAuthProvider();
    const cur = this.auth!.currentUser;
    try {
      // Keep this device's scores: turn the anonymous account into a Google one.
      if (cur?.isAnonymous) await A.linkWithPopup(cur, provider);
      else await A.signInWithPopup(this.auth!, provider);
      track('login', { method: 'google' });
    } catch (e: any) {
      // That Google account already has scores from another device: switch to it.
      if (e?.code === 'auth/credential-already-in-use') {
        const cred = A.GoogleAuthProvider.credentialFromError(e);
        if (cred) await A.signInWithCredential(this.auth!, cred);
      } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') { this.error.set(e?.code || String(e)); throw e; }
    }
    this.user.set(this.auth!.currentUser);
    await this.loadMe();
  }

  async signOut() {
    await this.start();
    const A = await import('firebase/auth');
    await A.signOut(this.auth!);
    this.me.set(null);
    await A.signInAnonymously(this.auth!);
  }

  /** Rename on the board without playing a game. */
  async rename(name: string) {
    const u = this.user(); if (!u || !this.me()) return;
    const F = await import('firebase/firestore');
    await F.updateDoc(F.doc(this.db!, 'players', u.uid), { name: name.trim().slice(0, 30), updated: F.serverTimestamp() }).catch(() => {});
  }

  async top(n = 50): Promise<(Player & { id: string })[]> {
    await this.start();
    const F = await import('firebase/firestore');
    const q = F.query(F.collection(this.db!, 'players'), F.orderBy('pts', 'desc'), F.limit(n));
    const s = await F.getDocs(q);
    return s.docs.map(d => ({ id: d.id, ...(d.data() as Player) }));
  }

  get uid() { return this.user()?.uid ?? ''; }
  t(th: string, en: string) { return this.i18n.t(th, en); }
}
