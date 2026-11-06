import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Part } from './view-models';

/**
 * Shows one `Part`: the projected content when ready, a small skeleton while
 * loading, an error with an optional Retry when it failed. // @s2-line
 * The host carries `data-part-state` for the tests.
 *
 * ```html
 * <app-part [part]="row.tier">{{ row.tier.value }}</app-part>
 * ```
 */
@Component({
  selector: 'app-part',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline', '[attr.data-part-state]': 'part().state' },
  template: `
    @switch (part().state) {
      @case ('loading') {
        <span class="skeleton inline-block h-3 align-middle" [style.width.rem]="width()" aria-busy="true"></span>
      }
      <!-- @s2-begin -->
      @case ('error') {
        @if (retryable()) {
          <span class="text-sm text-slate-500">{{ errorText() }} · <button type="button" class="font-medium text-indigo-600 hover:text-indigo-500" data-testid="part-retry" (click)="$event.stopPropagation(); retry.emit()">Retry</button></span>
        } @else {
          <span class="text-slate-400" [title]="errorText()">—<button type="button" class="ml-0.5 text-xs text-indigo-600 hover:text-indigo-500" aria-label="Retry" title="Retry" data-testid="part-retry" (click)="$event.stopPropagation(); retry.emit()">↻</button></span>
        }
      }
      <!-- @s2-end -->
    }
    <span [hidden]="part().state !== 'ready'"><ng-content /></span>
  `,
})
export class PartComponent {
  public readonly part = input.required<Part<unknown>>();
  /** Skeleton width while loading. */
  public readonly width = input(3);
  // @s2-begin
  public readonly errorText = input("Couldn't load");
  /** Boxes and rows show the error text with a Retry link; single values a dash and a small ↻. */
  public readonly retryable = input(false);
  public readonly retry = output<void>();
  // @s2-end
}
