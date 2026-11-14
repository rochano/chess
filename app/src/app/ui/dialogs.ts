import { Component, computed, inject } from '@angular/core';
import { Color, GLYPH, kingSq, NAME, opp, PieceType } from '../core/engine';
import { BattleService } from '../battle/battle.service';
import { ShareService } from '../share/share.service';
import { GameService } from '../core/game.service';
import { I18nService, PIECE_TH } from '../core/i18n.service';
import { TrPipe } from '../core/tr.pipe';
import { UiService } from '../core/ui.service';
import { CloudService } from '../cloud/cloud.service';
import { NetService } from '../net/net.service';

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
  // Always in the page (hidden when closed): the product tip and its light effects are placed into it directly.
  template: `
<div class="scrim" id="result" [hidden]="!ui.isOpen('result')">
  <div class="card center" role="dialog" aria-labelledby="resTitle">
    @if (g.over(); as o) {
      @if (o.type === 'draw') {<div class="result-badge draw" id="resBadge">♚</div>}
      @else {<div class="result-badge" id="resBadge" [class]="o.type === 'mate' ? 'mate' : 'win'"><span class="pc" [class]="o.winner" style="font-size:44px">{{ king }}</span></div>}
    } @else {<div class="result-badge" id="resBadge"></div>}
    <h2 id="resTitle">{{ g.over() ? title() : '' }}</h2>
    <p id="resText">{{ g.over() ? text() : '' }}</p>
    @if (cloud.save()) {<p class="fine" id="resSaved">{{ saved() }}</p>}
    <div class="row2">
      <button class="btn" id="resView" (click)="view()">{{ 'View board' | tr }}</button>
      <button class="btn go" id="resAgain" (click)="again()">{{ 'Play again' | tr }}</button>
    </div>
    <div class="share-row">
      <button class="recap-tile" id="shareGo" (click)="share.openRecap()"><span class="rt-thumb"><img id="recapThumb" alt="" hidden><i class="rt-play" aria-hidden="true"></i></span><span class="rt-txt"><b id="rtTitle">{{ share.recapTitle() }}</b><small id="rtSub">{{ share.recapSub() }}</small></span><span class="rt-go" aria-hidden="true">›</span></button>
    </div>
    <div class="shop" id="shop" hidden>
      <p class="shop-say" id="shopSay"></p>
      <a class="shop-item" id="shopItem" target="_blank" rel="noopener sponsored">
        <span class="shop-ic" id="shopIc"></span>
        <span class="shop-txt"><b id="shopTitle"></b><small id="shopNote"></small></span>
        <span class="shop-go">ดูสินค้า →</span>
      </a>
      <p class="shop-fine"><span id="shopAd"></span></p>
    </div>
  </div>
</div>`,
})
export class ResultComponent {
  protected g = inject(GameService);
  protected ui = inject(UiService);
  protected share = inject(ShareService);
  private battle = inject(BattleService);
  private i18n = inject(I18nService);
  protected cloud = inject(CloudService);
  protected readonly king = GLYPH.K;
  saved = computed(() => {
    const t = (th: string, en: string) => this.i18n.t(th, en), d = this.cloud.lastDelta(), me = this.cloud.me();
    switch (this.cloud.save()) {
      case 'saving': return t('กำลังบันทึกคะแนน…', 'Saving your score…');
      case 'failed': return t('บันทึกคะแนนไม่ได้ เน็ตอาจมีปัญหา', "Couldn't save your score. Check your connection.");
      case 'saved': return d && me ? t(`บันทึกแล้ว · +${d.pts} แต้ม · Elo ${me.elo} (${d.elo >= 0 ? '+' : ''}${d.elo})`, `Saved · +${d.pts} pts · Elo ${me.elo} (${d.elo >= 0 ? '+' : ''}${d.elo})`) : t('บันทึกแล้ว', 'Saved');
      default: return '';
    }
  });

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

  again() { this.ui.hide('result'); if (this.g.mode() === 'online') { this.net.again(); return; } this.g.newGame(); this.ui.show('menu'); }
  private net = inject(NetService);
  view() {
    this.ui.hide('result');
    const o = this.g.over();
    if (this.battle.active() && o) this.battle.focus(kingSq(this.g.st().board, o.winner ? opp(o.winner) : this.g.st().turn));
  }
}

@Component({
  selector: 'app-recap',
  host: { style: 'display: contents' },
  // Always in the page (hidden when closed): the video and GIF are placed into it directly.
  template: `
<div class="scrim" id="recap" [hidden]="!ui.isOpen('recap')">
  <div class="card center" role="dialog" aria-labelledby="recapTitle">
    <h2 id="recapTitle"></h2>
    <div class="recap-box"><video id="recapVid" playsinline controls loop hidden></video><img id="recapGif" alt="" hidden><p class="recap-wait" id="recapWait"></p></div>
    <div class="share-row">
      <span class="share-lbl">{{ i18n.t('ชวนเพื่อนมาเล่น', 'Invite a friend') }}</span>
      <button class="chip" id="recapShare" (click)="share.shareGo()"></button>
      <button class="chip line" id="shareLine" (click)="share.shareOpen('line')">LINE</button>
      <button class="chip fb" id="shareFb" (click)="share.shareOpen('facebook')">Facebook</button>
      <button class="chip" id="shareCopy" (click)="share.shareCopy()">{{ i18n.t('คัดลอกลิงก์', 'Copy link') }}</button>
    </div>
    <button class="btn" id="recapClose" (click)="share.closeRecap()"></button>
  </div>
</div>`,
})
export class RecapComponent {
  protected ui = inject(UiService);
  protected share = inject(ShareService);
  protected i18n = inject(I18nService);
}
