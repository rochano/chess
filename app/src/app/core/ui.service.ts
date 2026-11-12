import { Injectable, signal } from '@angular/core';

export type Overlay = 'menu' | 'settings' | 'credits' | 'confirm' | 'result';
export interface ConfirmBox { title: string; text: string; yes: string; action: () => void; }

/** Which full-screen card is open (the original game's show/hide/anyOverlay). */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly open = signal<Set<Overlay>>(new Set(['menu']));
  readonly confirmBox = signal<ConfirmBox | null>(null);
  /** Settings opened from the menu go back to the menu when closed. */
  backToMenu = false;

  isOpen(o: Overlay) { return this.open().has(o); }
  any() { return this.open().size > 0; }
  show(o: Overlay) { this.open.update(s => new Set(s).add(o)); }
  hide(o: Overlay) { this.open.update(s => { const n = new Set(s); n.delete(o); return n; }); }
  closeAll() { this.open.set(new Set()); }

  confirm(title: string, text: string, yes: string, action: () => void) {
    this.confirmBox.set({ title, text, yes, action });
    this.show('confirm');
  }
}
