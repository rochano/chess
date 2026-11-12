import { Component } from '@angular/core';
import { BoardComponent } from './game/board';

@Component({
  selector: 'app-root',
  imports: [BoardComponent],
  template: `
    <header><img src="img/logo.svg" width="40" height="40" alt="" /><h1>Chess Game</h1><small>Angular preview</small></header>
    <main><app-board /></main>
    <footer>© 2026 Rochanapan. All rights reserved.</footer>
  `,
  styles: `
    :host { display: grid; min-height: 100vh; grid-template-rows: auto 1fr auto; }
    header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; }
    h1 { margin: 0; font-size: 20px; }
    small { border: 2px solid var(--ink); border-radius: 999px; padding: 2px 8px; font-weight: 800; font-size: 11px; }
    main { padding: 8px 16px 24px; }
    footer { text-align: center; padding: 12px; font-size: 12px; color: var(--ink-soft); }
  `,
})
export class App {}
