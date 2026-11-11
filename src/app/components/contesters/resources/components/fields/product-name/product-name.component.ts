import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../content/resource-block/resource-block.component';
import { ProductsRegistry } from '../../../data/products.registry';

/** The product name field: its own request per sku (R-L10's documented gap — however many views show the same sku, each asks separately). */
@Component({
  selector: 'app-resources-product-name',
  imports: [ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @if (name(); as n) {
        <span data-testid="product-name">{{ prefix() }}{{ n }}</span>
      }
    </app-resource-block>
  `,
})
export class ResourcesProductName {
  public readonly sku = input.required<string>();
  public readonly prefix = input('');

  private readonly registry = inject(ProductsRegistry);
  /** The product of the sku: the session's shared resource. */
  protected readonly res = computed(() => {
    const sku = this.sku();
    return untracked(() => this.registry.product(sku));
  });
  protected readonly name = computed(() => {
    const r = this.res();
    return (r.hasValue() ? r.value() : undefined)?.name ?? null;
  });
}
