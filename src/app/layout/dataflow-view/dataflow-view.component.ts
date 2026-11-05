import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  resource,
  viewChild,
} from '@angular/core';
import { extractMermaid } from '../markdown';

let renderId = 0;

/**
 * Renders the mermaid blocks of a `*.component.dataflow.md` file.
 * Mermaid is imported lazily: it only loads when a diagram is opened.
 */
@Component({
  selector: 'app-dataflow-view',
  templateUrl: './dataflow-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataflowViewComponent {
  public readonly source = input.required<() => Promise<string>>();

  private readonly target = viewChild.required<ElementRef<HTMLElement>>('target');

  protected readonly markdown = resource({
    params: () => this.source(),
    loader: ({ params }) => params(),
  });

  private readonly diagrams = computed(() =>
    extractMermaid(this.markdown.value() ?? ''),
  );

  constructor() {
    effect((onCleanup) => {
      const diagrams = this.diagrams();
      const host = this.target().nativeElement;
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      if (!diagrams.length) return;

      import('mermaid').then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        });
        const svgs = await Promise.all(
          diagrams.map((code) =>
            mermaid
              .render(`dataflow-${++renderId}`, code)
              .then((r) => r.svg)
              .catch(() => '<p class="text-rose-300 text-sm">Diagram failed to render.</p>'),
          ),
        );
        if (cancelled) return;
        host.innerHTML = svgs
          .map((svg) => `<figure class="dataflow-figure">${svg}</figure>`)
          .join('');
      });
    });
  }
}
