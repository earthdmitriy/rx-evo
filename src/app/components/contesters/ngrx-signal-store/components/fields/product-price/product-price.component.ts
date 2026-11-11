import { CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import { fieldError } from '../../../data/block-state';
import { cacheEntry } from '../../../data/entity-store';
import { PRICE } from '../../../data/sources';

/** The product price field: one cache entry per sku, however many views show it. */
@Component({
  selector: 'app-signal-store-product-price',
  imports: [CurrencyPipe, ViewBlockComponent],
  template: `
    <app-view-block
      class="field-block"
      [loading]="entry().state === 'loading'"
      [error]="fieldError(entry())"
      (retry)="cache.reload(sku())"
    >
      @let e = entry();
      @if (e.state === 'ready') {
        <span data-testid="field-product-price">{{
          e.value.price | currency: 'USD'
        }}</span>
      }
    </app-view-block>
  `,
})
export class SignalStoreProductPrice {
  public readonly sku = input.required<string>();

  protected readonly cache = inject(PRICE);
  protected readonly entry = cacheEntry(this.cache, this.sku);
  protected readonly fieldError = fieldError;
}
