import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';

/**
 * SKELETON of the product stock field (docs/contest/spec.md §2.2): the stock
 * of a sku from the inventory service. The shared views render this component
 * with the input `sku` in a search hit of the order editor. The template
 * (product-stock.component.html) is finished, including the text (`N in stock`,
 * `out of stock` for 0); the data is yours: replace the two TODO props with
 * whatever you like and change the template's bindings to match.
 *
 * Keep: the selector and the input, the `data-testid`s (`state-block` from the
 * block, `field-product-stock`), the visible text, and the rule that nothing is
 * rendered while the stock has not arrived (0 is a value).
 */
@Component({
  selector: 'app-product-stock',
  imports: [SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (stock !== undefined) {
        @if (stock > 0) {
          <span data-testid="field-product-stock">{{ stock }} in stock</span>
        } @else {
          <span class="text-rose-600" data-testid="field-product-stock"
            >out of stock</span
          >
        }
      }
    </app-spinner-block>
  `,
})
export class ProductStockComponent {
  /** The product whose stock is shown. */
  public readonly sku = input.required<string>();

  // TODO: the stock of `sku()`; `undefined` until it has arrived (0 is a value)
  protected stock: number | undefined = undefined;

  // TODO: `true` while the stock is on its way
  protected loading = false;
}
