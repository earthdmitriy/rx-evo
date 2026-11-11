import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../../../content/generic-error/generic-error.component';
import { ConsoleOrdersTabComponent } from '../../../../../../shared';
import {
  data,
  error,
  idle,
  loading,
  notices,
} from '../../../../../data/block-state';
import { VanillaRxjsConsoleStore } from '../../../../../data/console.store';

/** S5: the Orders tab. */
@Component({
  selector: 'app-vanilla-rxjs-orders-tab-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleOrdersTabComponent,
  ],
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
      <div class="contents">
        @for (n of notices(orders().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class VanillaRxjsOrdersTabSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly orders = toSignal(this.s.orders$, { initialValue: idle });
}
