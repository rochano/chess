import { effect, inject, Injectable, signal } from '@angular/core';
import qrcode from 'qrcode-generator';
import { sfx, startMusic } from '../audio/engine';
import { CloudService } from '../cloud/cloud.service';
import { track } from '../core/analytics';
import { Color } from '../core/engine';
import { GameService, Mode } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { PrefsService } from '../core/prefs.service';
import { UiService } from '../core/ui.service';
import { create } from './legacy-net';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Handlers { open(): void; data(d: any): void; close(): void; error(e: any): void; }

/**
 * Online play through a Firestore room instead of PeerJS:
 * rooms/{CODE} holds the host and guest ids, rooms/{CODE}/msgs carries the same messages the PeerJS link did
 * (hello, start, move, resign, flag, again, claim, away, ping, bye), each addressed to "host" or "join".
 */
@Injectable({ providedIn: 'root' })
export class NetService {
  private g = inject(GameService);
  private ui = inject(UiService);
  private cloud = inject(CloudService);
  private prefs = inject(PrefsService);
  private i18n = inject(I18nService);
  readonly msg = signal<{ html: string; bad: boolean } | null>(null);
  N: any;

  constructor() {
    // Starting a lesson, a puzzle or an offline game leaves the room.
    effect(() => { const m = this.g.mode(); if (m !== 'online' && this.N?.Net.link) this.N.Net.leave(); });
  }

  init() {
    this.N = create(this.deps());
    if (new URLSearchParams(location.search).has('debug')) (window as any).__net = this.N;
    const Net = this.N.Net;
    this.g.net = {
      color: () => Net.color, connected: () => !!Net.connected,
      sent: (m, clock) => Net.send({ t: 'move', from: m.from, to: m.to, promo: m.promo || '', n: this.g.history().length - 1, clock }),
      resign: () => Net.send({ t: 'resign' }), flag: () => Net.send({ t: 'flag' }),
    };
    // Keep-alive, away and bye messages run inside the ported code (pings are throttled in send()).
    // ?room=CODE (the QR code) joins on load.
    const room = new URLSearchParams(location.search).get('room');
    if (room) { this.prefs.set('mode', 'online'); this.ui.closeAll(); this.ui.show('menu'); setTimeout(() => this.join(room), 100); }
  }

  host() { void this.N?.Net.host(); }
  join(code: string) { void this.N?.Net.join(code); }
  again() { this.N?.Net.again(); }
  leave() { this.N?.Net.leave(); }
  get live() { return !!this.N?.Net.live; }
  get role() { return this.N?.Net.role as 'host' | 'join' | null; }

  private deps() {
    const g = this.g, i18n = this.i18n, prefs = this.prefs;
    const G = {
      get mode() { return g.mode(); }, set mode(v: Mode) { g.mode.set(v); },
      get over() { return g.over(); }, set over(v) { g.over.set(v); },
      get st() { return g.st(); }, get history() { return g.history(); }, get names() { return g.names(); },
      get clocks() { return g.clocks(); }, get tc() { return g.tc(); }, get moves() { return g.moves(); },
    };
    const prefsProxy = new Proxy({}, { get: (_t, k: string) => (prefs.get() as any)[k], set: (_t, k: string, v) => { prefs.set(k as any, v); return true; } });
    return {
      G, prefs: prefsProxy, T: (th: string, en: string) => i18n.t(th, en), tr: (s: string) => i18n.tr(s),
      esc: (t: string) => String(t).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';'), track, sfx, startMusic,
      render: () => g.render(), finish: (o: any) => g.finish(o),
      setClock: (c: Color, v: number) => g.clocks.update(x => ({ ...x, [c]: v })),
      closePromo: () => g.pendingPromo.set(null), doMove: (m: any) => g.doMove(m),
      newGame: () => g.newGame(), openMenu: () => this.ui.show('menu'),
      startGame: (color: Color, names: Record<Color, string>, clock: string) => {
        const keep = prefs.get().clock;
        prefs.set('clock', clock as any);
        g.newGame(true);
        prefs.set('clock', keep);
        g.names.set(names);
        this.ui.closeAll();
        void color;
      },
      netMsg: (html: string, bad?: boolean) => this.msg.set(html ? { html, bad: !!bad } : null),
      netOpen: (role: 'host' | 'join', code: string, h: Handlers) => this.open(role, code, h),
      qrcode,
    };
  }

  /** The Firestore link. Resolves like PeerJS did: host once the room exists, join once it is claimed. */
  private async open(role: 'host' | 'join', code: string, h: Handlers) {
    await this.cloud.start();
    const uid = this.cloud.uid; if (!uid) throw { type: 'network' };
    const F = await import('firebase/firestore');
    const db = this.cloud.firestore, room = F.doc(db, 'rooms', code), msgs = F.collection(room, 'msgs');
    const me = role, them = role === 'host' ? 'join' : 'host';
    const subs: (() => void)[] = [];
    let n = 0, lastSent = 0, closed = false;

    if (role === 'host') {
      try { await F.setDoc(room, { host: uid, guest: null, at: F.serverTimestamp() }); }
      catch { throw { type: 'unavailable-id' }; } // the code is taken (the rules refuse to overwrite a room)
    } else {
      const s = await F.getDoc(room).catch(() => null);
      if (!s?.exists()) throw { type: 'peer-unavailable' };
      const r = s.data();
      if (r['host'] === uid) throw { type: 'own-room' };
      if (r['guest'] && r['guest'] !== uid) throw { type: 'room-full' };
      // Claim the guest seat first: only the two players may read the room's messages.
      if (r['guest'] !== uid) { try { await F.updateDoc(room, { guest: uid }); } catch { throw { type: 'room-full' }; } }
    }

    // Messages addressed to this side. The first snapshot is history from an earlier visit: skip it.
    await new Promise<void>((res, rej) => {
      let first = true;
      subs.push(F.onSnapshot(F.query(msgs, F.where('to', '==', me)), snap => {
        if (first) { first = false; res(); return; }
        const added = snap.docChanges().filter(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites).map(c => c.doc.data());
        if ((window as any).__net) console.warn('net recv', me, JSON.stringify(added.map(m => m['d'])));
        added.sort((a, b) => a['n'] - b['n']).forEach(m => { if (!closed) try { h.data(m['d']); } catch (e) { console.warn('net handler', e); } });
      }, e => { console.warn('net listen', e.code, e.message); if (first) rej({ type: e.code || 'network' }); else h.error({ type: e.code }); }));
    });

    if (role === 'host') {
      let opened = false;
      subs.push(F.onSnapshot(room, s => { if (!opened && s.data()?.['guest']) { opened = true; h.open(); } }));
    } else {
      setTimeout(() => h.open(), 0);
    }

    return {
      send: (d: any) => {
        if (closed) return;
        // A ping only matters when nothing else was sent lately.
        if (d?.t === 'ping' && Date.now() - lastSent < 12000) return;
        lastSent = Date.now();
        F.addDoc(msgs, { to: them, n: n++, d, from: uid, at: F.serverTimestamp() }).catch(e => console.warn('net send', e));
      },
      close: () => { closed = true; subs.forEach(u => u()); },
    };
  }
}
