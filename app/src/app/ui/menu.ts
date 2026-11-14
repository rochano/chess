import { SafeHtmlPipe } from '../core/safe-html.pipe';
import { NetService } from '../net/net.service';
import { TrainService } from '../train/train.service';
import { Component, computed, inject } from '@angular/core';
import { track } from '../core/analytics';
import { GameService } from '../core/game.service';
import { I18nService } from '../core/i18n.service';
import { Prefs, PrefsService } from '../core/prefs.service';
import { TrPipe } from '../core/tr.pipe';
import { UiService } from '../core/ui.service';
import { BattleService } from '../battle/battle.service';

/** Main menu: new game settings, then practice and more (same layout and ids as the original). */
@Component({
  selector: 'app-menu',
  imports: [TrPipe, SafeHtmlPipe],
  host: { style: 'display: contents' },
  template: `
<div class="scrim" id="menu">
  <div class="card" role="dialog" aria-labelledby="menuTitle">
    <h2 class="logo" id="menuTitle">CHESS<br> GAME</h2>
    <section class="menu-play" aria-labelledby="playHd">
      <h3 class="menu-hd" id="playHd">{{ 'New game' | tr }}</h3>
      <div class="field">
        <span class="lbl">{{ 'Opponent' | tr }}</span>
        <div class="seg">
          @for (o of modes; track o.v) {
            <button [attr.aria-pressed]="p().mode === o.v" (click)="set('mode', o.v)">{{ o.label | tr }}</button>
          }
        </div>
        @if (p().mode === 'friend') {<p class="friendqr" id="friendQR"><span>{{ i18n.t('อยู่คนละเครื่อง?', 'Each on your own phone?') }}</span><button class="chip" id="friendQRBtn" (click)="qrFromFriend()">{{ i18n.t('สร้าง QR ให้เพื่อนสแกน', 'Show a QR code') }}</button></p>}
      </div>
      @if (p().mode === 'online') {
        <div class="field" id="onlineField">
          <span class="lbl">{{ 'Play on two devices' | tr }}</span>
          <button class="btn go" id="netCreate" (click)="net.host()">{{ 'Create a room' | tr }}</button>
          <div class="join"><input id="netCode" #code maxlength="8" [placeholder]="'Room code' | tr" [attr.aria-label]="'Room code' | tr" autocomplete="off" autocapitalize="characters" [value]="roomParam"
            (keydown.enter)="net.join(code.value)"><button class="btn" id="netJoin" (click)="net.join(code.value)">{{ 'Join' | tr }}</button></div>
          @if (net.msg(); as m) {<div class="netmsg" id="netMsg" aria-live="polite" [class.bad]="m.bad" [innerHTML]="m.html | safeHtml"></div>}
        </div>
      }
      @if (p().mode === 'cpu') {
        <div class="field">
          <span class="lbl">{{ 'Computer strength' | tr }}</span>
          <div class="seg">
            @for (l of levels; track l.v) {
              <button [attr.aria-pressed]="p().level === l.v" (click)="set('level', l.v)">{{ l.label | tr }}</button>
            }
          </div>
          <p class="fine" style="margin:6px 0 0">{{ levelNote() | tr }}</p>
          <p class="friendqr" id="botPick"><span>{{ i18n.t('อยากแข่งกับบอทที่เล่นเหมือนผู้เล่นจริง?', 'Want a bot that plays like a real player?') }}</span><button class="chip" (click)="ui.closeAll(); ui.show('leader')">{{ i18n.t('เลือกจากกระดานคะแนน', 'Pick one on the leaderboard') }}</button></p>
        </div>
      }
      <div class="field">
        <span class="lbl">{{ (p().mode === 'friend' ? 'Player names' : 'Your name') | tr }}</span>
        <div class="names">
          <input maxlength="24" [placeholder]="(p().mode === 'friend' ? 'White' : 'Your name') | tr" [attr.aria-label]="'White player name' | tr"
            autocomplete="off" [value]="p().nameW" (input)="set('nameW', $any($event.target).value)">
          @if (p().mode === 'friend') {
            <input maxlength="24" [placeholder]="'Black' | tr" [attr.aria-label]="'Black player name' | tr" autocomplete="off"
              [value]="p().nameB" (input)="set('nameB', $any($event.target).value)">
          }
        </div>
      </div>
      <div class="field">
        <span class="lbl">{{ 'Clock' | tr }}</span>
        <div class="seg">
          @for (c of clocks; track c) {
            <button [attr.aria-pressed]="p().clock === c" (click)="set('clock', c)">{{ c === '0' ? ('None' | tr) : c }}</button>
          }
        </div>
      </div>
      <div class="btns">
        @if (p().mode !== 'online') {<button class="btn go" id="newGame" (click)="start()">{{ 'Start game' | tr }}</button>}
        @if (g.history().length && !g.over()) {<button class="btn" (click)="ui.hide('menu')">{{ 'Back to game' | tr }}</button>}
      </div>
    </section>
    <nav class="menu-more" aria-labelledby="moreHd">
      <h3 class="menu-hd" id="moreHd">{{ 'Practice & more' | tr }}</h3>
      <div class="field">
        <div class="row2">
          <button class="btn daily" id="openDaily" (click)="train.openDaily()"></button>
          <button class="btn" id="openTut" (click)="train.openTutorial()">{{ 'How to play' | tr }}</button>
        </div>
        <button class="btn road" id="openTrain" (click)="train.openTrain()"></button>
      </div>
      <div class="field">
        <span class="lbl">{{ 'More' | tr }}</span>
        <div class="row2">
          <button class="btn" id="openLeader" (click)="ui.closeAll(); ui.show('leader')">{{ 'Leaderboard' | tr }}</button>
          <button class="btn" (click)="settings()">{{ 'Settings' | tr }}</button>
          <button class="btn go invite" id="openInvite" (click)="ui.closeAll(); ui.show('invite')">{{ i18n.t('ชวนเพื่อนมาเล่น', 'Invite friends') }}</button>
        </div>
      </div>
      <button class="linkbtn" (click)="ui.hide('menu'); ui.show('credits')">{{ 'Credits' | tr }}</button>
    </nav>
  </div>
</div>`,
})
export class MenuComponent {
  protected g = inject(GameService);
  protected ui = inject(UiService);
  protected i18n = inject(I18nService);
  private prefs = inject(PrefsService);
  private battle = inject(BattleService);
  protected train = inject(TrainService);
  protected net = inject(NetService);
  protected roomParam = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
  // The ported code draws these two buttons (streak, chapter pips) itself.
  ngAfterViewInit() { this.train.syncButtons(); }
  protected p = this.prefs.value;

