import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { SampleRouteData } from '../../samples/sample-meta';
import { renderMarkdown } from '../markdown';
import { MarkdownViewComponent } from '../markdown-view/markdown-view.component';

/**
 * A page with no demo (`kind: 'doc'`): the route's README rendered as one
 * document, top to bottom. The `# Title` is dropped: the shell's header
 * shows the title.
 */
@Component({
  selector: 'app-doc-page',
  imports: [MarkdownViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc.isLoading()) {
      <div class="space-y-3" aria-busy="true">
        <div class="skeleton h-24"></div>
        <div class="skeleton h-48"></div>
      </div>
    } @else if (doc.error()) {
      <div class="alert-error">Could not load the page.</div>
    } @else {
      <article class="card doc-page max-w-5xl p-6">
        <app-markdown-view [html]="html()" />
      </article>
    }
  `,
})
export class DocPageComponent {
  private readonly sample = toSignal(
    inject(ActivatedRoute).data.pipe(
      map((data) => (data as SampleRouteData).sample),
    ),
  );

  protected readonly doc = resource({
    params: () => this.sample(),
    loader: ({ params }) => params.readme(),
  });

  protected readonly html = computed(() =>
    renderMarkdown(
      (this.doc.value() ?? '').replace(/\r\n/g, '\n').replace(/^# .*\n/, ''),
    ),
  );
}
