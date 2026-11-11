import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';

/**
 * SKELETON of the open-tickets field (docs/contest/spec.md §2.2): the number of
 * open tickets of a customer, shown in three places. The shared views render
 * this component with the inputs `customerId` and `variant`:
 *   - `row`:   the badge of a row in the list of customers;
 *   - `kpi`:   the plain number of the KPI "Open tickets" in the header;
 *   - `badge`: the badge of the Tickets tab.
 * The template (open-tickets.component.html) is finished; the data is yours:
 * replace the two TODO props with whatever you like and change the template's
 * bindings to match.
 *
 * Keep: the selector and the inputs, the `data-testid`s (`state-block` from the
 * block, `field-open-tickets`), the visible text per variant, and the rule that
 * nothing is rendered while the number has not arrived.
 */
@Component({
  selector: 'app-open-tickets',
  imports: [SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (value !== undefined) {
        @switch (variant()) {
          @case ('row') {
            @if (value > 0) {
              <span
                class="badge badge-bad"
                data-testid="field-open-tickets"
                [title]="value + ' open tickets'"
                >{{ value }}</span
              >
            } @else {
              <span
                class="text-xs text-slate-300"
                data-testid="field-open-tickets"
                >0</span
              >
            }
          }
          @case ('kpi') {
            <span data-testid="field-open-tickets">{{ value }}</span>
          }
          @case ('badge') {
            <span
              class="badge badge-neutral"
              data-testid="field-open-tickets"
              >{{ value }}</span
            >
          }
        }
      }
    </app-spinner-block>
  `,
})
export class OpenTicketsComponent {
  /** The customer whose open tickets are shown. */
  public readonly customerId = input.required<number>();
  /** Where it is shown: `row`, `kpi` or `badge`. */
  public readonly variant = input<'row' | 'kpi' | 'badge'>('row');

  // TODO: the number of open tickets of `customerId()`; `undefined` until it has arrived
  protected value: number | undefined = undefined;

  // TODO: `true` while the number is on its way
  protected loading = false;
}
