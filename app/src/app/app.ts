import { afterNextRender, Component, HostListener, inject } from '@angular/core';
import { AudioService } from './audio/audio.service';
import { GameService } from './core/game.service';
import { UiService } from './core/ui.service';
import { SergeantService } from './sergeant/sergeant.service';
import { StreamerService } from './sergeant/streamer';
import { BattleService } from './battle/battle.service';
import { GameScreenComponent } from './game/game-screen';
import { ConfirmComponent, CreditsComponent, PromoComponent, RecapComponent, ResultComponent } from './ui/dialogs';
import { ShareService } from './share/share.service';
import { TrainCardsComponent } from './train/train-cards';
import { TrainService } from './train/train.service';
import { LeaderComponent, LeaderService } from './ui/leaderboard';
import { CloudService } from './cloud/cloud.service';
import { NetService } from './net/net.service';
import { MenuComponent } from './ui/menu';
import { SettingsComponent } from './ui/settings';

@Component({
  selector: 'app-root',
  imports: [GameScreenComponent, MenuComponent, SettingsComponent, CreditsComponent, ConfirmComponent, PromoComponent, ResultComponent, RecapComponent, TrainCardsComponent, LeaderComponent],
  host: { style: 'display: contents' },
  template: `
    <app-game-screen />
    @if (ui.isOpen('menu')) { <app-menu /> }
    @if (ui.isOpen('settings')) { <app-settings /> }
    @if (ui.isOpen('credits')) { <app-credits /> }
    @if (ui.isOpen('leader')) { <app-leader /> }
    <app-result />
    <app-recap />
    <app-train-cards />
    @if (g.pendingPromo()) { <app-promo /> }
    @if (ui.isOpen('confirm')) { <app-confirm /> }
  `,
})
export class App {
  protected ui = inject(UiService);
  protected g = inject(GameService);

  constructor() { inject(AudioService).init(); inject(SergeantService).init(); inject(StreamerService).init(); void inject(BattleService).init(); inject(ShareService).init(); inject(LeaderService).init(); inject(CloudService).init();
    const net = inject(NetService); afterNextRender(() => net.init());
    const train = inject(TrainService); afterNextRender(() => train.init()); }

  @HostListener('document:keydown.escape')
  escape() {
    const ui = this.ui;
    if (ui.isOpen('settings')) { ui.hide('settings'); if (ui.backToMenu) ui.show('menu'); ui.backToMenu = false; }
    else if (ui.isOpen('credits')) { ui.hide('credits'); ui.show('menu'); }
    else if (ui.isOpen('leader')) { ui.hide('leader'); ui.show('menu'); }
    else if (ui.isOpen('confirm')) ui.hide('confirm');
    else if (ui.isOpen('recap')) ui.hide('recap');
    else if (ui.isOpen('result')) ui.hide('result');
    else if (ui.isOpen('menu') && this.g.history().length && !this.g.over()) ui.hide('menu');
  }
}
