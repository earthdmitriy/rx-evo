import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  TicketsApi,
  TicketThread,
} from '../../../../../../services/contesters';
import { ResourceBlockComponent } from '../../../../../content/resource-block/resource-block.component';
import {
  ConsoleTicketPanelComponent,
  TicketReply,
  TicketThreadVm,
} from '../../../../shared';
import { createAction } from '../../../data/action';
import { Bus } from '../../../data/bus';
import { UiState } from '../../../data/ui-state';

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
  selector: 'app-resources-ticket-panel-section',
  imports: [ResourceBlockComponent, ConsoleTicketPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (ticketId(); as id) {
      <app-resource-block
        class="fixed top-0 right-0 z-50 w-full max-w-md"
        data-section="ticket-panel"
        [resource]="threadRes"
      >
        <app-console-ticket-panel
          [ticketId]="id"
          [ticket]="thread()"
          [replyState]="reply.state()"
          (reply)="onReply(id, $event)"
          (openOrder)="ui.openOrder($event)"
          (close)="ui.closePanel()"
        />
      </app-resource-block>
    }
  `,
})
export class ResourcesTicketPanelSection {
  protected readonly ui = inject(UiState);

  protected readonly ticketId = computed(() => {
    const panel = this.ui.panel();
    return panel?.kind === 'ticket' ? panel.id : undefined;
  });

  private readonly ticketsApi = inject(TicketsApi);
  protected readonly threadRes = rxResource({
    params: () => this.ticketId(),
    stream: ({ params }) => this.ticketsApi.ticket(params),
  });
  protected readonly thread = computed((): TicketThreadVm | null => {
    const t = this.threadRes.hasValue() ? this.threadRes.value() : undefined;
    return t ? toThreadVm(t) : null;
  });

  protected readonly reply = createAction(
    (args: { ticketId: string; reply: TicketReply }) =>
      this.ticketsApi.replyTicket(
        args.ticketId,
        args.reply.text,
        args.reply.status,
      ),
  );

  private readonly bus = inject(Bus);

  protected onReply(ticketId: string, reply: TicketReply) {
    this.reply.run({ ticketId, reply }, (updated) => {
      this.threadRes.set(updated);
      this.bus.bump(
        this.bus.tickets,
        this.bus.ticketCounts,
        this.bus.ticketsByOrder,
      );
    });
  }
}
