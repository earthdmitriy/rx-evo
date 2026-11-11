import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import {
  ConsoleTicketsTabComponent,
  TicketRowVm,
} from '../../../../../../shared';
import { data, error, loading } from '../../../../../data/block-state';
import { cacheEntry } from '../../../../../data/entity-store';
import { toTicketRowVm } from '../../../../../data/mappers';
import { TICKETS } from '../../../../../data/sources';
import { UI_STATE } from '../../../../../data/ui-state';
import { mapVm, toVm, Vm } from '../../../../../data/vm';

/** S7: the Tickets tab. */
@Component({
  selector: 'app-signal-store-tickets-tab-section',
  imports: [ViewBlockComponent, ConsoleTicketsTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="tab-tickets"
      [loading]="loading(tickets().state)"
      [error]="error(tickets().state)"
      (retry)="cache.reload(customerId())"
    >
      <app-console-tickets-tab
        [tickets]="data(tickets())"
        [customerId]="customerId()"
        (openTicket)="ui.openTicket($event)"
        (openOrder)="ui.openOrder($event)"
      />
    </app-view-block>
  `,
})
export class SignalStoreTicketsTabSection {
  public readonly customerId = input.required<number>();

  protected readonly cache = inject(TICKETS);
  protected readonly ui = inject(UI_STATE);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  private readonly fetched = cacheEntry(this.cache, this.customerId);
  protected readonly tickets = computed(
    (): Vm<TicketRowVm[]> =>
      mapVm(
        toVm('tickets', this.fetched(), (l) => !l.length),
        (rows) => rows.map(toTicketRowVm),
      ),
  );
}
