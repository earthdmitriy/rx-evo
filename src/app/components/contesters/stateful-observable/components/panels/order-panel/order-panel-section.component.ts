import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, filter, map, tap } from 'rxjs';
import {
  OrderLineChange,
  OrdersApi,
  ProductsApi,
} from '../../../../../../services/contesters';
import { StatefulBlockComponent } from '../../../../../content/stateful-block/stateful-block.component';
import { ConsoleOrderPanelComponent, OrderSave } from '../../../../shared';
import { statefulObservable } from '../../../lib';
import {
  OPEN_TICKETS_BY_CUSTOMER,
  ORDER_BY_ID,
  ORDER_STATS_BY_CUSTOMER,
  ORDERS_BY_CUSTOMER,
  STOCK_BY_SKU,
  TICKET_BY_ID,
  TICKETS_BY_CUSTOMER,
  TICKETS_BY_ORDER,
} from '../../../sources/lookups';
import { action } from '../../../utils/action';
import { linkedTicketOf, toOrderVm } from '../../../vm/vm';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * S11: the order is the own data of the view. The line names and the price,
 * the stock and the Add button of the editor's hits are field components of
 * the page; the linked ticket (tickets service) is an input of its own.
 */
@Component({
  selector: 'app-order-panel-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleOrderPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block
      class="fixed top-0 right-0 z-50 w-full max-w-md"
      data-section="order-panel"
      [stream]="order"
    >
      @let linkedTicket = linked.value$ | async;
      <app-console-order-panel
        [orderId]="orderId()"
        [order]="order.value$ | async"
        [ticket]="linkedTicket ? linkedTicket.ticket : undefined"
        [ticketError]="linked.error$ | async"
        [editing]="editing()"
        [hits]="searchText() === null ? null : (hitsSlot.value$ | async)"
        [saveState]="{
          pending: !!(updateOrder.result.pending$ | async),
          error: updateOrder.result.error$ | async,
        }"
        [resendState]="{
          pending: !!(resend.result.pending$ | async),
          error: resend.result.error$ | async,
        }"
        (close)="close.emit()"
        (editChange)="setEditing($event)"
        (search)="text.set($event)"
        (save)="save($event)"
        (resend)="resend.call(orderId())"
        (openTicket)="openTicket.emit($event)"
      />
    </app-stateful-block>
  `,
})
export class OrderPanelSectionComponent {
  public readonly orderId = input.required<string>();
  public readonly close = output<void>();
  public readonly openTicket = output<string>();

  /** Edit mode and the product search text are the panel's own; another order starts over. */
  protected readonly editing = linkedSignal<string, boolean>({
    source: this.orderId,
    computation: () => false,
  });
  protected readonly text = linkedSignal<string, string>({
    source: this.orderId,
    computation: () => '',
  });
  /** The catalog search text: only while editing, `null` for an empty text. */
  protected readonly searchText = computed(() => {
    const text = this.text().trim();
    return this.editing() && text ? text : null;
  });

  private readonly orders = inject(OrdersApi);
  private readonly products = inject(ProductsApi);

  private readonly orderOf = inject(ORDER_BY_ID);
  private readonly ticketsOfOrder = inject(TICKETS_BY_ORDER);

  /** The order: the order id is the input, the results are cached in the factory (only this panel shows and reloads it). */
  protected readonly order = this.orderOf
    .project(toObservable(this.orderId))
    .pipeValue(map(toOrderVm));
  /** The product search: the text is UI state, so it is this node's input and cache key. Only a search text asks (an empty text does not): the input filters `null` out; the template shows no hits for it. */
  protected readonly hitsSlot = statefulObservable({
    // the editor's search is debounced like the list's (R-L4)
    input: toObservable(this.searchText).pipe(
      filter((text) => text !== null),
      debounceTime(SEARCH_DEBOUNCE_MS),
    ),
    loader: (text) => this.products.searchProducts(text),
    cacheKey: (text) => [text],
    name: 'orderPanelHits',
  });

  /** R-J5: `ticket` is `undefined` until the answer, `null` when the order has no ticket. The tickets of the order are shared (the ticket panel's reply reloads the same entry). */
  protected readonly linked = this.ticketsOfOrder
    .project(toObservable(this.orderId))
    .pipeValue(map((tickets) => ({ ticket: linkedTicketOf(tickets) })));
  /**
   * After a write the streams that show what it changed are reloaded (R-W3):
   * the counters other services keep (`orderStats`, `ticketCounts`) are among
   * them. A factory entry is shared by every view of that id, so one reload
   * refreshes them all.
   */
  protected readonly updateOrder = (() => {
    const orderStats = inject(ORDER_STATS_BY_CUSTOMER);
    const ordersOf = inject(ORDERS_BY_CUSTOMER);
    const ticket = inject(TICKET_BY_ID);
    const ticketsOf = inject(TICKETS_BY_CUSTOMER);
    const openTickets = inject(OPEN_TICKETS_BY_CUSTOMER);
    const stockOf = inject(STOCK_BY_SKU);
    return action(
      'updateOrder',
      ({
        orderId,
        lines,
        reply,
        before,
      }: {
        orderId: string;
        lines: OrderLineChange[];
        reply?: { ticketId: string; text: string };
        /** The skus of the order before the change: a dropped line frees its stock too. */
        before: readonly string[];
      }) =>
        this.orders.updateOrder(orderId, lines, reply).pipe(
          tap((saved) => {
            this.editing.set(false);
            this.order.reload();
            ordersOf.get(saved.customerId).reload();
            orderStats.get(saved.customerId).reload();
            // the order changed the stock of the skus it touches, old and new (R-W10)
            new Set([...before, ...saved.lines.map((l) => l.sku)]).forEach(
              (sku) => stockOf.get(sku).reload(),
            );
            if (reply) {
              ticket.get(reply.ticketId).reload();
              ticketsOf.get(saved.customerId).reload();
              openTickets.get(saved.customerId).reload();
              this.ticketsOfOrder.get(saved.orderId).reload();
            }
          }),
        ),
    );
  })();
  protected readonly resend = action('resendConfirmation', (orderId: string) =>
    this.orders.resendConfirmation(orderId),
  );

  protected setEditing(editing: boolean) {
    this.editing.set(editing);
    this.text.set('');
  }

  /** The shown order's skus, read at Save: the stock they hold changes with the write. */
  private readonly shownSkus = toSignal(
    this.order.value$.pipe(
      filter((order) => !!order),
      map((order) => order.lines.map((l) => l.sku)),
    ),
    { initialValue: [] },
  );

  protected save({ lines, reply }: OrderSave) {
    this.updateOrder.call({
      orderId: this.orderId(),
      lines,
      reply,
      before: this.shownSkus(),
    });
  }
}
