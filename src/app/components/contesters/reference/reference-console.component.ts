import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ConsoleActivityComponent,
  ConsoleAgentComponent,
  ConsoleCartTabComponent,
  ConsoleCustomerHeaderComponent,
  ConsoleCustomerListComponent,
  ConsoleCustomerTabsComponent,
  ConsoleFrameComponent,
  ConsoleNotesTabComponent,
  ConsoleNotificationsComponent,
  ConsoleOrderPanelComponent,
  ConsoleOrdersTabComponent,
  ConsoleShipmentsComponent,
  ConsoleSignInComponent,
  ConsoleTicketPanelComponent,
  ConsoleTicketsTabComponent,
  Part,
  part,
} from '../shared';
import { StatefulBlockComponent } from '../../content/stateful-block/stateful-block.component';
import { ReferenceConsoleStore } from './data/console.store';
import { Vm } from './data/vm';
import { IDLE, ViewState } from './data/view-state';

const idle = { state: IDLE, data: null };

/** A section's tracking state as a field: ready or empty with data → ready, nothing requested → null. */
const toPart = <T>(state: ViewState, data: T | null, whenEmpty: T | null): Part<T> | null => {
  switch (state.kind) {
    case 'idle':
      return null;
    case 'loading':
      return part.loading();
    case 'error':
      return data !== null ? part.ready(data) : part.error();
    default:
      return part.ready(data ?? (whenEmpty as T));
  }
};

/** Reference implementation of the support console (test oracle, not a contest entry). */
@Component({
  selector: 'app-reference-console',
  imports: [
    ConsoleFrameComponent,
    ConsoleSignInComponent,
    ConsoleAgentComponent,
    ConsoleNotificationsComponent,
    ConsoleCustomerListComponent,
    ConsoleCustomerHeaderComponent,
    ConsoleCustomerTabsComponent,
    ConsoleOrdersTabComponent,
    ConsoleCartTabComponent,
    ConsoleTicketsTabComponent,
    ConsoleNotesTabComponent,
    ConsoleShipmentsComponent,
    ConsoleActivityComponent,
    ConsoleOrderPanelComponent,
    ConsoleTicketPanelComponent,
    StatefulBlockComponent,
  ],
  templateUrl: './reference-console.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceConsoleComponent {
  protected readonly s = inject(ReferenceConsoleStore);

  /** Block inputs of a section: loading (first load or reload), error text, the data to show. */
  protected loading(state: ViewState): boolean {
    return state.kind === 'loading' || (state.kind === 'ready' && state.reloading);
  }
  protected error(state: ViewState): string | null {
    // a failed refetch that kept its data (polls, reloads) is silent: the view keeps what it has
    if (state.kind !== 'error' || state.stale) return null;
    return state.failed.length ? `Couldn't load ${state.failed.join(', ')}.` : "Couldn't load this.";
  }
  /** A source that is a field of its view (the profile, the bell's list): ready with data, else loading or error. */
  protected asPart<T>(vm: Vm<T>): Part<T> | null {
    if (vm.data !== null && !(vm.state.kind === 'error' && !vm.state.stale)) return part.ready(vm.data);
    if (vm.state.kind === 'error') return part.error();
    if (vm.state.kind === 'loading') return part.loading();
    return null;
  }
  protected data<T>(vm: Vm<T>): T | null {
    return vm.state.kind === 'error' && !vm.state.stale ? null : vm.data;
  }

  constructor() {
    // the bell is rebuilt closed when the page is shown again
    inject(DestroyRef).onDestroy(() => this.s.notificationsOpen$.next(false));
  }

  protected readonly signedIn = toSignal(this.s.signedIn$, { requireSync: true });
  protected readonly login = toSignal(this.s.login$, { requireSync: true });
  protected readonly agent = toSignal(this.s.agent$, { initialValue: idle });
  protected readonly notifications = toSignal(this.s.notifications$, { initialValue: idle });
  protected readonly markRead = toSignal(this.s.markRead$, { requireSync: true });
  protected readonly query = toSignal(this.s.displayQuery$, { requireSync: true });
  protected readonly customers = toSignal(this.s.customers$, { initialValue: idle });
  protected readonly selected = toSignal(this.s.selected$, { requireSync: true });
  protected readonly header = toSignal(this.s.header$, { initialValue: idle });
  protected readonly kpis = toSignal(this.s.kpis$, { initialValue: null });
  protected readonly counters = toSignal(this.s.counters$, { initialValue: null });
  protected readonly tab = toSignal(this.s.tab$, { requireSync: true });
  protected readonly orders = toSignal(this.s.orders$, { initialValue: idle });
  protected readonly cart = toSignal(this.s.cart$, { initialValue: idle });
  protected readonly tickets = toSignal(this.s.tickets$, { initialValue: idle });
  protected readonly notes = toSignal(this.s.notes$, { initialValue: idle });
  protected readonly note = toSignal(this.s.note$, { requireSync: true });
  protected readonly shipments = toSignal(this.s.shipments$, { initialValue: idle });
  protected readonly activity = toSignal(this.s.activity$, { initialValue: idle });
  protected readonly orderPanel = toSignal(this.s.orderPanel$, { initialValue: null });
  protected readonly ticketPanel = toSignal(this.s.ticketPanel$, { initialValue: null });
  protected readonly save = toSignal(this.s.save$, { requireSync: true });
  protected readonly reply = toSignal(this.s.reply$, { requireSync: true });
  protected readonly resend = toSignal(this.s.resend$, { requireSync: true });

  protected readonly shipmentRows = computed(() => {
    const rows = this.data(this.shipments());
    return (
      rows &&
      rows.map((r) => ({
        orderId: r.orderId,
        status: r.status,
        shipment: toPart(r.state, r.shipment, null) ?? part.loading<NonNullable<typeof r.shipment>>(),
      }))
    );
  });

  /** The order panel with its ticket box and hits as fields. */
  protected readonly orderPanelVm = computed(() => {
    const p = this.orderPanel();
    return (
      p && {
        ...p,
        /** The panel's block: the order's own error, else a failed price or stock of the hits (content kept). */
        blockError: this.error(p.order.state) ?? (p.hits.data !== null ? this.error(p.hits.state) : null),
        ticket: p.ticket.state.kind === 'empty' ? null : toPart(p.ticket.state, p.ticket.data, null),
        hits: toPart(p.hits.state, p.hits.data, []),
      }
    );
  });
}
