import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { OrderRow } from '../../../../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { ConsoleOrdersTabComponent } from '../../../../../../shared';
import { data, error, loading } from '../../../../../data/block-state';
import { cacheEntry } from '../../../../../data/entity-store';
import { ORDERS } from '../../../../../data/sources';
import { UI_STATE } from '../../../../../data/ui-state';
import { toVm, Vm } from '../../../../../data/vm';

/** S5: the Orders tab. */
@Component({
  selector: 'app-signal-store-orders-tab-section',
  imports: [ViewBlockComponent, ConsoleOrdersTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="tab-orders"
      [loading]="loading(orders().state)"
      [error]="error(orders().state)"
      (retry)="cache.reload(customerId())"
    >
      <app-console-orders-tab
        [orders]="data(orders())"
        [customerId]="customerId()"
        (openOrder)="ui.openOrder($event)"
      />
    </app-view-block>
  `,
})
export class SignalStoreOrdersTabSection {
  public readonly customerId = input.required<number>();

  protected readonly cache = inject(ORDERS);
  protected readonly ui = inject(UI_STATE);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  private readonly fetched = cacheEntry(this.cache, this.customerId);
  protected readonly orders = computed(
    (): Vm<OrderRow[]> => toVm('orders', this.fetched(), (l) => !l.length),
  );
}
