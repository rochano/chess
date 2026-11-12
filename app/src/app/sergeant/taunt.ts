import { Component, inject } from '@angular/core';
import { TrPipe } from '../core/tr.pipe';
import { SergeantService } from './sergeant.service';

/** Sergeant Somchai's speech bubble beside the board. */
@Component({
  selector: 'app-taunt',
  imports: [TrPipe],
  host: { style: 'display: contents' },
  template: `
<div class="taunt" id="taunt" role="status" aria-live="assertive"
  [class.show]="s.visible()" [class.hold]="s.held()" [class.warn]="s.line()?.kind === 'risky'"
  [attr.data-level]="s.line()?.level" [style.--taunt-ms]="(s.line()?.ms ?? 8000) + 'ms'"
  (click)="s.dismiss()" (pointerenter)="s.hold()" (pointerleave)="s.release()">
        <svg class="soldier" viewBox="0 0 92 112" aria-hidden="true">
          <path d="M14 112c2-20 14-30 32-30s30 10 32 30z" fill="#5E6B3A" stroke="#2F2620" stroke-width="3"/>
          <path d="M38 84l8 10 8-10" fill="#C9A227" stroke="#2F2620" stroke-width="2.5" stroke-linejoin="round"/>
          <rect x="34" y="70" width="24" height="16" rx="5" fill="#E8B48C" stroke="#2F2620" stroke-width="3"/>
          <ellipse class="face" cx="46" cy="52" rx="24" ry="25" fill="#F0C29B" stroke="#2F2620" stroke-width="3"/>
          <g class="cheeks"><ellipse cx="30" cy="68" rx="5" ry="3" fill="#E5574A" opacity=".55"/><ellipse cx="62" cy="68" rx="5" ry="3" fill="#E5574A" opacity=".55"/></g>
          <path d="M16 46c0-20 13-31 30-31s30 11 30 31c0 3-2 4-5 4H21c-3 0-5-1-5-4z" fill="#6B7A3E" stroke="#2F2620" stroke-width="3"/>
          <path d="M12 48h68" stroke="#2F2620" stroke-width="5" stroke-linecap="round"/>
          <circle cx="46" cy="30" r="5" fill="#C9A227" stroke="#2F2620" stroke-width="2"/>
          <path d="M28 56l11 4M64 56l-11 4" stroke="#2F2620" stroke-width="4" stroke-linecap="round"/>
          <circle cx="36" cy="63" r="2.8" fill="#2F2620"/><circle cx="56" cy="63" r="2.8" fill="#2F2620"/>
          <path d="M33 72c4-4 9-5 13-2 4-3 9-2 13 2-5 2-9 2-13 0-4 2-8 2-13 0z" fill="#3A2A1E"/>
          <path d="M38 74q8 10 16 0z" fill="#8E2A22" stroke="#2F2620" stroke-width="2.5" stroke-linejoin="round"/>
          <path class="sweat" d="M70 54q8-4 6 6" fill="none" stroke="#7FB3E0" stroke-width="3" stroke-linecap="round"/>
          <g class="steam" fill="none" stroke="#9AA0A6" stroke-width="3.5" stroke-linecap="round"><path d="M10 30q-6-6 0-12t0-12"/><path d="M82 30q6-6 0-12t0-12"/></g>
        </svg>
  <div class="bubble"><b>{{ s.line()?.who }}</b><p>{{ s.line()?.text }}</p>
    <div class="anger" aria-hidden="false"><span>{{ 'ความเครียด' | tr }}</span>
      @for (k of [0, 1, 2]; track k) {<i [class.on]="k < (s.line()?.level ?? 0)"></i>}
      <span>{{ s.line()?.anger }}</span></div>
    <small>{{ 'แตะเพื่อปิด' | tr }}</small><span class="bar"><i></i></span></div>
</div>`,
})
export class TauntComponent { protected s = inject(SergeantService); }
