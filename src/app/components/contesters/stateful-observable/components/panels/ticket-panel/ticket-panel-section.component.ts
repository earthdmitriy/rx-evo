import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, tap } from 'rxjs';
import { TicketsApi } from '../../../../../../services/contesters';
import { StatefulBlockComponent } from '../../../../../content/stateful-block/stateful-block.component';
import { ConsoleTicketPanelComponent, TicketReply } from '../../../../shared';
import {
  OPEN_TICKETS_BY_CUSTOMER,
  TICKET_BY_ID,
  TICKETS_BY_CUSTOMER,
  TICKETS_BY_ORDER,
} from '../../../sources/lookups';
import { action } from '../../../utils/action';
import { toThreadVm } from '../../../vm/vm';

/** S12: the thread is the own data of the view; the authors are field components of the page (`CUSTOMER_NAME_FIELD`, `AGENT_NAME_FIELD`). */
@Component({
  selector: 'app-ticket-panel-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleTicketPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block
      class="fixed top-0 right-0 z-50 w-full max-w-md"
      data-section="ticket-panel"
      [stream]="ticket"
    >
      <app-console-ticket-panel
        [ticketId]="ticketId()"
        [ticket]="ticket.value$ | async"
        [replyState]="{
          pending: !!(replyTicket.result.pending$ | async),
          error: replyTicket.result.error$ | async,
        }"
        (reply)="reply($event)"
        (openOrder)="openOrder.emit($event)"
        (close)="close.emit()"
      />
    </app-stateful-block>
  `,
})
export class TicketPanelSectionComponent {
  public readonly ticketId = input.required<string>();
  public readonly openOrder = output<string>();
  public readonly close = output<void>();

  private readonly api = inject(TicketsApi);
  private readonly tickets = inject(TICKET_BY_ID);

  /** The thread of the ticket, shared (the order write reloads the same entry). */
  protected readonly ticket = this.tickets
    .project(toObservable(this.ticketId))
    .pipeValue(map(toThreadVm));

  /** A reply refreshes the thread and every counter or list that shows the ticket (R-W3). */
  protected readonly replyTicket = (() => {
    const ticketsOf = inject(TICKETS_BY_CUSTOMER);
    const openTickets = inject(OPEN_TICKETS_BY_CUSTOMER);
    const ticketsOfOrder = inject(TICKETS_BY_ORDER);
    return action(
      'replyTicket',
      ({
        ticketId,
        text,
        status,
      }: {
        ticketId: string;
        text: string;
        status: TicketReply['status'];
      }) =>
        this.api.replyTicket(ticketId, text, status).pipe(
          tap((thread) => {
            this.tickets.get(thread.ticketId).reload();
            ticketsOf.get(thread.customerId).reload();
            openTickets.get(thread.customerId).reload();
            if (thread.orderId) ticketsOfOrder.get(thread.orderId).reload();
          }),
        ),
    );
  })();

  protected reply({ text, status }: TicketReply) {
    this.replyTicket.call({ ticketId: this.ticketId(), text, status });
  }
}
