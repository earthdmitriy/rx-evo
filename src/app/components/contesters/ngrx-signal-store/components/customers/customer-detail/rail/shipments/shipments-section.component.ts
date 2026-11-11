import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  IN_FLIGHT,
  OrderRow,
} from '../../../../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { ConsoleShipmentsComponent } from '../../../../../../shared';
import { data, error, loading } from '../../../../../data/block-state';
import { cacheEntry } from '../../../../../data/entity-store';
import { ORDERS } from '../../../../../data/sources';
import { UI_STATE } from '../../../../../data/ui-state';
import { toVm, Vm } from '../../../../../data/vm';

/** S9: the in-flight shipments of the selected customer: each row's tracking is its own field component. */
@Component({
  selector: 'app-signal-store-shipments-section',
  imports: [ViewBlockComponent, ConsoleShipmentsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="shipments"
      [loading]="loading(orders().state)"
      [error]="error(orders().state)"
      (retry)="cache.reload(customerId())"
    >
      <app-console-shipments
        [rows]="shipmentRows()"
        [customerId]="customerId()"
        (openOrder)="ui.openOrder($event)"
      />
    </app-view-block>
  `,
})
export class SignalStoreShipmentsSection {
  public readonly customerId = input.required<number>();

  protected readonly cache = inject(ORDERS);
  protected readonly ui = inject(UI_STATE);
  protected readonly loading = loading;
  protected readonly error = error;

  private readonly fetched = cacheEntry(this.cache, this.customerId);
  protected readonly orders = computed(
    (): Vm<OrderRow[]> => toVm('orders', this.fetched()),
  );
  protected readonly shipmentRows = computed(
    () =>
      data(this.orders())
        ?.filter((r) => IN_FLIGHT.includes(r.status))
        .map((r) => ({ orderId: r.orderId, status: r.status })) ?? null,
  );
}
