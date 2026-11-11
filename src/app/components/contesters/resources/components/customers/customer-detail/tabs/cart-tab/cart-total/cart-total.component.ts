import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../../../content/resource-block/resource-block.component';
import { CartLineRef } from '../../../../../../../shared';
import { CartPricesRegistry } from '../../../../../../data/cart-prices.registry';

/** The cart total field: real batched price requests for all the shown skus, in groups of `MAX_BATCH` (the backend's own limit) — the one place this entry does batch, since the request is already shaped as an array of skus; R-L9's gap doesn't apply here. No total while prices are missing (H3); an empty cart totals 0. */
@Component({
  selector: 'app-resources-cart-total',
  imports: [CurrencyPipe, ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @let value = total();
      @if (value !== null) {
        <span data-testid="field-cart-total">{{
          value | currency: 'USD'
        }}</span>
      }
    </app-resource-block>
  `,
})
export class ResourcesCartTotal {
  public readonly lines = input.required<CartLineRef[]>();

  private readonly registry = inject(CartPricesRegistry);
  private readonly skus = computed(() => this.lines().map((l) => l.sku));
  /** The cart's prices: the session's shared resource for this list of skus. */
  protected readonly res = computed(() => {
    const skus = this.skus();
    return untracked(() => this.registry.prices(skus));
  });
  protected readonly total = computed(() => {
    const r = this.res();
    const prices = r.hasValue() ? r.value() : undefined;
    if (!prices) return this.lines().length === 0 ? 0 : null;
    const bySku = new Map(prices.map((p) => [p.sku, p.price]));
    let sum = 0;
    for (const line of this.lines()) {
      const price = bySku.get(line.sku);
      if (price === undefined) return null;
      sum += line.qty * price;
    }
    return sum;
  });
}
