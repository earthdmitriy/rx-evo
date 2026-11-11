import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounce, distinctUntilChanged, of, timer } from 'rxjs';
import { OrderDetail, OrdersApi } from '../../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import { ConsoleOrderPanelComponent, OrderSave } from '../../../../shared';
import { createAction } from '../../../data/action';
import { data, error, fieldError, loading } from '../../../data/block-state';
import { cacheEntryOptional } from '../../../data/entity-store';
import { fetched } from '../../../data/fetched';
import { toLinkedTicket } from '../../../data/mappers';
import {
  ORDER,
  ORDERS,
  ORDER_STATS,
  SEARCH_PRODUCTS,
  STOCK,
  TICKET,
  TICKETS,
  TICKETS_BY_ORDER,
  TICKET_COUNT,
} from '../../../data/sources';
import { UI_STATE } from '../../../data/ui-state';
import { IDLE_VM, Vm, toVm } from '../../../data/vm';

/** S11: the order panel of the open order. The editing draft, hit-adding and price diff are all handled inside the shared view (`ConsoleOrderPanelComponent`'s own `linkedSignal`s); this section only supplies data and the writes. */
@Component({
  selector: 'app-signal-store-order-panel-section',
  imports: [ViewBlockComponent, ConsoleOrderPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (orderId(); as id) {
      <app-view-block
        class="fixed top-0 right-0 z-50 w-full max-w-md"
        data-section="order-panel"
        [loading]="loading(order().state)"
        [error]="error(order().state)"
        (retry)="orderCache.reload(id)"
      >
        <app-console-order-panel
          [orderId]="id"
          [order]="data(order())"
          [ticket]="ticket()"
          [ticketError]="ticketError()"
          [editing]="ui.editing()"
          [hits]="data(hits())"
          [saveState]="save.state()"
          [resendState]="resend.state()"
          (close)="ui.closePanel()"
          (editChange)="ui.setEditing($event)"
          (search)="ui.setSearchText($event)"
          (save)="onSave(id, $event)"
          (resend)="resend.run(id)"
          (openTicket)="ui.openTicket($event)"
        />
      </app-view-block>
    }
  `,
})
export class SignalStoreOrderPanelSection {
  public readonly customerId = input.required<number>();

  protected readonly ui = inject(UI_STATE);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  protected readonly orderId = computed(() => {
    const panel = this.ui.panel();
    return panel?.kind === 'order' ? panel.id : null;
  });

  protected readonly orderCache = inject(ORDER);
  private readonly orderFetched = cacheEntryOptional(
    this.orderCache,
    this.orderId,
  );
  protected readonly order = computed(
    (): Vm<OrderDetail> =>
      toVm('order', this.orderFetched() ?? fetched.loading()),
  );

  private readonly ticketsByOrderCache = inject(TICKETS_BY_ORDER);
  private readonly linkedFetched = cacheEntryOptional(
    this.ticketsByOrderCache,
    this.orderId,
  );
  protected readonly ticketError = computed(() => {
    const f = this.linkedFetched();
    return f ? fieldError(f) : null;
  });
  /** `undefined`: not known yet; `null`: none. */
  protected readonly ticket = computed(() => {
    const f = this.linkedFetched();
    return f?.state === 'ready' ? toLinkedTicket(f.value) : undefined;
  });

  // the editor's search: typed live into `UI_STATE.searchText` (so Add, elsewhere, can clear it), debounced into a
  // fetch — cleared instantly, same as the customer list's own `typeSearch`, so Add's clear doesn't wait out a
  // needless 300ms with the just-added hit still shown next to its new line.
  private readonly debounced = toSignal(
    toObservable(this.ui.searchText).pipe(
      debounce((t) => (t === '' ? of(0) : timer(300))),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  private readonly searchKey = computed(() =>
    this.debounced().trim() ? this.debounced().trim() : null,
  );
  private readonly searchCache = inject(SEARCH_PRODUCTS);
  private readonly hitsFetched = cacheEntryOptional(
    this.searchCache,
    this.searchKey,
  );
  protected readonly hits = computed(() =>
    this.hitsFetched() === undefined
      ? IDLE_VM
      : toVm('searchProducts', this.hitsFetched()!),
  );

  private readonly ordersApi = inject(OrdersApi);
  protected readonly save = createAction(
    (args: { orderId: string; detail: OrderSave }) =>
      this.ordersApi.updateOrder(
        args.orderId,
        args.detail.lines,
        args.detail.reply,
      ),
  );
  protected readonly resend = createAction((orderId: string) =>
    this.ordersApi.resendConfirmation(orderId),
  );

  private readonly ordersCache = inject(ORDERS);
  private readonly orderStatsCache = inject(ORDER_STATS);
  private readonly stockCache = inject(STOCK);
  private readonly ticketCache = inject(TICKET);
  private readonly ticketsCache = inject(TICKETS);
  private readonly ticketCountCache = inject(TICKET_COUNT);

  protected onSave(orderId: string, detail: OrderSave) {
    const before = this.orderCache.peek()(orderId);
    this.save.run({ orderId, detail }, (saved) => {
      this.ui.setEditing(false);
      this.orderCache.set(orderId, saved);
      this.ordersCache.reload(saved.customerId);
      this.orderStatsCache.reload(saved.customerId);
      // the order changed the stock of the skus it touches, old and new (a line dropped from the order frees its stock too)
      const skus = new Set(
        [
          ...saved.lines,
          ...(before?.state === 'ready' ? before.value.lines : []),
        ].map((l) => l.sku),
      );
      skus.forEach((sku) => this.stockCache.reload(sku));
      if (detail.reply) {
        this.ticketCache.reload(detail.reply.ticketId);
        this.ticketsCache.reload(saved.customerId);
        this.ticketCountCache.reload(saved.customerId);
        this.ticketsByOrderCache.reload(orderId);
      }
    });
  }
}
