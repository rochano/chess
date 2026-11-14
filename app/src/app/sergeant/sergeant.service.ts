import { inject, Injectable, signal } from '@angular/core';
import { AudioService } from '../audio/audio.service';
import { initVoices, stopVoice, voice } from '../audio/engine';
import { Color, evaluate, GameState, Move, PieceType, pseudoMoves, quiesce, VAL } from '../core/engine';
import { GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { PrefsService } from '../core/prefs.service';
import { ANGER_LABEL, RANT, THAI_PIECE } from './rant';

export interface Taunt { kind: 'risky' | 'lost'; level: number; text: string; who: string; anger: string; ms: number; }

/** Sergeant Somchai: complains about risky moves and lost pieces, with stress that builds up (from the original). */
@Injectable({ providedIn: 'root' })
export class SergeantService {
  private g = inject(GameService);
  private i18n = inject(I18nService);
  private prefs = inject(PrefsService);
  private audio = inject(AudioService);

  readonly line = signal<Taunt | null>(null);
  readonly visible = signal(false);
  readonly held = signal(false);
  stress: Record<Color, number> = { w: 0, b: 0 };
  private timer = 0;
  private left = 0;
  private startedAt = 0;
  private lastRant: Record<string, number> = {};

  init() {
    initVoices();
    this.audio.stress = () => this.stress;
    this.audio.stopVoice = () => stopVoice();
    this.g.events.subscribe(ev => {
      if (ev.kind === 'start') { this.stress = { w: 0, b: 0 }; stopVoice(); this.dismiss(); }
      else if (ev.kind === 'move' && !this.g.over()) this.judge(ev.move, ev.prev, ev.next, ev.mover);
    });
  }

  private pickLine(kind: 'risky' | 'lost', level: number) {
    const list = RANT[kind][level - 1], key = kind + level;
    let k: number;
    do { k = Math.floor(Math.random() * list.length); } while (list.length > 1 && k === this.lastRant[key]);
    this.lastRant[key] = k;
    return list[k];
  }

  /** Stress builds with each mistake (more for bigger pieces) and cools off with clean moves. */
  private raiseStress(side: Color, t: PieceType, kind: 'risky' | 'lost') {
    this.stress[side] = Math.min(100, this.stress[side] + VAL[t] / 100 * 7 + (kind === 'lost' ? 12 : 4));
    const v = this.stress[side];
    let level = v < 35 ? 1 : v < 70 ? 2 : 3;
    if (t === 'Q') level = Math.max(level, 2);
    return level;
  }

  show(kind: 'risky' | 'lost', t: PieceType, side: Color, level = 1) {
    if (this.prefs.get().taunts === 'off') return;
    const tr = (s: string) => this.i18n.tr(s), piece = tr(THAI_PIECE[t]);
    const text = tr(this.pickLine(kind, level)).replace(/\{p\}/g, this.i18n.lang() === 'en' ? piece.toLowerCase() : piece);
    const who = tr(kind === 'risky' ? 'จ่าสมชาย เตือน' : 'จ่าสมชาย ด่า') + (this.g.myColor() ? '' : tr(side === 'w' ? ' · ฝั่งขาว' : ' · ฝั่งดำ'));
    // Long enough to read while the 3D scene is moving: about 8 s, more for long lines.
    const ms = Math.max(8000, text.length * 160);
    this.visible.set(false); this.held.set(false);
    this.line.set({ kind, level, text, who, anger: tr(ANGER_LABEL[level]), ms });
    requestAnimationFrame(() => this.visible.set(true)); // restart the CSS animation
    voice(text, level);
    this.left = ms; this.startedAt = Date.now();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.visible.set(false), ms);
  }

  dismiss() { clearTimeout(this.timer); stopVoice(); this.visible.set(false); this.held.set(false); }
  /** Pause the countdown while the pointer rests on the message. */
  hold() {
    if (!this.visible()) return;
    clearTimeout(this.timer); this.left -= Date.now() - this.startedAt; this.held.set(true);
  }
  release() {
    if (!this.held()) return;
    this.held.set(false); this.startedAt = Date.now();
    this.timer = setTimeout(() => this.visible.set(false), Math.max(1500, this.left));
  }

  private judge(m: Move, prev: GameState, next: GameState, mover: Color) {
    const victim = next.turn, g = this.g;
    const material = (b: GameState['board'], c: Color) => b.reduce((s, p) => s + (p ? (p[0] === c ? 1 : -1) * VAL[p[1] as PieceType] : 0), 0);
    // 1) The opponent just won material from a human side.
    if (next.captured && g.humanSide(victim) && VAL[next.captured[1] as PieceType] >= 300) {
      const h = g.history();
      const before = h.length >= 2 ? material(h[h.length - 2].st.board, victim) : material(prev.board, victim);
      if (before - material(next.board, victim) >= 250) {
        const t = next.captured[1] as PieceType;
        this.show('lost', t, victim, this.raiseStress(victim, t, 'lost'));
        return;
      }
    }
    // 2) A human move that leaves material hanging: compare the position as it stands with what is left
    //    after the opponent's best run of captures.
    if (!g.humanSide(mover)) return;
    const stand = evaluate(next.board) * (mover === 'w' ? 1 : -1);
    const after = -quiesce(next, -Infinity, Infinity, 0);
    if (stand - after < 220) { this.stress[mover] = Math.max(0, this.stress[mover] - 8); return; }
    // Name the most valuable piece of ours the opponent can take.
    let worst: PieceType | null = null;
    for (const mv of pseudoMoves(next, victim)) {
      const t = next.board[mv.to];
      if (t && t[0] === mover && t[1] !== 'K' && (!worst || VAL[t[1] as PieceType] > VAL[worst])) worst = t[1] as PieceType;
    }
    if (worst) this.show('risky', worst, mover, this.raiseStress(mover, worst, 'risky'));
  }
}
