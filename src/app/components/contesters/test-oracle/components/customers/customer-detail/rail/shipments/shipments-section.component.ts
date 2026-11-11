import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../../../content/generic-error/generic-error.component';
import { ConsoleShipmentsComponent } from '../../../../../../shared';
import {
  data,
  error,
  idle,
  loading,
  notices,
} from '../../../../../data/block-state';
import { OracleConsoleStore } from '../../../../../data/console.store';

/** S9: the in-flight shipments of the selected customer. */
@Component({
  selector: 'app-oracle-shipments-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleShipmentsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="shipments"
      [loading]="loading(shipments().state)"
      [error]="error(shipments().state)"
      (retry)="s.retryCustomerSource('orders')"
    >
      <app-console-shipments
        [rows]="shipmentRows()"
        [customerId]="customerId()"
        (openOrder)="s.openOrder($event)"
      />
      <div class="contents">
        @for (n of notices(shipments().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class OracleShipmentsSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(OracleConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly shipments = toSignal(this.s.shipments$, {
    initialValue: idle,
  });
  protected readonly shipmentRows = computed(
    () =>
      data(this.shipments())?.map((r) => ({
        orderId: r.orderId,
        status: r.status,
      })) ?? null,
  );
}
