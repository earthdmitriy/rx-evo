import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import { fieldError } from '../../../data/block-state';
import { cacheEntry } from '../../../data/entity-store';
import { PRODUCT_NAME } from '../../../data/sources';

/** The product name field: one cache entry per sku, however many views show it. Public: kept across sessions. */
@Component({
  selector: 'app-signal-store-product-name',
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
        <span data-testid="product-name">{{ prefix() }}{{ e.value.name }}</span>
      }
    </app-view-block>
  `,
})
export class SignalStoreProductName {
  public readonly sku = input.required<string>();
  public readonly prefix = input('');

  protected readonly cache = inject(PRODUCT_NAME);
  protected readonly entry = cacheEntry(this.cache, this.sku);
  protected readonly fieldError = fieldError;
}
