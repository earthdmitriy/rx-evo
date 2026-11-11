import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../../../content/generic-error/generic-error.component';
import { ConsoleTicketsTabComponent } from '../../../../../../shared';
import {
  data,
  error,
  idle,
  loading,
  notices,
} from '../../../../../data/block-state';
import { VanillaRxjsConsoleStore } from '../../../../../data/console.store';

/** S7: the Tickets tab. */
@Component({
  selector: 'app-vanilla-rxjs-tickets-tab-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleTicketsTabComponent,
  ],
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
      <div class="contents">
        @for (n of notices(tickets().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class VanillaRxjsTicketsTabSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly tickets = toSignal(this.s.tickets$, {
    initialValue: idle,
  });
}
