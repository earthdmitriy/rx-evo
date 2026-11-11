import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../content/resource-block/resource-block.component';
import { PricesRegistry } from '../../../data/prices.registry';

/** The product price field: its own request per sku (R-L10's documented gap). */
@Component({
  selector: 'app-resources-product-price',
  imports: [CurrencyPipe, ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @if (price(); as p) {
        <span data-testid="field-product-price">{{ p | currency: 'USD' }}</span>
      }
    </app-resource-block>
  `,
})
export class ResourcesProductPrice {
  public readonly sku = input.required<string>();

  private readonly registry = inject(PricesRegistry);
  /** The price entry of the sku: the session's shared resource. */
  protected readonly res = computed(() => {
    const sku = this.sku();
    return untracked(() => this.registry.price(sku));
  });
  protected readonly price = computed(() => {
    const r = this.res();
    return r.hasValue() ? r.value()?.price : undefined;
  });
}
