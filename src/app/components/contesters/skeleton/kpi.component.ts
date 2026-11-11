import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';

/**
 * SKELETON of a KPI field (docs/contest/spec.md §2.2): one number the orders
 * service knows about a customer. The shared views render this component with
 * the inputs `customerId` and `kind`:
 *   - `lifetimeSpend`: the KPI "Lifetime spend" in the header, e.g. `$1,234`;
 *   - `orders`:        the KPI "Orders" in the header, e.g. `12`;
 *   - `avgOrder`:      the KPI "Avg order" in the header, e.g. `$103`;
 *   - `orderCount`:    the badge of the Orders tab (the number of orders), as a badge.
 * The template (kpi.component.html) is finished, including the number format;
 * the data is yours: replace the two TODO props with whatever you like and
 * change the template's bindings to match.
 *
 * Keep: the selector and the inputs, the `data-testid`s (`state-block` from the
 * block, `field-kpi`), the visible text per kind, and the rule that nothing is
 * rendered while the number has not arrived.
 */
@Component({
  selector: 'app-kpi',
  imports: [SpinnerBlockComponent, CurrencyPipe],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (value !== undefined) {
        @switch (kind()) {
          @case ('lifetimeSpend') {
            <span data-testid="field-kpi">{{
              value | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('avgOrder') {
            <span data-testid="field-kpi">{{
              value | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('orders') {
            <span data-testid="field-kpi">{{ value }}</span>
          }
          @case ('orderCount') {
            <span class="badge badge-neutral" data-testid="field-kpi">{{
              value
            }}</span>
          }
        }
      }
    </app-spinner-block>
  `,
})
export class KpiComponent {
  /** The customer whose number is shown. */
  public readonly customerId = input.required<number>();
  /** Which number: `lifetimeSpend`, `orders`, `avgOrder` or `orderCount`. */
  public readonly kind = input.required<
    'lifetimeSpend' | 'orders' | 'avgOrder' | 'orderCount'
  >();

  // TODO: the number of `kind()` for `customerId()`; `undefined` until it has arrived
  protected value: number | undefined = undefined;

  // TODO: `true` while the number is on its way
  protected loading = false;
}
