import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ResourceBlockComponent } from '../../../../../../../../content/resource-block/resource-block.component';
import { toShipmentVm } from '../../../../../../data/mappers';
import { ShipmentsApi } from '../../../../../../../../../services/contesters';

/** The shipment tracking field: its own request per order (R-L10's documented gap). */
@Component({
  selector: 'app-resources-shipment-tracking',
  imports: [DatePipe, ResourceBlockComponent],
  template: `
    <app-resource-block class="block" [resource]="res">
      @if (shipment(); as s) {
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
    </app-resource-block>
  `,
})
export class ResourcesShipmentTracking {
  public readonly orderId = input.required<string>();

  private readonly shipmentsApi = inject(ShipmentsApi);
  protected readonly res = rxResource({
    params: () => this.orderId(),
    stream: ({ params }) => this.shipmentsApi.shipment(params),
  });
  protected readonly shipment = computed(() => {
    const s = this.res.hasValue() ? this.res.value() : undefined;
    return s ? toShipmentVm(s) : null;
  });
}