  protected readonly modes = [{ v: 'friend', label: 'Friend' }, { v: 'cpu', label: 'Computer' }, { v: 'online', label: 'Online' }] as const;
  protected readonly levels = [{ v: 1, label: 'Easy' }, { v: 2, label: 'Normal' }, { v: 3, label: 'Hard' }] as const;
  protected readonly clocks = ['0', '3+2', '5+0', '10+0'];
  protected levelNote = computed(() => ({
    1: 'Easy: plays like a beginner. Half its moves are random, it often misses pieces it could take, and it never checks what you can take back.',
    2: 'Normal: looks two moves ahead and works out every exchange, so it keeps its pieces safe and punishes loose ones.',
    3: 'Hard: looks four moves ahead and always plays the best move it finds. It thinks for up to two seconds.',
  })[this.p().level] || '');

  set<K extends keyof Prefs>(k: K, v: Prefs[K]) { this.prefs.set(k, v); }

  start() {
    this.ui.hide('menu');
    this.g.newGame();
    if (this.g.mode() !== 'online' && this.p().intro !== 'off') this.battle.intro();
    track('game_start', { opponent: this.g.mode(), level: this.g.mode() === 'cpu' ? this.g.level() : 0, clock: this.p().clock });
  }
  qrFromFriend() { this.prefs.set('mode', 'online'); track('online_room', { action: 'qr_from_friend' }); this.net.host(); }
  settings() { this.ui.hide('menu'); this.ui.backToMenu = true; this.ui.show('settings'); }
}
