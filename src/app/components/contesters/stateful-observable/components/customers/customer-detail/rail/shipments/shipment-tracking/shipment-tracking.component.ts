import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { StatefulBlockComponent } from '../../../../../../../../content/stateful-block/stateful-block.component';
import { SHIPMENT_BY_ORDER } from '../../../../../../sources/lookups';
import { toShipmentVm } from '../../../../../../vm/vm';

/**
 * The shipment tracking field: the skeleton (`contesters/skeleton`) with its
 * TODO props filled. The order id is the input of a projection of the shared
 * shipment factory: one request and one cached tracking per order.
 */
@Component({
  selector: 'app-shipment-tracking',
  imports: [AsyncPipe, DatePipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="block" [stream]="tracking">
      @if (tracking.value$ | async; as s) {
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
    </app-stateful-block>
  `,
})
export class ShipmentTrackingComponent {
  public readonly orderId = input.required<string>();

  protected readonly tracking = inject(SHIPMENT_BY_ORDER)
    .project(toObservable(this.orderId))
    .pipeValue(map(toShipmentVm));
}
