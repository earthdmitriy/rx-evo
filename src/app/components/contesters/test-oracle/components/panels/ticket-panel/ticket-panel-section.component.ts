import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../content/generic-error/generic-error.component';
import { ConsoleTicketPanelComponent } from '../../../../shared';
import { data, error, loading, notices } from '../../../data/block-state';
import { OracleConsoleStore } from '../../../data/console.store';
import { ownThread } from '../../../data/raw-models';
import { memo } from '../../../data/vm';

// the view keeps UI state (reply text) while its input is the same object: map once per raw model
const ownThreadOnce = memo(ownThread);

/** S12: the ticket panel of the open ticket. */
@Component({
  selector: 'app-oracle-ticket-panel-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleTicketPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (ticketPanelVm(); as t) {
      <app-view-block
        class="fixed top-0 right-0 z-50 w-full max-w-md"
        data-section="ticket-panel"
        [loading]="loading(t.state)"
        [error]="error(t.state)"
        (retry)="s.retryTicket(t.id)"
      >
        <app-console-ticket-panel
          [ticketId]="t.id"
          [ticket]="t.own"
          [replyState]="
            reply().ticketId === t.id
              ? reply()
              : { pending: false, error: null }
          "
          (reply)="s.replyTicket(t.id, $event)"
          (openOrder)="s.openOrder($event)"
          (close)="s.closePanel()"
        />
        <div class="contents">
          @for (n of notices(t.state); track n) {
            <app-generic-error [error]="n" />
          }
        </div>
      </app-view-block>
    }
  `,
})
export class OracleTicketPanelSection {
  protected readonly s = inject(OracleConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly ticketPanel = toSignal(this.s.ticketPanel$, {
    initialValue: null,
  });
  protected readonly reply = toSignal(this.s.reply$, { requireSync: true });

  /** The ticket panel: the thread and the CRM's and the agent directory's names of its authors. */
  protected readonly ticketPanelVm = computed(() => {
    const t = this.ticketPanel();
    if (!t) return null;
    const thread = data(t);
    return {
      ...t,
      own: thread && ownThreadOnce(thread),
    };
  });
}
