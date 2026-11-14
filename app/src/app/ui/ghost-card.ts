import { Component, computed, inject, signal } from '@angular/core';
import { GhostService } from '../cloud/ghost.service';
import { GHOST_MIN_GAMES } from '../core/ghost';
import { I18nService } from '../core/i18n.service';
import { UiService } from '../core/ui.service';

const LEVEL = { th: ['', 'ง่าย', 'ปกติ', 'ยาก'], en: ['', 'Easy', 'Normal', 'Hard'] };

/** Challenge card: who the bot plays like, how it plays, and a button to play it. */
@Component({
  selector: 'app-ghost',
  host: { style: 'display: contents' },
  template: `
<div class="scrim" id="ghost">
  <div class="card" role="dialog" aria-labelledby="ghostTitle">
    @if (gs.failed()) {
      <h2 id="ghostTitle">{{ t('แข่งกับบอท', 'Play a bot') }}</h2>
      <p>{{ t('ยังโหลดบอทไม่ได้ เน็ตอาจมีปัญหา ลองใหม่อีกครั้งนะ', "Couldn't load this bot. Check your connection and try again.") }}</p>
    } @else if (!c()) {
      <h2 id="ghostTitle">{{ t('แข่งกับบอท', 'Play a bot') }}</h2>
      <p class="fine">{{ t('กำลังโหลดบอท…', 'Loading the bot…') }}</p>
    } @else if (!c()!.ghost) {
      <h2 id="ghostTitle">{{ t('ยังไม่มีบอท', 'No bot yet') }}</h2>
      <p>{{ t('ผู้เล่นคนนี้ยังไม่ได้เล่นกับคอมหรือออนไลน์ บอทเลยยังไม่รู้ว่าเขาเล่นแบบไหน', "This player hasn't played the computer or online yet, so their bot doesn't know how they play.") }}</p>
    } @else {
      @let x = c()!; @let gh = x.ghost!;
      <h2 id="ghostTitle">{{ x.mine ? t('บอทของคุณ', 'Your bot') : t('บอทของ ' + gh.name, gh.name + "'s bot") }}</h2>
      <p>{{ x.mine ? t('บอทตัวนี้จำวิธีเดินของคุณจาก ' + gh.n + ' เกม', 'This bot learned how you play from ' + gh.n + ' games.')
                   : t('บอทตัวนี้จำวิธีเดินของ ' + gh.name + ' จาก ' + gh.n + ' เกม', 'This bot learned how ' + gh.name + ' plays from ' + gh.n + ' games.') }}</p>
      @if (x.traits.length || x.first) {
        <ul class="ghost-traits">
          @if (x.first) {<li>{{ t('ชอบเปิดเกมด้วย ' + x.first, 'Likes to open with ' + x.first) }}</li>}
          @for (tr of x.traits; track tr.en) {<li>{{ i18n.lang() === 'th' ? tr.th : tr.en }}</li>}
        </ul>
      }
      @if (x.ready) {
        <p class="fine">{{ t('ฝีมือพอๆ กับคอมระดับ' + LEVEL.th[x.level] + ' · บอทเล่นฝ่าย' + (x.side === 'w' ? 'ขาว เดินก่อน' : 'ดำ'),
          'About as strong as the computer on ' + LEVEL.en[x.level] + ' · the bot plays ' + (x.side === 'w' ? 'White and moves first' : 'Black')) }}</p>
        @if (played()) {<p class="fine">{{ t('มีคนมาท้าแล้ว ' + played() + ' ครั้ง บอทชนะ ' + gh.gw + ' ครั้ง', played() + ' challenges so far, the bot won ' + gh.gw) }}</p>}
        @if (!x.mine) {<p class="fine">{{ t('ชนะบอทได้ ' + x.level + ' แต้ม เสมอได้ 1 แต้ม ถ้าบอทชนะ ' + gh.name + ' ได้ 1 แต้ม',
          'Beat it for ' + x.level + ' points, draw for 1. If the bot wins, ' + gh.name + ' gets 1 point.') }}</p>}
      } @else {
        <p class="fine">{{ x.mine ? t('เล่นกับคอมหรือออนไลน์อีก ' + left() + ' เกม บอทของคุณจะพร้อมให้คนอื่นท้า', 'Play ' + left() + ' more games against the computer or online and your bot will be ready for others.')
          : t(gh.name + ' ต้องเล่นอีก ' + left() + ' เกม บอทถึงจะพร้อมให้ท้า', gh.name + ' needs ' + left() + ' more games before the bot is ready.') }}</p>
      }
      @if (x.mine && x.ready) {
        <div class="friendqr"><span>{{ t('ให้เพื่อนลองแข่งกับบอทของคุณ', 'Let friends play your bot') }}</span>
          <button class="chip" (click)="share()">{{ shared() || t('ส่งลิงก์ท้าแข่ง', 'Send a challenge link') }}</button></div>
      }
    }
    <div class="row2">
      <button class="btn" (click)="back()">{{ t('กลับ', 'Back') }}</button>
      @if (c()?.ready) {<button class="btn go" id="ghostPlay" (click)="gs.play()">{{ c()!.mine ? t('ลองแข่งกับตัวเอง', 'Play yourself') : t('เริ่มแข่ง', 'Play') }}</button>}
    </div>
  </div>
</div>`,
  styles: [`
    .ghost-traits { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
    .ghost-traits li { border: 2px solid var(--ink); border-radius: 999px; padding: 4px 11px; background: var(--paper-2); font-weight: 800; font-size: 13px; }
  `],
})
export class GhostCardComponent {
  protected gs = inject(GhostService);
  protected i18n = inject(I18nService);
  private ui = inject(UiService);
  protected readonly LEVEL = LEVEL;
  protected c = this.gs.card;
  protected played = computed(() => { const g = this.c()?.ghost; return g ? g.gw + g.gd + g.gl : 0; });
  protected left = computed(() => Math.max(1, GHOST_MIN_GAMES - (this.c()?.ghost?.n ?? 0)));
  protected shared = signal('');
  t(th: string, en: string) { return this.i18n.t(th, en); }
  back() { this.ui.hide('ghost'); this.ui.show(this.ui.ghostFrom); }
  async share() {
    const r = await this.gs.shareMine();
    if (r === 'copied') { this.shared.set(this.t('คัดลอกลิงก์แล้ว', 'Link copied')); setTimeout(() => this.shared.set(''), 2500); }
  }
}
