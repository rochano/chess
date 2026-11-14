import { Component, inject, Injectable, signal } from '@angular/core';
import { GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { PrefsService } from '../core/prefs.service';
import { TrPipe } from '../core/tr.pipe';
import { UiService } from '../core/ui.service';
import { SHEET_URL } from '../share/share.service';
import { CloudService, Player } from '../cloud/cloud.service';

interface Row { finishedAt?: string; at?: string; white: string; black: string; opponent: string; winner: string; result: string; }
interface Entry { name: string; p: number; w: number; d: number; l: number; pts: number; elo?: number; me?: boolean; }

function lsGet<T>(k: string, d: T): T { try { const v = JSON.parse(localStorage.getItem(k)!); return v == null ? d : v; } catch { return d; } }
function lsSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }

const DEFAULT_NAMES = new Set(['', 'you', 'player', 'player 1', 'player 2', 'computer', 'white', 'black']);
/** Same scoring as the live game: win vs person 3, draw 1, win vs CPU Easy 1 / Normal 2 / Hard 3. */
export function tally(rows: Row[], local = false): Entry[] {
  const t = new Map<string, Entry>();
  const add = (name: string, res: 'w' | 'd' | 'l', pts: number) => {
    name = String(name || '').trim() || 'You';
    if (local ? /^computer$/i.test(name) : DEFAULT_NAMES.has(name.toLowerCase())) return;
    const k = name.toLowerCase();
    const e = t.get(k) || { name, p: 0, w: 0, d: 0, l: 0, pts: 0 };
    e.p++; e[res]++; e.pts += pts; t.set(k, e);
  };
  for (const r of rows) {
    let res = r.result === '1-0' ? 'w' : r.result === '0-1' ? 'b' : r.result === '1/2-1/2' ? 'd' : null;
    if (!res && r.winner) res = r.winner === 'Draw' ? 'd' : r.winner === r.white ? 'w' : r.winner === r.black ? 'b' : null;
    if (!res) continue;
    const cpu = /^computer/i.test(r.opponent || '');
    const lvl = /hard/i.test(r.opponent) ? 3 : /normal/i.test(r.opponent) ? 2 : 1;
    const score = (side: string): ['w' | 'd' | 'l', number] => res === 'd' ? ['d', 1] : res === side ? ['w', cpu ? lvl : 3] : ['l', 0];
    add(r.white, ...score('w'));
    if (!cpu) add(r.black, ...score('b'));
  }
  return [...t.values()].sort((a, b) => b.pts - a.pts || b.w - a.w || a.p - b.p || a.name.localeCompare(b.name));
}

/** One board: new scores plus the old version's totals, joined by name (the old board went by name too). */
export function merge(rows: (Player & { id: string })[], old: Entry[], uid: string): Entry[] {
  const t = new Map<string, Entry>();
  for (const r of rows) {
    const k = r.name.trim().toLowerCase(), e = t.get(k);
    const add: Entry = { name: r.name, p: r.p, w: r.w, d: r.d, l: r.l, pts: r.pts, elo: r.elo, me: r.id === uid };
    if (!e) t.set(k, add);
    else { e.p += add.p; e.w += add.w; e.d += add.d; e.l += add.l; e.pts += add.pts; e.elo = Math.max(e.elo || 0, add.elo || 0); e.me ||= add.me; }
  }
  for (const o of old) {
    const k = o.name.trim().toLowerCase(), e = t.get(k);
    if (!e) t.set(k, { ...o });
    else { e.p += o.p; e.w += o.w; e.d += o.d; e.l += o.l; e.pts += o.pts; }
  }
  return [...t.values()].sort((a, b) => b.pts - a.pts || b.w - a.w || a.p - b.p || a.name.localeCompare(b.name)).slice(0, 50);
}

@Injectable({ providedIn: 'root' })
export class LeaderService {
  private g = inject(GameService);
  private prefs = inject(PrefsService);
  readonly tab = signal<'all' | 'season1' | 'local'>('all');
  private cloud = inject(CloudService);
  readonly list = signal<Entry[] | null>(null);
  readonly error = signal(false);
  private pending: Promise<Row[]> | null = null;

  init() {
    // Every finished game (not lessons) goes into this device's history, like the live game.
    this.g.events.subscribe(e => {
      if (e.kind !== 'end' || this.g.mode() === 'train') return;
      const g = this.g, o = e.over, n = g.names(), lv = ['', 'Easy', 'Normal', 'Hard'][g.level()];
      const list = lsGet<Row[]>('chess-history', []);
      list.push({
        at: new Date().toISOString(), white: n.w, black: n.b,
        opponent: g.mode() === 'cpu' ? `Computer (${lv})` : g.mode() === 'online' ? 'Online' : 'Friend',
        winner: o.type === 'draw' ? 'Draw' : o.winner === 'w' ? n.w : n.b,
        result: o.type === 'draw' ? '1/2-1/2' : o.winner === 'w' ? '1-0' : '0-1',
      });
      lsSet('chess-history', list.slice(-500));
    });
    void this.prefs;
  }

  /** Scores from the old version (copied from its sheet when the site is built, see build-pages.sh). Missing file = none. */
  private oldScores(): Promise<Entry[]> {
    return this.old ??= fetch('season1.json').then(r => r.ok ? r.json() : { rows: [] }).then(d => tally(d.rows || [])).catch(() => { this.old = undefined; return []; });
  }
  private old?: Promise<Entry[]>;

