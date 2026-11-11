import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../content/resource-block/resource-block.component';
import { CustomersRegistry } from '../../../data/customers.registry';

/** The customer name field: its own request per customer id (R-L10's documented gap — the header profile reads the same id separately). */
@Component({
  selector: 'app-resources-customer-name',
  imports: [ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @if (name(); as n) {
        <span data-testid="field-customer-name">{{ prefix() }}{{ n }}</span>
      }
    </app-resource-block>
  `,
})
export class ResourcesCustomerName {
  public readonly customerId = input.required<number>();
  public readonly prefix = input('');

  private readonly registry = inject(CustomersRegistry);
  /** The customer's profile, the session's shared resource for this id (the header reads the same one). */
  protected readonly res = computed(() => {
    const id = this.customerId();
    return untracked(() => this.registry.customer(id));
  });
  protected readonly name = computed(() => {
    const r = this.res();
    return (r.hasValue() ? r.value() : undefined)?.name ?? null;
  });
}
