import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../../../../content/view-block/view-block.component';
import { CartLineRef } from '../../../../../../../shared';
import { fieldError } from '../../../../../../data/block-state';
import { cacheEntries } from '../../../../../../data/entity-store';
import { PRICE } from '../../../../../../data/sources';

/** The cart total field: the price entries of the shown skus, summed once every price has arrived (no total while any is missing, H3). An empty cart totals 0. */
@Component({
  selector: 'app-signal-store-cart-total',
  imports: [CurrencyPipe, ViewBlockComponent],
  template: `
    <app-view-block
      class="field-block"
      [loading]="loading()"
      [error]="error()"
      (retry)="retry()"
    >
      @let value = total();
      @if (value !== null) {
        <span data-testid="field-cart-total">{{
          value | currency: 'USD'
        }}</span>
      }
    </app-view-block>
  `,
})
export class SignalStoreCartTotal {
  public readonly lines = input.required<CartLineRef[]>();

  private readonly skus = computed(() => this.lines().map((l) => l.sku));
  private readonly cache = inject(PRICE);
  private readonly entries = cacheEntries(this.cache, this.skus);
  protected readonly error = computed(() =>
    this.failedSkus().length ? "Couldn't load this." : null,
  );
  protected readonly loading = computed(() =>
    this.lines().some((l) => this.entries()[l.sku]?.state === 'loading'),
  );
  private readonly failedSkus = computed(() =>
    this.lines()
      .map((l) => l.sku)
      .filter((sku) => {
        const e = this.entries()[sku];
        return !!e && fieldError(e) !== null;
      }),
  );
  protected retry() {
    for (const sku of this.failedSkus()) this.cache.reload(sku);
  }
  protected readonly total = computed(() => {
    const entries = this.entries();
    let sum = 0;
    for (const line of this.lines()) {
      const e = entries[line.sku];
      if (e?.state !== 'ready') return null;
      sum += line.qty * e.value.price;
    }
    return sum;
  });
}
