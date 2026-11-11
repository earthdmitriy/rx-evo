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
import { StatefulBlockComponent } from '../../../../../../../content/stateful-block/stateful-block.component';
import { ConsoleOrdersTabComponent } from '../../../../../../shared';
import { ORDERS_BY_CUSTOMER } from '../../../../../sources/lookups';
import { toOrderRowVm } from '../../../../../vm/vm';

/** S5. */
@Component({
  selector: 'app-orders-tab-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleOrdersTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="tab-orders" [stream]="orders">
      <app-console-orders-tab
        [orders]="orders.value$ | async"
        [customerId]="customerId()"
        (openOrder)="openOrder.emit($event)"
      />
    </app-stateful-block>
  `,
})
export class OrdersTabSectionComponent {
  public readonly customerId = input.required<number>();
  public readonly openOrder = output<string>();

  private readonly ordersOf = inject(ORDERS_BY_CUSTOMER);

  /** The orders of the customer, shared (the shipments and the order write use the same entry). */
  protected readonly orders = this.ordersOf
    .project(toObservable(this.customerId))
    .pipeValue(map((orders) => orders.map(toOrderRowVm)));
}
