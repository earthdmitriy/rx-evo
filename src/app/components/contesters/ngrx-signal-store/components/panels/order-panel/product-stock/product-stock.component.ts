import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../../content/view-block/view-block.component';
import { fieldError } from '../../../../data/block-state';
import { cacheEntry } from '../../../../data/entity-store';
import { STOCK } from '../../../../data/sources';

/** The product stock field: one cache entry per sku. */
@Component({
  selector: 'app-signal-store-product-stock',
  imports: [ViewBlockComponent],
  template: `
    <app-view-block
      class="field-block"
      [loading]="entry().state === 'loading'"
      [error]="fieldError(entry())"
      (retry)="cache.reload(sku())"
    >
      @let e = entry();
      @if (e.state === 'ready') {
        @if (e.value.stock > 0) {
          <span data-testid="field-product-stock"
            >{{ e.value.stock }} in stock</span
          >
        } @else {
          <span class="text-rose-600" data-testid="field-product-stock"
            >out of stock</span
          >
        }
      }
    </app-view-block>
  `,
})
export class SignalStoreProductStock {
  public readonly sku = input.required<string>();

  protected readonly cache = inject(STOCK);
  protected readonly entry = cacheEntry(this.cache, this.sku);
  protected readonly fieldError = fieldError;
}
