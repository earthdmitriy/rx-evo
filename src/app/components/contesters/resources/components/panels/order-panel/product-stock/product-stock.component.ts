import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../content/resource-block/resource-block.component';
import { Bus } from '../../../../data/bus';
import { StockRegistry } from '../../../../data/stock.registry';

/** The product stock field: its own request per sku, refetched when a save bumps the stock topic (R-L10's documented gap otherwise — no sharing across rows). */
@Component({
  selector: 'app-resources-product-stock',
  imports: [ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @if (stock(); as st) {
        @if (st.stock > 0) {
          <span data-testid="field-product-stock">{{ st.stock }} in stock</span>
        } @else {
          <span class="text-rose-600" data-testid="field-product-stock"
            >out of stock</span
          >
        }
      }
    </app-resource-block>
  `,
})
export class ResourcesProductStock {
  public readonly sku = input.required<string>();

  private readonly bus = inject(Bus);
  private readonly registry = inject(StockRegistry);
  /** The stock of the sku at the current version: the session's shared resource. */
  protected readonly res = computed(() => {
    const sku = this.sku();
    const v = this.bus.stock();
    return untracked(() => this.registry.stock(sku, v));
  });
  protected readonly stock = computed(() => {
    const r = this.res();
    return r.hasValue() ? r.value() : undefined;
  });
}
