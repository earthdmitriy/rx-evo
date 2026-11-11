import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';

/**
 * SKELETON of the cart line total field (docs/contest/spec.md §2.2): `qty ×
 * current price` of a cart line. The shared views render this component with
 * the inputs `sku` and `qty`. The business rule is yours to apply (H3): the
 * total is the quantity times the CURRENT price from the pricing service, and
 * nothing is shown until that price is known. The template
 * (line-total.component.html) is finished, including the currency format;
 * replace the two TODO props with whatever you like and change the template's
 * bindings to match.
 *
 * Keep: the selector and the inputs, the `data-testid`s (`state-block` from
 * the block, `field-line-total`), and the rule that nothing is rendered while
 * the total is unknown.
 */
@Component({
  selector: 'app-line-total',
  imports: [SpinnerBlockComponent, CurrencyPipe],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (total !== undefined) {
        <span data-testid="field-line-total">{{
          total | currency: 'USD'
        }}</span>
      }
    </app-spinner-block>
  `,
})
export class LineTotalComponent {
  /** The product of the line. */
  public readonly sku = input.required<string>();
  /** How many of it the cart holds. */
  public readonly qty = input.required<number>();

  // TODO: `qty() × the current price of sku()`; `undefined` until the price has arrived
  protected total: number | undefined = undefined;

  // TODO: `true` while the price is on its way
  protected loading = false;
}
