import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../../../content/resource-block/resource-block.component';
import { PricesRegistry } from '../../../../../../data/prices.registry';

/** The cart line total field: its own price request per sku (R-L10's documented gap — the price field reads the same sku separately). */
@Component({
  selector: 'app-resources-line-total',
  imports: [CurrencyPipe, ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @if (price(); as p) {
        <span data-testid="field-line-total">{{
          qty() * p | currency: 'USD'
        }}</span>
      }
    </app-resource-block>
  `,
})
export class ResourcesLineTotal {
  public readonly sku = input.required<string>();
  public readonly qty = input.required<number>();

  private readonly registry = inject(PricesRegistry);
  /** The price entry of the sku: the session's shared resource (the product price field reads the same one). */
  protected readonly res = computed(() => {
    const sku = this.sku();
    return untracked(() => this.registry.price(sku));
  });
  protected readonly price = computed(() => {
    const r = this.res();
    return r.hasValue() ? r.value()?.price : undefined;
  });
}
