import { afterRenderEffect, Component, computed, ElementRef, inject, Injectable, signal } from '@angular/core';
import { inCheck, PieceType } from '../core/engine';
import { GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { PrefsService } from '../core/prefs.service';
import { STREAMER_LINES, THAI_PIECE } from './rant';

const MOODS: Record<string, string[]> = {
  idle: ['e-normal', 'm-smile', 'a-desk', 'hands-desk'],
  think: ['e-down', 'm-flat', 'a-chin', 'hands-chin', 'think'],
  wait: ['e-side', 'm-smile', 'a-desk', 'hands-desk'],
  happy: ['e-happy', 'm-big', 'cheeks', 'a-up', 'stars'],
  shock: ['e-wide', 'm-o', 'a-cheeks', 'sweat'],
  meh: ['e-normal', 'm-wavy', 'a-desk', 'hands-desk', 'sweat'],
  win: ['e-happy', 'm-big', 'cheeks', 'a-up', 'stars', 'confetti'],
  lose: ['e-sad', 'm-frown', 'a-desk', 'hands-desk', 'tear'],
  draw: ['e-normal', 'm-wavy', 'a-desk', 'hands-desk'],
};

/** Streamer: a player at a desk who reacts to the game, for recording videos (Settings > Streamer character). */
@Injectable({ providedIn: 'root' })
export class StreamerService {
  private g = inject(GameService);
  private i18n = inject(I18nService);
  private prefs = inject(PrefsService);

  readonly mood = signal('idle');
  readonly sayText = signal('');
  readonly sayShown = signal(false);
  readonly on = computed(() => this.prefs.value().streamer === 'on' && (this.g.mode() === 'cpu' || this.g.mode() === 'online'));
  readonly tag = computed(() => { const me = this.g.myColor(); return this.i18n.tr((me && this.g.names()[me]) || 'You'); });
  private timer = 0;
  private sayTimer = 0;
  private last: Record<string, number> = {};

  init() {
    this.g.events.subscribe(ev => {
      if (ev.kind === 'start') this.start();
      else if (ev.kind === 'move') this.move(ev.move.promo, ev.next, ev.mover);
      else if (ev.kind === 'end') this.end();
    });
  }

  private say(kind: string, piece?: string, hold = false) {
    const list = STREAMER_LINES[kind];
    let k: number;
    do { k = Math.floor(Math.random() * list.length); } while (list.length > 1 && k === this.last[kind]);
    this.last[kind] = k;
    const name = piece ? this.i18n.tr(THAI_PIECE[piece]) : '';
    this.sayText.set(this.i18n.tr(list[k]).replace('{p}', this.i18n.lang() === 'en' ? name.toLowerCase() : name));
    this.sayShown.set(true);
    clearTimeout(this.sayTimer);
    if (!hold) this.sayTimer = setTimeout(() => this.sayShown.set(false), 2600);
  }
  /** Between reactions: think on their own turn, watch on the opponent's. */
  private rest() {
    if (this.g.over()) return;
    this.mood.set(!this.g.history().length ? 'idle' : this.g.humanSide(this.g.st().turn) ? 'think' : 'wait');
  }
  private react(mood: string, kind: string, piece?: string) {
    clearTimeout(this.timer);
    this.mood.set(mood); this.say(kind, piece);
    this.timer = setTimeout(() => this.rest(), 2600);
  }
  start() {
    clearTimeout(this.timer); this.sayShown.set(false);
    if (!this.on()) return;
    this.mood.set('idle'); this.say('start');
    this.timer = setTimeout(() => this.rest(), 2600);
  }
  private move(promo: string | undefined, next: { board: (string | null)[]; turn: 'w' | 'b'; captured: string | null }, mover: 'w' | 'b') {
    if (!this.on() || this.g.over()) return;
    const me = this.g.myColor(), took = next.captured?.[1] as PieceType | undefined;
    const check = inCheck(next.board as never, next.turn);
    if (mover === me) {
      if (promo) this.react('happy', 'promo', promo);
      else if (check) this.react('happy', 'check');
      else if (took && took !== 'P') this.react('happy', 'take', took);
      else if (took) this.react('happy', 'pawn');
      else this.rest();
    } else {
      if (check) this.react('shock', 'checked');
      else if (took && took !== 'P') this.react('shock', 'lost', took);
      else if (took) this.react('meh', 'lostPawn');
      else this.rest();
    }
  }
  private end() {
    if (!this.on()) return;
    clearTimeout(this.timer);
    const o = this.g.over()!, me = this.g.myColor();
    const r = o.type === 'draw' ? 'draw' : o.winner === me ? 'win' : 'lose';
    this.mood.set(r); this.say(r, undefined, true);
  }
}

@Component({
  selector: 'app-streamer',
  templateUrl: './streamer.html',
  host: { style: 'display: contents' },
})
export class StreamerComponent {
  protected s = inject(StreamerService);
  private el = inject(ElementRef<HTMLElement>);
  constructor() {
    // Show the drawing's parts for the current mood (same data-part names as the original SVG).
    afterRenderEffect(() => {
      const parts = MOODS[this.s.mood()];
      this.el.nativeElement.querySelectorAll('[data-part]').forEach((n: Element) =>
        n.classList.toggle('on', parts.includes((n as HTMLElement).dataset['part']!)));
    });
  }
}
