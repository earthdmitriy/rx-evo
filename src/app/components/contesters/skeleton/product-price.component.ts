import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';

/**
 * SKELETON of the product price field (docs/contest/spec.md §2.2): the current
 * price of a sku from the pricing service. The shared views render this
 * component with the input `sku` in the cart line and in a search hit of the
 * order editor. The template (product-price.component.html) is finished,
 * including the currency format; the data is yours: replace the two TODO props
 * with whatever you like and change the template's bindings to match.
 *
 * Keep: the selector and the input, the `data-testid`s (`state-block` from the
 * block, `field-product-price`), and the rule that nothing is rendered while
 * the price has not arrived.
 */
@Component({
  selector: 'app-product-price',
  imports: [SpinnerBlockComponent, CurrencyPipe],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (price !== undefined) {
        <span data-testid="field-product-price">{{
          price | currency: 'USD'
        }}</span>
      }
    </app-spinner-block>
  `,
})
export class ProductPriceComponent {
  /** The product whose price is shown. */
  public readonly sku = input.required<string>();

  // TODO: the current price of `sku()`; `undefined` until it has arrived
  protected price: number | undefined = undefined;

  // TODO: `true` while the price is on its way
  protected loading = false;
}
