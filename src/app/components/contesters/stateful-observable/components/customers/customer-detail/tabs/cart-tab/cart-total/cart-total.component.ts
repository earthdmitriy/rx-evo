import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs';
import { StatefulBlockComponent } from '../../../../../../../../content/stateful-block/stateful-block.component';
import { CartLineRef } from '../../../../../../../shared';
import { CURRENT_PRICE } from '../../../../../../sources/lookups';

/**
 * The cart total field: the skeleton (`contesters/skeleton`) with its TODO
 * props filled. One stream: the price entries of the shown skus projected with
 * `projectMany`, whose `combine` sums the lines once every price has loaded (no
 * total while any price is missing, H3). An empty cart totals 0.
 */
@Component({
  selector: 'app-cart-total',
  imports: [AsyncPipe, CurrencyPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="total$">
      @let value = total$.value$ | async;
      @if (value !== null && value !== undefined) {
        <span data-testid="field-cart-total">{{
          value | currency: 'USD'
        }}</span>
      }
    </app-stateful-block>
  `,
})
export class CartTotalComponent {
  public readonly lines = input.required<CartLineRef[]>();

  private readonly prices = inject(CURRENT_PRICE);
  private readonly lines$ = toObservable(this.lines);

  protected readonly total$ = this.prices
    .projectMany(this.lines$, {
      key: (line) => line.sku,
      combine: (prices, lines) =>
        lines.reduce((sum, line, i) => sum + line.qty * prices[i].price, 0),
    })
    .pipeValue(distinctUntilChanged());
}
