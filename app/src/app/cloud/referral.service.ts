import { effect, inject, Injectable, signal } from '@angular/core';
import { track } from '../core/analytics';
import { PrefsService } from '../core/prefs.service';
import { CloudService } from './cloud.service';
import { FIREBASE_CONFIG } from './firebase-config';
import { codeOf, inviteRecorded, inviteToRecord, setMyRef } from './ref';

export type Mood = 'tense' | 'lost' | 'won' | 'learn';
export const MOODS: Mood[] = ['lost', 'won', 'tense', 'learn'];
export type PickStatus = 'pending' | 'ok' | 'no';
/** A product a player recommends to the friends they invite (picks/{id}). The link is the player's own Shopee affiliate link. */
export interface Pick { id?: string; owner: string; ref: string; name: string; title: string; note: string; url: string; img: string; moods: Mood[]; status: PickStatus; }

/** Same checks as firestore.rules, so the form can say what is wrong before saving. */
export const SHOPEE_RE = /^https:\/\/(s\.shopee\.co\.th|shope\.ee|shopee\.co\.th)\/\S*$/;
export const IMG_RE = /^https:\/\/[a-z0-9.-]+\.susercontent\.com\/\S*$/;
export const MAX_PICKS = 6;

/** Invites (who brought whom) and the products each inviter recommends. */
@Injectable({ providedIn: 'root' })
export class ReferralService {
  private cloud = inject(CloudService);
  private prefs = inject(PrefsService);
  readonly friends = signal<number | null>(null);
  readonly mine = signal<Pick[] | null>(null);

  constructor() {
    // Keep this player's code up to date (it changes when they switch to another Google account).
    effect(() => { const u = this.cloud.user(); if (u) { setMyRef(u.uid); void this.recordInvite(); } });
  }

  get google() { const u = this.cloud.user(); return !!u && !u.isAnonymous; }
  get code() { const u = this.cloud.user(); return u ? codeOf(u.uid) : ''; }
  private async F() { await this.cloud.start(); return import('firebase/firestore'); }

  /** A new player who came through a friend's link: save who invited them (once; the rules refuse players who already have scores). */
  private recording = false;
  private async recordInvite() {
    const ref = inviteToRecord(), u = this.cloud.user();
    if (!ref || !u || this.recording) return;
    this.recording = true;
    try {
      if (ref === codeOf(u.uid)) { inviteRecorded(); return; }
      const F = await this.F();
      await F.setDoc(F.doc(this.cloud.firestore, 'invites', u.uid), { ref, at: F.serverTimestamp() });
      track('invite_joined', { ref });
    } catch (e) { console.warn('invite', e); }
    finally { inviteRecorded(); this.recording = false; }
  }

  /** How many new players came through this player's link. */
  async loadFriends() {
    try {
      const F = await this.F(); const c = this.code; if (!c) return;
      const s = await F.getCountFromServer(F.query(F.collection(this.cloud.firestore, 'invites'), F.where('ref', '==', c)));
      this.friends.set(s.data().count);
    } catch (e) { console.warn('friends', e); }
  }

  /** The products this player recommends, with whether each is approved yet. */
  async loadMine() {
    const F = await this.F(), u = this.cloud.user(); if (!u) return;
    const s = await F.getDocs(F.query(F.collection(this.cloud.firestore, 'picks'), F.where('owner', '==', u.uid)));
    this.mine.set(s.docs.map(d => ({ ...(d.data() as Pick), id: d.id })).sort((a, b) => a.title.localeCompare(b.title)));
    if (!s.empty) void this.saveOwner();
  }

  private name() { return String(this.prefs.get().nameW || '').trim().slice(0, 30) || 'Player'; }

  /** Add or change a product. Every change goes back to "waiting for approval". */
  async savePick(p: Pick) {
    const F = await this.F(), u = this.cloud.user(); if (!u) throw new Error('no user');
    const data = {
      owner: u.uid, ref: codeOf(u.uid), name: this.name(), title: p.title.trim(), note: p.note.trim(), url: p.url.trim(), img: p.img.trim(),
      moods: p.moods, status: 'pending', at: F.serverTimestamp(),
    };
    const col = F.collection(this.cloud.firestore, 'picks');
    await F.setDoc(p.id ? F.doc(col, p.id) : F.doc(col), data);
    await this.saveOwner();
    track('pick_saved', {});
    await this.loadMine();
  }

