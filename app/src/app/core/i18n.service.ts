import { Injectable, signal } from '@angular/core';

export type Lang = 'th' | 'en';
export const PIECE_TH: Record<string, string> = { king: 'คิง', queen: 'ควีน', rook: 'เรือ', bishop: 'บิชอป', knight: 'ม้า', pawn: 'เบี้ย' };

/**
 * Thai on Thai devices, English everywhere else; Settings can override (same rule and storage key as the old game).
 * Dictionaries are keyed by the text as written in the code, so a missing key shows the original text.
 * They were extracted from the old index.html into public/i18n/{en,th}.json.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(I18nService.detect());
  private dict = signal<Record<string, string>>({});


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
  /**
   * Game messages are built from English sentences ("Checkmate. White wins."): translate each sentence.
   * Same rules as trS() in the original game.
   */
  trS(s: string): string {
    if (this.lang() === 'en' || !s) return s;
    const tr = (x: string) => this.tr(x);
    return (String(s).match(/[^.!?…]+[.!?…]*\s*/g) || [s]).map(x => {
      const t = x.trim(); let m: RegExpMatchArray | null;
      if ((m = t.match(/^This (\w+) can't stop the check\.$/))) return PIECE_TH[m[1]] + 'ตัวนี้กันการรุกไม่ได้';
      if ((m = t.match(/^This (\w+) has no legal move( \(it may be pinned to your king\))?\.$/))) return PIECE_TH[m[1]] + 'ตัวนี้เดินไม่ได้' + (m[2] ? ' (อาจโดนตรึงไว้กับคิง)' : '');
      if (t === 'Check!') return 'รุก!';
      if ((m = t.match(/^(White|Black) must answer it\.$/))) return tr(m[1]) + 'ต้องแก้รุก';
      if ((m = t.match(/^Hint: (\w+) (\w\d) to (\w\d)$/))) return 'คำใบ้: ' + PIECE_TH[m[1]] + ' ' + m[2] + ' ไป ' + m[3];
      if ((m = t.match(/^Move (\d+)$/))) return 'ตาที่ ' + m[1];
      if ((m = t.match(/^Waiting for (.+) to move…$/))) return 'รอ ' + m[1] + ' เดิน…';
      if (t === 'You play White.') return 'คุณเล่นฝ่ายขาว';
      if (t === 'You play Black.') return 'คุณเล่นฝ่ายดำ';
      if (t === 'You move first.') return 'คุณเดินก่อน';
      if (t === 'White moves first.') return 'ขาวเดินก่อน';
      if ((m = t.match(/^You were away too long, so (White|Black) was given the win\.$/))) return 'คุณหายไปนานเกิน ' + tr(m[1]) + 'จึงได้ชัยชนะ';
      return tr(t);
    }).join(' ');
  }

  /** Pick inline Thai or English. */
  t(th: string, en: string): string { return this.lang() === 'th' ? th : en; }
}
