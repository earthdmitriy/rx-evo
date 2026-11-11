import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../content/stateful-block/stateful-block.component';
import { map } from 'rxjs';
import { CURRENT_PRICE } from '../../../sources/lookups';

/**
 * The product price field: the skeleton (`contesters/skeleton`) with its TODO
 * props filled. The sku is the input of a projection of the shared price
 * factory: one request and one cached price per sku, however many views show
 * it. The template reads the stream with the `async` pipe, and the block dims
 * on its `pending$`.
 */
@Component({
  selector: 'app-product-price',
  imports: [AsyncPipe, CurrencyPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="price">
      @let value = price.value$ | async;
      @if (value !== null && value !== undefined) {
        <span data-testid="field-product-price">{{
          value | currency: 'USD'
        }}</span>
      }
    </app-stateful-block>
  `,
})
export class ProductPriceComponent {
  public readonly sku = input.required<string>();

  protected readonly price = inject(CURRENT_PRICE)
    .project(toObservable(this.sku))
    .pipeValue(map((entry) => entry.price));
}
