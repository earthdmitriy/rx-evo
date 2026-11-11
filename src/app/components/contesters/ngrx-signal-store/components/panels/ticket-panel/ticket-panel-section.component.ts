import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  TicketThread,
  TicketsApi,
} from '../../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import {
  ConsoleTicketPanelComponent,
  TicketReply,
  TicketThreadVm,
} from '../../../../shared';
import { createAction } from '../../../data/action';
import { data, error, loading } from '../../../data/block-state';
import { cacheEntryOptional } from '../../../data/entity-store';
import {
  TICKET,
  TICKETS,
  TICKETS_BY_ORDER,
  TICKET_COUNT,
} from '../../../data/sources';
import { UI_STATE } from '../../../data/ui-state';
import { Vm, toVm } from '../../../data/vm';

const toThreadVm = (t: TicketThread): TicketThreadVm => ({
  ticketId: t.ticketId,
  customerId: t.customerId,
  subject: t.subject,
  status: t.status,
  orderId: t.orderId ?? null,
  messages: t.messages,
});

/** S12: the ticket panel of the open ticket. */
@Component({
  selector: 'app-signal-store-ticket-panel-section',
  imports: [ViewBlockComponent, ConsoleTicketPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (ticketId(); as id) {
      <app-view-block
        class="fixed top-0 right-0 z-50 w-full max-w-md"
        data-section="ticket-panel"
        [loading]="loading(thread().state)"
        [error]="error(thread().state)"
        (retry)="cache.reload(id)"
      >
        <app-console-ticket-panel
          [ticketId]="id"
          [ticket]="data(thread())"
          [replyState]="reply.state()"
          (reply)="onReply(id, $event)"
          (openOrder)="ui.openOrder($event)"
          (close)="ui.closePanel()"
        />
      </app-view-block>
    }
  `,
})
export class SignalStoreTicketPanelSection {
  protected readonly ui = inject(UI_STATE);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  protected readonly ticketId = computed(() => {
    const panel = this.ui.panel();
    return panel?.kind === 'ticket' ? panel.id : null;
  });

  protected readonly cache = inject(TICKET);
  private readonly fetched = cacheEntryOptional(this.cache, this.ticketId);
  protected readonly thread = computed((): Vm<TicketThreadVm> => {
    if (this.fetched() === undefined)
      return { state: { kind: 'idle' }, data: null };
    const vm = toVm('ticket', this.fetched()!);
    return { state: vm.state, data: vm.data ? toThreadVm(vm.data) : null };
  });

  private readonly ticketsApi = inject(TicketsApi);
  protected readonly reply = createAction(
    (args: { ticketId: string; reply: TicketReply }) =>
      this.ticketsApi.replyTicket(
        args.ticketId,
        args.reply.text,
        args.reply.status,
      ),
  );

  private readonly ticketsCache = inject(TICKETS);
  private readonly ticketCountCache = inject(TICKET_COUNT);
  private readonly ticketsByOrderCache = inject(TICKETS_BY_ORDER);

  protected onReply(ticketId: string, reply: TicketReply) {
    this.reply.run({ ticketId, reply }, (thread) => {
      this.cache.set(ticketId, thread);
      this.ticketsCache.reload(thread.customerId);
      this.ticketCountCache.reload(thread.customerId);
      if (thread.orderId) this.ticketsByOrderCache.reload(thread.orderId);
    });
  }
}
