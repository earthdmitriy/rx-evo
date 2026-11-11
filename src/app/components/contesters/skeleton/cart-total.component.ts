import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';
import { CartLineRef } from '../shared/fields';

/**
 * SKELETON of the cart total field (docs/contest/spec.md §2.2): the sum of `qty
 * × current price` over the lines of the cart. The shared views render this
 * component with the input `lines`. The business rule is yours to apply (H3,
 * E13, D9): no total is shown while the price of ANY line is missing. The
 * template (cart-total.component.html) is finished, including the currency
 * format; replace the two TODO props with whatever you like and change the
 * template's bindings to match.
 *
 * Keep: the selector and the input, the `data-testid`s (`state-block` from the
 * block, `field-cart-total`), and the rule that nothing is rendered while the
 * total is unknown.
 */
@Component({
  selector: 'app-cart-total',
  imports: [SpinnerBlockComponent, CurrencyPipe],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (total !== undefined) {
        <span data-testid="field-cart-total">{{
          total | currency: 'USD'
        }}</span>
      }
    </app-spinner-block>
  `,
})
export class CartTotalComponent {
  /** The lines of the cart. */
  public readonly lines = input.required<CartLineRef[]>();

  // TODO: the sum of `qty × current price` of `lines()`; `undefined` while any price is missing
  protected total: number | undefined = undefined;

  // TODO: `true` while a price is on its way
  protected loading = false;
}
