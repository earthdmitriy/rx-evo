import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Renders pre-rendered markdown HTML. App-absolute links (`/pipe/stream`)
 * become router navigation; everything else opens in a new tab.
 */
@Component({
  selector: 'app-markdown-view',
  template: `<div class="prose-sm" [innerHTML]="html()"></div>`,
  host: { '(click)': 'onClick($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownViewComponent {
  private readonly router = inject(Router);
  public readonly html = input.required<string>();

  protected onClick(event: MouseEvent) {
    const link = (event.target as HTMLElement | null)?.closest('a');
    const href = link?.getAttribute('href');
    if (!link || !href) return;
    if (href.startsWith('/')) {
      event.preventDefault();
      this.router.navigateByUrl(href);
    } else if (/^https?:/.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
  }
}
