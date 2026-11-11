import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';
import { ShipmentVm } from '../shared/view-models';

/**
 * SKELETON of the shipment tracking field (docs/contest/spec.md §2.2): the
 * state, ETA, carrier and last scan of an order's shipment, from the shipping
 * service. The shared view renders this component with the input `orderId`.
 * The template (shipment-tracking.component.html) is finished; the data is
 * yours: replace the two TODO props with whatever you like and change the
 * template's bindings to match.
 *
 * Keep: the selector and the input, the `data-testid`s (`state-block` from the
 * block, `field-shipment-tracking`), and the rule that nothing is rendered
 * while the tracking has not arrived.
 */
@Component({
  selector: 'app-shipment-tracking',
  imports: [SpinnerBlockComponent, DatePipe],
  template: `
    <app-spinner-block class="block" [loading]="loading">
      @if (tracking; as s) {
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
    </app-spinner-block>
  `,
})
export class ShipmentTrackingComponent {
  /** The order whose shipment is shown. */
  public readonly orderId = input.required<string>();

  // TODO: the tracking of `orderId()`; `undefined` until it has arrived
  protected tracking: ShipmentVm | undefined = undefined;

  // TODO: `true` while the tracking is on its way
  protected loading = false;
}
