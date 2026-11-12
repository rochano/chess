import { Component, computed, inject } from '@angular/core';
import { Color, GLYPH, NAME, opp, PieceType } from '../core/engine';
import { GameService } from '../core/game.service';
import { I18nService, PIECE_TH } from '../core/i18n.service';
import { TrPipe } from '../core/tr.pipe';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-credits',
  imports: [TrPipe],
  host: { style: 'display: contents' },
  template: `
<div class="scrim" id="credits">
  <div class="card" role="dialog" aria-labelledby="credTitle">
    <h2 id="credTitle">{{ 'Credits' | tr }}</h2>
    <p>{{ 'Built from the Chess Game design sheet: walnut board, sticker icons and the sun and moon turn indicator.' | tr }}</p>
    <p>{{ 'Full rules are in: castling, en passant, promotion, check, checkmate, stalemate, threefold repetition, the fifty-move rule and insufficient material. The computer player searches a few moves ahead with alpha-beta pruning.' | tr }}</p>
    <p class="fine">{{ 'Music uses orchestral samples from the FluidR3 GM soundfont by Frank Wen (CC BY 3.0), via midi-js-soundfonts by Benjamin Gleitzman.' | tr }}</p>
    <p class="fine">{{ 'Pieces use the Noto Sans Symbols 2 typeface.' | tr }} <span>Angular preview</span></p>
    <p class="fine">© 2026 Rochanapan. All rights reserved. Play only at rochano.github.io/chess</p>
    <div class="btns"><button class="btn" (click)="ui.hide('credits'); ui.show('menu')">{{ 'Close' | tr }}</button></div>
  </div>
</div>`,
})
export class CreditsComponent { protected ui = inject(UiService); }

@Component({
  selector: 'app-confirm',
  imports: [TrPipe],
  host: { style: 'display: contents' },
  template: `
@if (ui.confirmBox(); as c) {
<div class="scrim" id="confirm">
  <div class="card" role="alertdialog" aria-labelledby="confTitle">
    <h2 id="confTitle">{{ c.title | tr }}</h2>
    <p>{{ i18n.trS(c.text) }}</p>
    <div class="row2">
      <button class="btn" (click)="ui.hide('confirm')">{{ 'Keep playing' | tr }}</button>
      <button class="btn danger" (click)="yes()">{{ c.yes | tr }}</button>
    </div>
  </div>
</div>}`,
})
export class ConfirmComponent {
  protected ui = inject(UiService);
  protected i18n = inject(I18nService);
  yes() { const a = this.ui.confirmBox()?.action; this.ui.hide('confirm'); this.ui.confirmBox.set(null); a?.(); }
}

@Component({
  selector: 'app-promo',
  imports: [TrPipe],
  host: { style: 'display: contents' },
  template: `
<div class="scrim" id="promo">
  <div class="card" role="dialog" aria-labelledby="promoTitle">
    <h2 id="promoTitle">{{ 'Promote your pawn' | tr }}</h2>
    <div class="promo-row">
      @for (q of pieces; track q) {
        <button [attr.aria-label]="i18n.t('เลื่อนเป็น' + th(q), 'Promote to ' + name(q))" (click)="g.promote(q)">
          <span class="pc" [class]="color()">{{ glyph(q) }}</span>
        </button>
      }
    </div>
  </div>
</div>`,
})
export class PromoComponent {
  protected g = inject(GameService);
  protected i18n = inject(I18nService);
  protected readonly pieces = ['Q', 'R', 'B', 'N'] as const;
  color = computed(() => this.g.st().turn);
  glyph(q: PieceType) { return GLYPH[q]; }
  name(q: PieceType) { return NAME[q]; }
  th(q: PieceType) { return PIECE_TH[NAME[q]]; }
}

@Component({
  selector: 'app-result',
  imports: [TrPipe],
  host: { style: 'display: contents' },
  template: `
@if (g.over(); as o) {
<div class="scrim" id="result">
  <div class="card center" role="dialog" aria-labelledby="resTitle">
    @if (o.type === 'draw') {<div class="result-badge draw">♚</div>}
    @else {<div class="result-badge" [class]="o.type === 'mate' ? 'mate' : 'win'"><span class="pc" [class]="o.winner" style="font-size:44px">{{ king }}</span></div>}
    <h2 id="resTitle">{{ title() }}</h2>
    <p>{{ text() }}</p>
    <div class="row2">
      <button class="btn" (click)="ui.hide('result')">{{ 'View board' | tr }}</button>
      <button class="btn go" (click)="again()">{{ 'Play again' | tr }}</button>
    </div>
  </div>
</div>}`,
})
export class ResultComponent {
  protected g = inject(GameService);
  protected ui = inject(UiService);
  private i18n = inject(I18nService);
  protected readonly king = GLYPH.K;

  title = computed(() => {
    const o = this.g.over()!, me = this.g.myColor(), tr = (s: string) => this.i18n.tr(s);
    if (o.stalemate) return this.i18n.t('เสมอ (อับ)', 'Draw by stalemate');
    if (o.type === 'draw') return tr('Draw');
    const youLost = !!me && o.winner !== me;
    let t = tr(o.type === 'mate' ? 'Checkmate' : o.type === 'flag' ? "Time's up" : o.type === 'abandon' ? (youLost ? 'Away too long' : 'Opponent left') : 'Resigned');
    if (me) t += tr(youLost ? (this.g.mode() === 'cpu' ? '. The computer wins' : '. You lose') : '. You win');
    return t;
  });

  text = computed(() => {
    const o = this.g.over()!, me = this.g.myColor(), T = (th: string, en: string) => this.i18n.t(th, en);
    if (!o.stalemate) return this.i18n.trS(o.text);
    // Stalemate gets one plain explanation, from the point of view of whoever is reading.
    const stuck: Color = opp(o.stalemate);
    return me && o.stalemate === me
      ? T('เกือบชนะแล้ว! คิงของอีกฝ่ายไม่ได้ถูกรุก แต่ขยับไปไหนไม่ได้เลย แบบนี้เรียกว่า "อับ" และกติกาให้นับเป็นเสมอ ครั้งหน้าเหลือช่องให้คิงเดินไว้สักช่อง แล้วค่อยรุกฆาต',
          "So close! The other king wasn't in check, but it had no legal move. That's called stalemate, and the rules count it as a draw. Next time leave the king a square to move to, then checkmate.")
      : me
      ? T('รอดมาได้! คิงของคุณไม่ได้ถูกรุก แต่ไม่มีตาให้เดินเลย แบบนี้เรียกว่า "อับ" และกติกาให้นับเป็นเสมอ',
          "Saved! Your king wasn't in check, but you had no legal move. That's called stalemate, so the game is a draw.")
      : T('ฝ่าย' + this.i18n.tr(stuck === 'w' ? 'White' : 'Black') + 'ไม่ได้ถูกรุก แต่ไม่มีตาให้เดินเลย แบบนี้เรียกว่า "อับ" และกติกาให้นับเป็นเสมอ',
          (stuck === 'w' ? 'White' : 'Black') + " wasn't in check but had no legal move. That's called stalemate, so the game is a draw.");
  });

  again() { this.ui.hide('result'); this.g.newGame(); this.ui.show('menu'); }
}
