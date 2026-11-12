import { Component, inject } from '@angular/core';
import { track } from '../core/analytics';
import { ICON } from '../core/icons';
import { Prefs, PrefsService } from '../core/prefs.service';
import { SafeHtmlPipe } from '../core/safe-html.pipe';
import { TrPipe } from '../core/tr.pipe';
import { UiService } from '../core/ui.service';
import { PieceType } from '../core/engine';
import { SergeantService } from '../sergeant/sergeant.service';

const THEMES: Record<string, string[]> = {
  walnut: ['#F1E4C3', '#4B3528', '#8F6A47'],
  sand: ['#F3E9D2', '#B08C66', '#A07A55'],
  slate: ['#D8DCE0', '#4A525C', '#6A737D'],
};

/** Settings panel. Sound, Sergeant and 3D options are stored now and take effect as those parts are ported. */
@Component({
  selector: 'app-settings',
  imports: [TrPipe, SafeHtmlPipe],
  host: { style: 'display: contents' },
  template: `
<div class="scrim" id="settings">
  <div class="card" role="dialog" aria-labelledby="setTitle">
    <h2 id="setTitle">{{ 'Settings panel' | tr }}</h2>
    <section class="set-group">
      <h3 class="menu-hd">{{ 'Sound' | tr }}</h3>
      @for (s of sliders; track s.key) {
        <div class="field">
          <label class="lbl" [for]="s.key">{{ s.label | tr }}</label>
          <div class="slider"><span [innerHTML]="ICON[s.icon] | safeHtml"></span>
            <input type="range" [id]="s.key" min="0" max="100" [value]="p()[s.key]" (input)="set(s.key, +$any($event.target).value)">
            <output [for]="s.key">{{ p()[s.key] }}</output></div>
        </div>
      }
      <div class="field">
        <label class="lbl" for="track">{{ 'Soundtrack' | tr }}</label>
        <select id="track" [value]="p().track || 'auto'" (change)="set('track', $any($event.target).value)">
          @for (t of tracks; track t[0]) {<option [value]="t[0]" [selected]="(p().track || 'auto') === t[0]">{{ t[1] | tr }}</option>}
        </select>
      </div>
    </section>
    <section class="set-group">
      <h3 class="menu-hd">{{ 'Sergeant' | tr }}</h3>
      <div class="field"><span class="lbl">{{ 'Comments' | tr }}</span>
        <div class="seg">@for (v of onOff; track v) {<button [attr.aria-pressed]="p().taunts === v" (click)="set('taunts', v); preview('risky', 'N', 1)">{{ cap(v) | tr }}</button>}</div></div>
      <div class="field"><span class="lbl">{{ 'Voice' | tr }}</span>
        <div class="seg"><button [attr.aria-pressed]="p().voice === 'speech'" (click)="set('voice', 'speech'); preview('lost', 'B', 2)">{{ 'Thai speech' | tr }}</button>
          <button [attr.aria-pressed]="p().voice === 'mumble'" (click)="set('voice', 'mumble'); preview('lost', 'B', 2)">{{ 'Mumble' | tr }}</button></div></div>
      <div class="field"><span class="lbl">{{ 'Speaking speed' | tr }}</span>
        <div class="seg">@for (r of rates; track r[0]) {<button [attr.aria-pressed]="p().voiceRate === r[0]" (click)="set('voiceRate', r[0]); preview('lost', 'B', 3)">{{ r[1] | tr }}</button>}</div></div>
    </section>
    <section class="set-group">
      <h3 class="menu-hd">{{ 'Display' | tr }}</h3>
      <div class="field">
        <label class="lbl" for="lang">{{ 'Language' | tr }}</label>
        <select id="lang" (change)="setLang($any($event.target).value)">
          <option value="auto" [selected]="!p().lang">{{ 'Auto (from your device)' | tr }}</option>
          <option value="th" [selected]="p().lang === 'th'">ไทย</option>
          <option value="en" [selected]="p().lang === 'en'">English</option>
        </select>
      </div>
      <div class="field"><span class="lbl">{{ 'Intro scene when a game starts' | tr }}</span>
        <div class="seg">@for (v of onOff; track v) {<button [attr.aria-pressed]="(p().intro === 'off' ? 'off' : 'on') === v" (click)="set('intro', v)">{{ cap(v) | tr }}</button>}</div></div>
      <div class="field"><span class="lbl">{{ 'Streamer character' | tr }}</span>
        <div class="seg">@for (v of onOff; track v) {<button [attr.aria-pressed]="p().streamer === v" (click)="set('streamer', v)">{{ cap(v) | tr }}</button>}</div>
        <p class="fine" style="margin:6px 0 0">{{ 'A player at a desk who reacts to your game against the computer or online. Handy for recording videos.' | tr }}</p></div>
      <div class="field">
        <label class="lbl" for="theme">{{ 'Board theme' | tr }}</label>
        <select id="theme" (change)="set('theme', $any($event.target).value)">
          @for (t of themes; track t[0]) {<option [value]="t[0]" [selected]="p().theme === t[0]">{{ t[1] | tr }}</option>}
        </select>
        <div class="swatches" aria-hidden="true">@for (c of swatch(); track $index) {<i [style.background]="c"></i>}</div>
      </div>
    </section>
    <div class="btns"><button class="btn go" (click)="close()">{{ 'Done' | tr }}</button></div>
  </div>
</div>`,
})
export class SettingsComponent {
  protected ui = inject(UiService);
  private prefs = inject(PrefsService);
  private sergeant = inject(SergeantService);
  protected p = this.prefs.value;
  protected readonly ICON = ICON;
  protected readonly sliders = [
    { key: 'volMusic', label: 'Music', icon: 'note' },
    { key: 'volMove', label: 'Move sounds', icon: 'vol' },
    { key: 'volAlert', label: 'Check and clock alerts', icon: 'bell' },
  ] as const;
  protected readonly tracks = [['auto', 'Change every game'], ['classic', 'Classic · คลาสสิก'], ['garden', 'Garden · สวนยามเช้า'],
    ['nocturne', 'Nocturne · ราตรี'], ['waltz', 'Waltz · วอลทซ์'], ['journey', 'Journey · ออกเดินทาง']];
  protected readonly onOff = ['on', 'off'] as const;
  protected readonly rates = [['0.65', 'Slow'], ['0.8', 'Medium'], ['1', 'Normal']];
  protected readonly themes = [['walnut', 'Walnut'], ['sand', 'Sandstone'], ['slate', 'Slate']];

  /** Let the player hear the Sergeant with the new setting. */
  preview(kind: 'risky' | 'lost', t: PieceType, level: number) { this.sergeant.show(kind, t, 'w', level); }
  cap(v: string) { return v === 'on' ? 'On' : 'Off'; }
  swatch() { return THEMES[this.p().theme]; }
  set<K extends keyof Prefs>(k: K, v: Prefs[K]) { this.prefs.set(k, v); }
  setLang(v: string) {
    this.prefs.set('lang', v === 'auto' ? undefined : (v as 'th' | 'en'));
    track('language', { lang: v });
    location.reload();
  }
  close() { this.ui.hide('settings'); if (this.ui.backToMenu) this.ui.show('menu'); this.ui.backToMenu = false; }
}