  load() {
    this.error.set(false);
    if (this.tab() === 'local') { this.list.set(tally(lsGet<Row[]>('chess-history', []), true).slice(0, 50)); return; }
    if (this.tab() === 'all') {
      // Show the last copy at once, then the fresh list.
      const cachedTop = lsGet<Entry[] | null>('chess-top-cache2', null);
      this.list.set(cachedTop);
      Promise.all([this.cloud.top(200), this.oldScores()])
        .then(([rows, old]) => { const m = merge(rows, old, this.cloud.uid); lsSet('chess-top-cache2', m.map(e => ({ ...e, me: false }))); if (this.tab() === 'all') this.list.set(m); })
        .catch(e => { console.warn('leaderboard', e); if (this.tab() === 'all' && !cachedTop) this.error.set(true); });
      return;
    }
    // Season 1 = the old Google Sheet board. Show the last copy at once; Apps Script often takes a few seconds to answer.
    const cached = lsGet<Row[] | null>('chess-board-cache', null);
    this.list.set(cached ? tally(cached).slice(0, 50) : null);
    this.fetchAll()
      .then(rows => { if (this.tab() === 'season1') this.list.set(tally(rows).slice(0, 50)); })
      .catch(() => { if (this.tab() === 'season1' && !cached) this.error.set(true); });
  }

  private fetchAll() {
    if (this.pending) return this.pending;
    this.pending = fetch(SHEET_URL + '?action=rows', { cache: 'no-store' })
      .then(r => r.text())
      .then(t => { const rows = JSON.parse(t).rows || []; lsSet('chess-board-cache', rows); return rows; })
      .finally(() => { this.pending = null; });
    return this.pending;
  }
}

@Component({
  selector: 'app-leader',
  imports: [TrPipe],
  host: { style: 'display: contents' },
  template: `
<div class="scrim" id="leader">
  <div class="card" role="dialog" aria-labelledby="lbTitle">
    <h2 id="lbTitle">{{ 'Leaderboard' | tr }}</h2>
    <div class="seg" id="segLeader">
      <button [attr.aria-pressed]="lb.tab() === 'all'" (click)="pick('all')">{{ 'Everyone' | tr }}</button>
      <button [attr.aria-pressed]="lb.tab() === 'local'" (click)="pick('local')">{{ t('ของฉัน', 'Mine') }}</button>
    </div>
    <div class="lb" id="lbBody">
      @if (lb.error()) {
        <p class="empty">{{ t('ยังโหลดคะแนนไม่ได้ ลองใหม่อีกครั้งนะ', "Couldn’t load the scores. Please try again.") }}</p>
      } @else if (lb.list() === null) {
        <p class="empty">{{ t('กำลังโหลดคะแนน…', 'Loading scores…') }}</p>
      } @else if (!lb.list()!.length) {
        <p class="empty">{{ (lb.tab() === 'local' ? 'ยังไม่มีเกมที่เล่นจบบนเครื่องนี้ เล่นให้จบสักเกม (ชนะ แพ้ หรือเสมอ) แล้วคะแนนจะขึ้นที่นี่' : 'ยังไม่มีใครขึ้นกระดาน ใส่ชื่อในเมนูแล้วเล่นให้จบสักเกม') | tr }}</p>
      } @else {
        <table><thead><tr><th>#</th><th>{{ t('ชื่อ', 'Name') }}</th><th>{{ t('เกม', 'Games') }}</th><th>{{ t('ชนะ', 'W') }}</th><th>{{ t('เสมอ', 'D') }}</th><th>{{ t('แพ้', 'L') }}</th><th>{{ t('แต้ม', 'Pts') }}</th>@if (lb.tab() === 'all') {<th>{{ t('ฝีมือ', 'Rating') }}</th>}</tr></thead>
          <tbody>@for (e of lb.list(); track e.name; let k = $index) {<tr [class.top1]="k === 0" [class.me]="e.me"><td>{{ k + 1 }}</td><td>{{ e.name }}</td><td>{{ e.p }}</td><td>{{ e.w }}</td><td>{{ e.d }}</td><td>{{ e.l }}</td><td>{{ e.pts }}</td>@if (lb.tab() === 'all') {<td>{{ e.elo || '–' }}</td>}</tr>}</tbody></table>
      }
    </div>
    <p class="fine">{{ lb.tab() === 'all' ? t('ชนะคอมได้ 1–3 แต้มตามระดับ เสมอได้ 1 แต้ม รวมคะแนนจากเวอร์ชันก่อนแล้ว', 'Beat the computer for 1–3 points by level, draw for 1. Includes scores from before.')
      : t('เกมที่เล่นจบบนเครื่องนี้', 'Games finished on this device') }}</p>
    <div class="btns"><button class="btn" id="closeLeader" (click)="close()">{{ 'Back to menu' | tr }}</button></div>
  </div>
</div>`,
})
export class LeaderComponent {
  protected lb = inject(LeaderService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  constructor() { this.lb.load(); }
  t(th: string, en: string) { return this.i18n.t(th, en); }
  pick(v: 'all' | 'season1' | 'local') { this.lb.tab.set(v); this.lb.load(); }
  close() { this.ui.hide('leader'); this.ui.show('menu'); }
}
