import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { ConsoleTicketsTabComponent } from '../../../../../../shared';
import { data, error, idle, loading } from '../../../../../data/block-state';
import { OracleConsoleStore } from '../../../../../data/console.store';

/** S7: the Tickets tab. */
@Component({
  selector: 'app-oracle-tickets-tab-section',
  imports: [ViewBlockComponent, ConsoleTicketsTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="tab-tickets"
      [loading]="loading(tickets().state)"
      [error]="error(tickets().state)"
      (retry)="s.retryCustomerSource('tickets')"
    >
      <app-console-tickets-tab
        [tickets]="data(tickets())"
        [customerId]="customerId()"
        (openTicket)="s.openTicket($event)"
        (openOrder)="s.openOrder($event)"
      />
    </app-view-block>
  `,
})
export class OracleTicketsTabSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(OracleConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;
  protected readonly tickets = toSignal(this.s.tickets$, {
    initialValue: idle,
  });
}
