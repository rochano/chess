import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/** For the game's own built-in SVG icons only (never user text). */
@Pipe({ name: 'safeHtml' })
export class SafeHtmlPipe implements PipeTransform {
  private s = inject(DomSanitizer);
  transform(html: string): SafeHtml { return this.s.bypassSecurityTrustHtml(html); }
}
