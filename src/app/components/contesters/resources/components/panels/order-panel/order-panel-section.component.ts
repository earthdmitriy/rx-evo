import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounce, distinctUntilChanged, of, timer } from 'rxjs';
import {
  OrdersApi,
  ProductsApi,
  TicketsApi,
} from '../../../../../../services/contesters';
import { ResourceBlockComponent } from '../../../../../content/resource-block/resource-block.component';
import { ConsoleOrderPanelComponent, OrderSave } from '../../../../shared';
import { createAction } from '../../../data/action';
import { Bus } from '../../../data/bus';
import { toLinkedTicket } from '../../../data/mappers';
import { UiState } from '../../../data/ui-state';

/** S11: the order panel of the open order. The editing draft, hit-adding and price diff are all handled inside the shared view (`ConsoleOrderPanelComponent`'s own `linkedSignal`s); this section only supplies data and the writes. */
@Component({
  selector: 'app-resources-order-panel-section',
  imports: [ResourceBlockComponent, ConsoleOrderPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @if (orderId(); as id) {
      <app-resource-block
        class="fixed top-0 right-0 z-50 w-full max-w-md"
        data-section="order-panel"
        [resource]="order"
      >
        <app-console-order-panel
          [orderId]="id"
          [order]="(order.hasValue() ? order.value() : undefined) ?? null"
          [ticket]="ticket()"
          [ticketError]="linkedTickets.error()"
          [editing]="ui.editing()"
          [hits]="(hits.hasValue() ? hits.value() : undefined) ?? null"
          [saveState]="save.state()"
          [resendState]="resend.state()"
          (close)="ui.closePanel()"
          (editChange)="ui.setEditing($event)"
          (search)="ui.setSearchText($event)"
          (save)="onSave(id, $event)"
          (resend)="resend.run(id)"
          (openTicket)="ui.openTicket($event)"
        />
      </app-resource-block>
    }
  `,
})
export class ResourcesOrderPanelSection {
  public readonly customerId = input.required<number>();
  protected readonly ui = inject(UiState);

  protected readonly orderId = computed(() => {
    const panel = this.ui.panel();
    return panel?.kind === 'order' ? panel.id : undefined;
  });

  private readonly ordersApi = inject(OrdersApi);
  protected readonly order = rxResource({
    params: () => this.orderId(),
    stream: ({ params }) => this.ordersApi.order(params),
  });
  private readonly ticketsApi = inject(TicketsApi);
  private readonly bus = inject(Bus);
  protected readonly linkedTickets = rxResource({
    params: () => {
      const id = this.orderId();
      return id === undefined
        ? undefined
        : { id, v: this.bus.ticketsByOrder() };
    },
    stream: ({ params }) => this.ticketsApi.ticketsByOrder(params.id),
  });
  /** `undefined`: not known yet; `null`: none. */
  protected readonly ticket = computed(() => {
    const rows = this.linkedTickets.hasValue()
      ? this.linkedTickets.value()
      : undefined;
    return rows ? toLinkedTicket(rows) : undefined;
  });

  // the editor's search: typed live into `UiState.searchText` (so Add, elsewhere, can clear it), debounced into a
  // fetch — cleared instantly, same as the customer list's own search, so Add's clear doesn't wait out a needless
  // 300ms with the just-added hit still shown next to its new line.
  private readonly debouncedText = toSignal(
    toObservable(this.ui.searchText).pipe(
      debounce((t) => (t === '' ? of(0) : timer(300))),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  private readonly productsApi = inject(ProductsApi);
  protected readonly hits = rxResource({
    params: () => this.debouncedText().trim() || undefined,
    stream: ({ params }) => this.productsApi.searchProducts(params),
  });

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

  protected onSave(orderId: string, detail: OrderSave) {
    const before = this.order.hasValue() ? this.order.value() : undefined;
    this.save.run({ orderId, detail }, (saved) => {
      this.ui.setEditing(false);
      this.order.set(saved);
      this.bus.bump(this.bus.orders, this.bus.orderStats, this.bus.stock);
      if (detail.reply)
        this.bus.bump(
          this.bus.tickets,
          this.bus.ticketCounts,
          this.bus.ticketsByOrder,
        );
    });
  }
}
