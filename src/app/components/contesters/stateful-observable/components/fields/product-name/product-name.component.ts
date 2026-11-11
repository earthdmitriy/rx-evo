import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../content/stateful-block/stateful-block.component';
import { PRODUCT_NAME } from '../../../sources/lookups';

/**
 * The product name field: the skeleton (`contesters/skeleton`) with its TODO
 * props filled. The sku is the input of a projection of the shared product
 * factory: one request and one cached name per sku, however many views show
 * it. The template reads the stream with the `async` pipe, and the block dims
 * on its `pending$`.
 */
@Component({
  selector: 'app-product-name',
  imports: [AsyncPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="product">
      @if (product.value$ | async; as name) {
        <span data-testid="product-name">{{ prefix() }}{{ name }}</span>
      }
    </app-stateful-block>
  `,
})
export class ProductNameComponent {
  public readonly sku = input.required<string>();
  public readonly prefix = input('');

  protected readonly product = inject(PRODUCT_NAME).project(
    toObservable(this.sku),
  );
}
