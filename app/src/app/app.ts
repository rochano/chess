import { Component, HostListener, inject } from '@angular/core';
import { GameService } from './core/game.service';
import { UiService } from './core/ui.service';
import { GameScreenComponent } from './game/game-screen';
import { ConfirmComponent, CreditsComponent, PromoComponent, ResultComponent } from './ui/dialogs';
import { MenuComponent } from './ui/menu';
import { SettingsComponent } from './ui/settings';

@Component({
  selector: 'app-root',
  imports: [GameScreenComponent, MenuComponent, SettingsComponent, CreditsComponent, ConfirmComponent, PromoComponent, ResultComponent],
  host: { style: 'display: contents' },
  template: `
    <app-game-screen />
    @if (ui.isOpen('menu')) { <app-menu /> }
    @if (ui.isOpen('settings')) { <app-settings /> }
    @if (ui.isOpen('credits')) { <app-credits /> }
    @if (ui.isOpen('result')) { <app-result /> }
    @if (g.pendingPromo()) { <app-promo /> }
    @if (ui.isOpen('confirm')) { <app-confirm /> }
  `,
})
export class App {
  protected ui = inject(UiService);
  protected g = inject(GameService);

  @HostListener('document:keydown.escape')
  escape() {
    const ui = this.ui;
    if (ui.isOpen('settings')) { ui.hide('settings'); if (ui.backToMenu) ui.show('menu'); ui.backToMenu = false; }
    else if (ui.isOpen('credits')) { ui.hide('credits'); ui.show('menu'); }
    else if (ui.isOpen('confirm')) ui.hide('confirm');
    else if (ui.isOpen('result')) ui.hide('result');
    else if (ui.isOpen('menu') && this.g.history().length && !this.g.over()) ui.hide('menu');
  }
}
