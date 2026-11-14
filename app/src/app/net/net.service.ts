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
import { RTDB_URL } from '../cloud/firebase-config';

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
  /** Round trip to the other device in ms, and whether it goes direct (p2p) or through the database. */
  readonly rtt = signal<{ ms: number; via: 'p2p' | 'db' } | null>(null);
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

  /**
   * The link, over Realtime Database (a socket kept open, so a move arrives in a fraction of a second):
   * rooms/{CODE}/host and /guest are the two players' ids, rooms/{CODE}/to_host and /to_join are each side's inbox.
   * Resolves like PeerJS did: host once the room exists, join once the guest seat is claimed.
   */
  private async open(role: 'host' | 'join', code: string, h: Handlers) {
    await this.cloud.start();
    const uid = this.cloud.uid; if (!uid) throw { type: 'network' };
    const D = await import('firebase/database');
    const db = D.getDatabase(this.cloud.app, RTDB_URL);
    if (location.hostname === 'localhost' && new URLSearchParams(location.search).has('emu')) try { D.connectDatabaseEmulator(db, '127.0.0.1', 9000); } catch { /* already */ }
    const room = D.ref(db, `rooms/${code}`), inbox = D.child(room, role === 'host' ? 'to_host' : 'to_join'), outbox = D.child(room, role === 'host' ? 'to_join' : 'to_host');
    const subs: (() => void)[] = [];
    let n = 0, closed = false;

    if (role === 'host') {
      try { await D.update(room, { host: uid, at: D.serverTimestamp() }); }
      catch { throw { type: 'unavailable-id' }; } // the code is taken: the rules refuse to overwrite a room
    } else {
      const [host, guest] = await Promise.all([D.get(D.child(room, 'host')), D.get(D.child(room, 'guest'))]).catch(() => [null, null]);
      if (!host?.exists()) throw { type: 'peer-unavailable' };
      if (host.val() === uid) throw { type: 'own-room' };
      if (guest?.exists() && guest.val() !== uid) throw { type: 'room-full' };
      // Claim the guest seat first: only the two players may read the inboxes.
      if (!guest?.exists()) { try { await D.set(D.child(room, 'guest'), uid); } catch { throw { type: 'room-full' }; } }
    }

    // Only messages newer than what is already in the inbox (older ones are from an earlier visit).
    const lastOld = await D.get(D.query(inbox, D.orderByKey(), D.limitToLast(1))).catch(() => null);
    let after = '';
    lastOld?.forEach(c => { after = c.key || ''; });
    const q = after ? D.query(inbox, D.orderByKey(), D.startAfter(after)) : D.query(inbox, D.orderByKey());

    /* Messages come in two ways: the database inbox, and (once it opens) a direct WebRTC channel between the
       two devices. Every message carries this link's session id (s) and a sequence number (n), so they are
       handled once each and in order whichever way they came. */
    const sid = Math.random().toString(36).slice(2, 10);
    let peerSid = '', next = 0;
    const held = new Map<number, any>();
    const debug = !!(window as any).__net;
    const receive = (m: any, via: string) => {
      if (closed || !m || typeof m.n !== 'number') return;
      if (m.s !== peerSid) { peerSid = m.s; next = m.n; held.clear(); if (role === 'host' && m.d?.t !== 'sig') void offer(); }
      if (m.n < next || held.has(m.n)) return;
      held.set(m.n, m);
      while (held.has(next)) {
        const x = held.get(next); held.delete(next); next++;
        if (debug) console.warn('net recv', role, via, JSON.stringify(x.d));
        if (x.d?.t === 'sig') { void signal(x.d); continue; }
        if (x.d?.t === 'rtt') { send({ t: 'rtt2', at: x.d.at }); continue; }
        if (x.d?.t === 'rtt2') { this.rtt.set({ ms: Math.max(1, Math.round(performance.now() - x.d.at)), via: dc?.readyState === 'open' ? 'p2p' : 'db' }); continue; }
        try { h.data(x.d); } catch (e) { console.warn('net handler', e); }
      }
    };
    subs.push(D.onChildAdded(q, snap => receive(snap.val(), 'db'), e => h.error({ type: (e as any)?.code || 'network' })));

    const viaDb = (env: any) => D.push(outbox, { ...env, at: D.serverTimestamp() }).catch(e => console.warn('net send', e));
    const send = (d: any) => {
      if (closed) return;
      const env = { s: sid, n: n++, d: JSON.parse(JSON.stringify(d)) };
      if (dc?.readyState === 'open' && d?.t !== 'sig') { try { dc.send(JSON.stringify(env)); return; } catch { /* fall back */ } }
      void viaDb(env);
    };

    // Direct link. The host offers; the guest answers. If it never connects, the database keeps carrying everything.
    let pc: RTCPeerConnection | null = null, dc: RTCDataChannel | null = null;
    const wire = (ch: RTCDataChannel) => {
      ch.onopen = () => { dc = ch; if (debug) console.warn('net p2p open', role); };
      ch.onclose = () => { if (dc === ch) dc = null; };
      ch.onmessage = e => { try { receive(JSON.parse(e.data), 'p2p'); } catch { /* bad frame */ } };
    };
    const fresh = () => {
      try { pc?.close(); } catch { /* closed */ }
      dc = null;
      if (typeof RTCPeerConnection !== 'function') return null;
      pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] });
      pc.onicecandidate = e => { if (e.candidate) send({ t: 'sig', ice: e.candidate.toJSON() }); };
      pc.onconnectionstatechange = () => { if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) dc = null; };
      pc.ondatachannel = e => wire(e.channel);
      return pc;
    };
    const offer = async () => {
      const p = fresh(); if (!p) return;
      wire(p.createDataChannel('chess', { ordered: true }));
      try { await p.setLocalDescription(await p.createOffer()); send({ t: 'sig', sdp: p.localDescription!.toJSON() }); } catch (e) { console.warn('p2p offer', e); }
    };
    const signal = async (d: any) => {
      try {
        if (d.sdp?.type === 'offer') {
          const p = fresh(); if (!p) return;
          await p.setRemoteDescription(d.sdp);
          await p.setLocalDescription(await p.createAnswer());
          send({ t: 'sig', sdp: p.localDescription!.toJSON() });
        } else if (d.sdp?.type === 'answer') await pc?.setRemoteDescription(d.sdp);
        else if (d.ice && pc) await pc.addIceCandidate(d.ice).catch(() => { /* late candidate */ });
      } catch (e) { console.warn('p2p signal', e); }
    };

    // Measure the round trip every 3 s for the ping chip.
    this.rtt.set(null);
    const timer = setInterval(() => { if (!document.hidden) send({ t: 'rtt', at: performance.now() }); }, 3000);
    subs.push(() => { clearInterval(timer); this.rtt.set(null); });

    if (role === 'host') {
      let opened = false;
      subs.push(D.onValue(D.child(room, 'guest'), s => { if (!opened && s.exists()) { opened = true; h.open(); } }));
    } else setTimeout(() => h.open(), 0);

    return {
      send,
      close: () => { closed = true; subs.forEach(u => u()); try { pc?.close(); } catch { /* closed */ } },
    };
  }
}
