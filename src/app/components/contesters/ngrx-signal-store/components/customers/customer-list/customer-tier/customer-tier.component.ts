import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../../content/view-block/view-block.component';
import { fieldError } from '../../../../data/block-state';
import { cacheEntry } from '../../../../data/entity-store';
import { TIER } from '../../../../data/sources';

/** The customer tier field: one cache entry per customer, however many rows show it. */
@Component({
  selector: 'app-signal-store-customer-tier',
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
        <span
          class="badge px-1.5 py-0 text-[10px]"
          data-testid="field-tier"
          [class]="e.value.tier === 'VIP' ? 'badge-accent' : 'badge-neutral'"
          >{{ e.value.tier }}</span
        >
      }
    </app-view-block>
  `,
})
export class SignalStoreCustomerTier {
  public readonly customerId = input.required<number>();

  protected readonly cache = inject(TIER);
  protected readonly entry = cacheEntry(this.cache, this.customerId);
  protected readonly fieldError = fieldError;
}
