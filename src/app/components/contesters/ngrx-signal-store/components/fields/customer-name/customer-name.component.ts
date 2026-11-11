import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import { fieldError } from '../../../data/block-state';
import { cacheEntry } from '../../../data/entity-store';
import { CUSTOMER } from '../../../data/sources';

/** The customer name field: the header profile reads the same cache entry. */
@Component({
  selector: 'app-signal-store-customer-name',
  imports: [ViewBlockComponent],
  template: `
    <app-view-block
      class="field-block"
      [loading]="entry().state === 'loading'"
      [error]="fieldError(entry())"
      (retry)="cache.reload(customerId())"
    >
      @let e = entry();
      @if (e.state === 'ready') {
        <span data-testid="field-customer-name"
          >{{ prefix() }}{{ e.value.name }}</span
        >
      }
    </app-view-block>
  `,
})
export class SignalStoreCustomerName {
  public readonly customerId = input.required<number>();
  public readonly prefix = input('');

  protected readonly cache = inject(CUSTOMER);
  protected readonly entry = cacheEntry(this.cache, this.customerId);
  protected readonly fieldError = fieldError;
}
