import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../content/resource-block/resource-block.component';
import { TiersRegistry } from '../../../../data/tiers.registry';

/** The customer tier field: the session's shared tier for this id (one request per customer, however many rows and sections show it). */
@Component({
  selector: 'app-resources-customer-tier',
  imports: [ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @if (tier(); as t) {
        <span
          class="badge px-1.5 py-0 text-[10px]"
          data-testid="field-tier"
          [class]="t === 'VIP' ? 'badge-accent' : 'badge-neutral'"
          >{{ t }}</span
        >
      }
    </app-resource-block>
  `,
})
export class ResourcesCustomerTier {
  public readonly customerId = input.required<number>();

  private readonly registry = inject(TiersRegistry);
  /** The customer's tier: the session's shared resource for this id. */
  protected readonly res = computed(() => {
    const id = this.customerId();
    return untracked(() => this.registry.tier(id));
  });
  protected readonly tier = computed(() => {
    const r = this.res();
    return r.hasValue() ? r.value() : undefined;
  });
}
