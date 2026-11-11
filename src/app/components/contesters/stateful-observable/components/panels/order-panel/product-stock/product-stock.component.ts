import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../../content/stateful-block/stateful-block.component';
import { STOCK_BY_SKU } from '../../../../sources/lookups';

/**
 * The product stock field: the skeleton (`contesters/skeleton`) with its TODO
 * props filled. The sku is the input of a projection of the shared stock
 * factory (one request per sku); the template reads it with the `async` pipe
 * and the block dims on its `pending$`.
 */
@Component({
  selector: 'app-product-stock',
  imports: [AsyncPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="stock">
      @let value = stock.value$ | async;
      @if (value !== null && value !== undefined) {
        @if (value > 0) {
          <span data-testid="field-product-stock">{{ value }} in stock</span>
        } @else {
          <span class="text-rose-600" data-testid="field-product-stock"
            >out of stock</span
          >
        }
      }
    </app-stateful-block>
  `,
})
export class ProductStockComponent {
  public readonly sku = input.required<string>();

  protected readonly stock = inject(STOCK_BY_SKU).project(
    toObservable(this.sku),
  );
}
