import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../../../../content/view-block/view-block.component';
import { toShipmentVm } from '../../../../../../data/mappers';
import { fieldError } from '../../../../../../data/block-state';
import { cacheEntry } from '../../../../../../data/entity-store';
import { SHIPMENT } from '../../../../../../data/sources';

/** The shipment tracking field: one cache entry per order. */
@Component({
  selector: 'app-signal-store-shipment-tracking',
  imports: [DatePipe, ViewBlockComponent],
  template: `
    <app-view-block
      class="block"
      [loading]="entry().state === 'loading'"
      [error]="fieldError(entry())"
      (retry)="cache.reload(orderId())"
    >
      @let e = entry();
      @if (e.state === 'ready') {
        @let s = shipmentVm(e.value);
        <div data-testid="field-shipment-tracking">
          <div class="flex items-center gap-2">
            <span
              class="badge"
              [class]="
                s.state === 'Delayed'
                  ? 'badge-warn'
                  : s.state === 'In transit'
                    ? 'badge-info'
                    : 'badge-neutral'
              "
              >{{ s.state }}</span
            >
            <span class="ml-auto text-xs whitespace-nowrap text-slate-500"
              >ETA {{ s.eta | date: 'MMM d' }}</span
            >
          </div>
          <div class="mt-1 truncate text-xs text-slate-500">
            {{ s.carrier }} · {{ s.lastScan }}
          </div>
        </div>
      }
    </app-view-block>
  `,
})
export class SignalStoreShipmentTracking {
  public readonly orderId = input.required<string>();
  protected readonly shipmentVm = toShipmentVm;

  protected readonly cache = inject(SHIPMENT);
  protected readonly entry = cacheEntry(this.cache, this.orderId);
  protected readonly fieldError = fieldError;
}
