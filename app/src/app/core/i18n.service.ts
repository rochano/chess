import { Injectable, signal } from '@angular/core';

export type Lang = 'th' | 'en';

/**
 * Thai on Thai devices, English everywhere else; Settings can override (same rule and storage key as the old game).
 * Dictionaries are keyed by the text as written in the code, so a missing key shows the original text.
 * They were extracted from the old index.html into public/i18n/{en,th}.json.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(I18nService.detect());
  private dict = signal<Record<string, string>>({});

  constructor() { this.load(this.lang()); }

  static detect(): Lang {
    try {
      const l = JSON.parse(localStorage.getItem('chess-prefs') || '{}').lang;
      if (l === 'th' || l === 'en') return l;
    } catch { /* private mode */ }
    return (navigator.languages || [navigator.language || '']).some(l => /^th/i.test(l)) ? 'th' : 'en';
  }

  async load(lang: Lang) {
    this.lang.set(lang);
    document.documentElement.lang = lang;
    try { this.dict.set(await (await fetch(`i18n/${lang}.json`)).json()); } catch { this.dict.set({}); }
  }

  /** Translate source text. */
  tr(s: string): string { return this.dict()[s] ?? s; }
  /** Pick inline Thai or English. */
  t(th: string, en: string): string { return this.lang() === 'th' ? th : en; }
}
