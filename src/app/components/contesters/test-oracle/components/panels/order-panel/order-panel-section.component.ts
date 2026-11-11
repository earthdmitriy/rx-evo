import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GenericErrorComponent } from '../../../../../content/generic-error/generic-error.component';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import { ConsoleOrderPanelComponent } from '../../../../shared';
import { data, error, loading, notices } from '../../../data/block-state';
import { OracleConsoleStore } from '../../../data/console.store';
import { ownHits, ownOrder } from '../../../data/raw-models';
import { memo } from '../../../data/vm';

// the view keeps UI state (edited lines) while its input is the same object: map once per raw model
const ownOrderOnce = memo(ownOrder);
const ownHitsOnce = memo(ownHits);

/** S11: the order panel of the open order. */
@Component({
  selector: 'app-oracle-order-panel-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleOrderPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (orderPanelVm(); as p) {
      <app-view-block
        class="fixed top-0 right-0 z-50 w-full max-w-md"
        data-section="order-panel"
        [loading]="loading(p.order.state)"
        [error]="p.blockError"
        (retry)="s.retryOrder()"
      >
        <app-console-order-panel
          [orderId]="p.id"
          [order]="p.orderOwn"
          [ticket]="p.ticket"
          [editing]="p.editing"
          [hits]="p.hitsOwn"
          [hitErrors]="hitErrors()"
          (retryHit)="s.retryHit($event)"
          [saveState]="
            save().orderId === p.id ? save() : { pending: false, error: null }
          "
          [resendState]="resend()"
          (close)="s.closePanel()"
          (editChange)="s.editing$.next($event)"
          (save)="s.saveOrder(p.id, customerId(), $event)"
          (resend)="s.resendConfirmation(p.id)"
          (openTicket)="s.openTicket($event)"
          (search)="s.searchProducts($event)"
        />
        <div class="contents">
          @for (
            n of notices(p.order.state, p.ticketState, p.hits.state);
            track n
          ) {
            <app-generic-error [error]="n" />
          }
        </div>
      </app-view-block>
    }
  `,
})
export class OracleOrderPanelSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(OracleConsoleStore);
  protected readonly hitErrors = toSignal(this.s.hitErrors$, {
    initialValue: {},
  });
  protected readonly loading = loading;
  protected readonly notices = notices;
  protected readonly orderPanel = toSignal(this.s.orderPanel$, {
    initialValue: null,
  });
  protected readonly save = toSignal(this.s.save$, { requireSync: true });
  protected readonly resend = toSignal(this.s.resend$, { requireSync: true });

  /** The order panel with its ticket box (undefined: not known yet, null: none) and hits. */
  protected readonly orderPanelVm = computed(() => {
    const p = this.orderPanel();
    return (
      p && {
        ...p,
        /** The panel's block: the order's own error (a failed linked ticket or search leaves the panel working). */
        blockError: error(p.order.state),
        /** The linked ticket's own state, for its notice (the box below takes only the data). */
        ticketState: p.ticket.state,
        orderOwn: (() => {
          const order = data(p.order);
          return order && ownOrderOnce(order);
        })(),
        ticket:
          p.ticket.state.kind === 'empty' ? null : (p.ticket.data ?? undefined),
        hitsOwn: p.hits.data && ownHitsOnce(p.hits.data),
      }
    );
  });
}
