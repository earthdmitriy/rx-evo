import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { IN_FLIGHT } from '../../../../../../../../services/contesters';
import { StatefulBlockComponent } from '../../../../../../../content/stateful-block/stateful-block.component';
import {
  ConsoleShipmentsComponent,
  ShipmentRow,
} from '../../../../../../shared';
import { ORDERS_BY_CUSTOMER } from '../../../../../sources/lookups';

/**
 * S9: the in-flight orders (the orders service, shared with the Orders tab)
 * are the own data of the view; the tracking of each is a field component of
 * the page (`SHIPMENT_TRACKING_FIELD`, the shipping service).
 */
@Component({
  selector: 'app-shipments-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleShipmentsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="shipments" [stream]="slot">
      <app-console-shipments
        [rows]="slot.value$ | async"
        [customerId]="customerId()"
        (openOrder)="openOrder.emit($event)"
      />
    </app-stateful-block>
  `,
})
export class ShipmentsSectionComponent {
  public readonly customerId = input.required<number>();
  public readonly openOrder = output<string>();

  private readonly ordersOf = inject(ORDERS_BY_CUSTOMER);

  /** The orders of the customer, shared with the Orders tab (the same entry). */
  protected readonly slot = this.ordersOf
    .project(toObservable(this.customerId))
    .pipeValue(
      map((orders) =>
        orders
          .filter((o) => IN_FLIGHT.includes(o.status))
          .map(({ orderId, status }): ShipmentRow => ({ orderId, status })),
      ),
    );
}
