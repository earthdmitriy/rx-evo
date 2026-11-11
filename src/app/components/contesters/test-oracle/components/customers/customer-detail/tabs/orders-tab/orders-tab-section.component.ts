import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { ConsoleOrdersTabComponent } from '../../../../../../shared';
import { data, error, idle, loading } from '../../../../../data/block-state';
import { OracleConsoleStore } from '../../../../../data/console.store';

/** S5: the Orders tab. */
@Component({
  selector: 'app-oracle-orders-tab-section',
  imports: [ViewBlockComponent, ConsoleOrdersTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="tab-orders"
      [loading]="loading(orders().state)"
      [error]="error(orders().state)"
      (retry)="s.retryCustomerSource('orders')"
    >
      <app-console-orders-tab
        [orders]="data(orders())"
        [customerId]="customerId()"
        (openOrder)="s.openOrder($event)"
      />
    </app-view-block>
  `,
})
export class OracleOrdersTabSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(OracleConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;
  protected readonly orders = toSignal(this.s.orders$, { initialValue: idle });
}