  /** The owner sees who is behind the products (Google name and email); nobody else can read this. */
  private async saveOwner() {
    const F = await this.F(), u = this.cloud.user(); if (!u || u.isAnonymous) return;
    // A guest account turned into a Google one keeps an empty name on the account itself; the Google profile has it.
    const g = u.providerData.find(p => p.providerId === 'google.com');
    await F.setDoc(F.doc(this.cloud.firestore, 'pickOwners', u.uid), { name: (u.displayName || g?.displayName || '').slice(0, 100), email: u.email || g?.email || '', at: F.serverTimestamp() })
      .catch(e => console.warn('pick owner', e));
  }

  async deletePick(id: string) {
    const F = await this.F();
    await F.deleteDoc(F.doc(this.cloud.firestore, 'picks', id));
    await this.loadMine();
  }

  /**
   * Approved products of one inviter, for the result screen of the friends they brought. Plain REST query
   * (approved picks are public), so the game never waits for the SDK or a sign-in.
   */
  async approvedFor(ref: string): Promise<Pick[]> {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents:runQuery?key=${FIREBASE_CONFIG.apiKey}`;
    const eq = (f: string, v: string) => ({ fieldFilter: { field: { fieldPath: f }, op: 'EQUAL', value: { stringValue: v } } });
    const body = { structuredQuery: { from: [{ collectionId: 'picks' }], where: { compositeFilter: { op: 'AND', filters: [eq('status', 'ok'), eq('ref', ref)] } }, limit: 20 } };
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 5000);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      if (!r.ok) return [];
      const rows: { document?: { name: string; fields: Record<string, any> } }[] = await r.json();
      return rows.filter(x => x.document).map(({ document: d }) => {
        const f = d!.fields, s = (k: string) => String(f[k]?.stringValue ?? '');
        return {
          id: d!.name.split('/').pop(), owner: s('owner'), ref: s('ref'), name: s('name'), title: s('title'), note: s('note'), url: s('url'), img: s('img'),
          moods: (f['moods']?.arrayValue?.values || []).map((v: any) => v.stringValue), status: 'ok' as PickStatus,
        };
      }).filter(p => SHOPEE_RE.test(p.url));
    } catch { return []; } finally { clearTimeout(timer); }
  }

  /* ---------- Owner's page (?admin): approve products. Only accounts listed in admins/ can use it. ---------- */

  async isAdmin() {
    const F = await this.F(), u = this.cloud.user(); if (!u || u.isAnonymous) return false;
    try { return (await F.getDoc(F.doc(this.cloud.firestore, 'admins', u.uid))).exists(); } catch { return false; }
  }

  async allPicks(): Promise<(Pick & { at?: Date })[]> {
    const F = await this.F();
    const s = await F.getDocs(F.collection(this.cloud.firestore, 'picks'));
    return s.docs.map(d => { const x = d.data() as any; return { ...x, id: d.id, at: x.at?.toDate?.() }; });
  }

  async setStatus(id: string, status: PickStatus) {
    const F = await this.F();
    await F.updateDoc(F.doc(this.cloud.firestore, 'picks', id), { status });
  }

  /** Google name and email of everyone who has added products, by account id. */
  async owners(): Promise<Map<string, { name: string; email: string }>> {
    const F = await this.F();
    const s = await F.getDocs(F.collection(this.cloud.firestore, 'pickOwners'));
    return new Map(s.docs.map(d => [d.id, { name: String(d.data()['name'] || ''), email: String(d.data()['email'] || '') }]));
  }

  /** Friends brought in per inviter code. */
  async inviteCounts(): Promise<Map<string, number>> {
    const F = await this.F();
    const s = await F.getDocs(F.collection(this.cloud.firestore, 'invites'));
    const m = new Map<string, number>();
    s.docs.forEach(d => { const r = String(d.data()['ref']); m.set(r, (m.get(r) || 0) + 1); });
    return m;
  }
}
