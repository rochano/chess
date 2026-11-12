import { Injectable, signal } from '@angular/core';

/** Player settings. Same fields and storage key ("chess-prefs") as the original game, so settings carry over. */
export interface Prefs {
  mode: 'friend' | 'cpu' | 'online';
  level: 1 | 2 | 3;
  clock: string;
  volMove: number; volAlert: number; volMusic: number; music: boolean;
  view: '2d' | '3d'; follow: boolean;
  taunts: 'on' | 'off'; voice: 'speech' | 'mumble'; voiceRate: string;
  theme: 'walnut' | 'sand' | 'slate';
  nameW: string; nameB: string;
  streamer: 'on' | 'off'; shop: 'on' | 'off'; shopReset?: number; track: string;
  intro?: 'on' | 'off'; lang?: 'th' | 'en' | 'auto';
}

const DEFAULTS: Prefs = {
  mode: 'friend', level: 2, clock: '5+0', volMove: 60, volAlert: 60, volMusic: 40, music: true, view: '3d', follow: true,
  taunts: 'on', voice: 'speech', voiceRate: '0.8', theme: 'walnut', nameW: '', nameB: '', streamer: 'off', shop: 'on', track: 'auto',
};

@Injectable({ providedIn: 'root' })
export class PrefsService {
  private readonly state = signal<Prefs>(PrefsService.load());
  readonly value = this.state.asReadonly();

  private static load(): Prefs {
    const p = { ...DEFAULTS };
    try { Object.assign(p, JSON.parse(localStorage.getItem('chess-prefs') || '{}')); } catch { /* private mode */ }
    // The "don't suggest again" link under the product card is gone: turn tips back on once for anyone who tapped it.
    if (p.shop === 'off' && !p.shopReset) { p.shop = 'on'; p.shopReset = 1; }
    if (p.level) p.level = +p.level as Prefs['level'];
    return p;
  }

  get(): Prefs { return this.state(); }

  set<K extends keyof Prefs>(key: K, v: Prefs[K]) {
    this.state.update(p => ({ ...p, [key]: v }));
    try { localStorage.setItem('chess-prefs', JSON.stringify(this.state())); } catch { /* private mode */ }
  }
}
