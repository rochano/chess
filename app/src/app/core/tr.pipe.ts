import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';

/** {{ 'เริ่มเกม' | tr }} — impure so it updates when the dictionary or language changes. */
@Pipe({ name: 'tr', pure: false })
export class TrPipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(s: string): string { return this.i18n.tr(s); }
}
