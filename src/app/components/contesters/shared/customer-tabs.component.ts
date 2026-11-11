import { CurrencyPipe, DatePipe, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component'; // @s2-line
import { ACTION_IDLE, ActionState } from './view-state';
import {
  CartLineVm,
  NoteVm,
  OrderRowVm,
  OrderStatusVm,
  TicketRowVm,
} from './view-models';
import {
  AGENT_NAME_FIELD,
  CART_TOTAL_FIELD,
  KPI_FIELD,
  LINE_TOTAL_FIELD,
  OPEN_TICKETS_FIELD,
  PRODUCT_NAME_FIELD,
  PRODUCT_PRICE_FIELD,
} from './fields';

export type CustomerTab = 'orders' | 'cart' | 'tickets' | 'notes';

const TABS: { id: CustomerTab; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'cart', label: 'Cart' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'notes', label: 'Notes' },
];

/**
 * The tab card: the strip (the badges are field components by customer id,
 * `KPI_FIELD` and `OPEN_TICKETS_FIELD`: no badge until they arrive) and a slot
 * for the active tab's section.
 */
@Component({
  selector: 'app-console-customer-tabs',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card block overflow-hidden' },
  template: `
    <nav
      class="flex gap-1 overflow-x-auto overflow-y-hidden px-3 shadow-[inset_0_-1px_0_var(--color-slate-200)]"
      aria-label="Customer sections"
    >
      @for (t of tabs; track t.id) {
        <button
          type="button"
          class="flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors"
          [class]="
            active() === t.id
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          "
          [attr.data-testid]="'tab-' + t.id + '-toggle'"
          [attr.aria-current]="active() === t.id"
          (click)="activeChange.emit(t.id)"
        >
          {{ t.label }}
          @if (t.id === 'orders' || t.id === 'tickets') {
            <span
              class="inline-block min-w-5"
              [attr.data-testid]="'tab-' + t.id + '-count'"
            >
              @if (customerId() !== null) {
                @if (t.id === 'orders') {
                  <ng-container
                    *ngComponentOutlet="
                      kpi;
                      inputs: { customerId: customerId()!, kind: 'orderCount' }
                    "
                  />
                } @else {
                  <ng-container
                    *ngComponentOutlet="
                      openTicketsField;
                      inputs: { customerId: customerId()!, variant: 'badge' }
                    "
                  />
                }
              }
            </span>
          }
        </button>
      }
    </nav>
    <ng-content />
  `,
})
export class ConsoleCustomerTabsComponent {
  public readonly active = input.required<CustomerTab>();
  /** The selected customer: the badges are looked up by it. */
  public readonly customerId = input<number | null>(null);
  /** Shows the number of orders (orders service): supplied by the implementation (`KPI_FIELD`, kind `orderCount`). */
  protected readonly kpi = inject(KPI_FIELD);
  /** Shows the open tickets (tickets service): supplied by the implementation (`OPEN_TICKETS_FIELD`, variant `badge`). */
  protected readonly openTicketsField = inject(OPEN_TICKETS_FIELD);
  public readonly activeChange = output<CustomerTab>();
  protected readonly tabs = TABS;
}

/** S5: orders. A row opens the order panel. */
@Component({
  selector: 'app-console-orders-tab',
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    'data-testid': 'tab-orders',
    '[attr.data-content]':
      'orders() === null ? "none" : orders()!.length ? "shown" : "empty"',
  },
  template: `
    <div data-part="main">
      <div class="overflow-x-auto" [attr.data-customer-id]="customerId()">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Status</th>
              <th class="num">Items</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders() ?? []; track o.orderId) {
              <tr
                class="cursor-pointer"
                [attr.data-testid]="'order-' + o.orderId"
                [attr.data-order-id]="o.orderId"
                (click)="openOrder.emit(o.orderId)"
              >
                <th class="font-mono text-xs">{{ o.orderId }}</th>
                <td class="whitespace-nowrap">
                  {{ o.date | date: 'MMM d, y' }}
                </td>
                <td>
                  <span class="badge" [class]="badge[o.status]">{{
                    o.status
                  }}</span>
                </td>
                <td class="num" data-testid="order-items">{{ o.items }}</td>
                <td
                  class="num font-medium text-slate-900"
                  data-testid="order-total"
                >
                  {{ o.total | currency: 'USD' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (orders() && !orders()!.length) {
        <div class="empty-state">No orders yet.</div>
      }
    </div>
  `,
})
export class ConsoleOrdersTabComponent {
  public readonly orders = input<OrderRowVm[] | null>(null);
  public readonly customerId = input<number | null>(null);
  public readonly openOrder = output<string>();
  protected readonly badge: Record<OrderStatusVm, string> = {
    Processing: 'badge-warn',
    Shipped: 'badge-info',
    Delivered: 'badge-good',
    Refunded: 'badge-neutral',
  };
}

/** S6: the cart, read-only. Name, price and line total are field components by sku (`PRODUCT_NAME_FIELD`, `PRODUCT_PRICE_FIELD`, `LINE_TOTAL_FIELD`), the cart total one by the lines (`CART_TOTAL_FIELD`); each is empty until its value is known. */
@Component({
  selector: 'app-console-cart-tab',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    'data-testid': 'tab-cart',
    '[attr.data-content]':
      'lines() === null ? "none" : lines()!.length ? "shown" : "empty"',
  },
  template: `
    <div data-part="main">
      <div class="overflow-x-auto" [attr.data-customer-id]="customerId()">
        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th class="num">Qty</th>
              <th class="num">Price</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (l of lines() ?? []; track l.sku) {
              <tr [attr.data-sku]="l.sku">
                <th>
                  <span class="inline-block min-w-24" data-testid="line-name"
                    ><ng-container
                      *ngComponentOutlet="productName; inputs: { sku: l.sku }"
                  /></span>
                  <span
                    class="ml-1 font-mono text-xs font-normal text-slate-400"
                    >{{ l.sku }}</span
                  >
                </th>
                <td class="num">{{ l.qty }}</td>
                <td class="num">
                  <span class="inline-block min-w-12" data-testid="line-price"
                    ><ng-container
                      *ngComponentOutlet="productPrice; inputs: { sku: l.sku }"
                  /></span>
                </td>
                <td class="num">
                  <span class="inline-block min-w-12" data-testid="line-total"
                    ><ng-container
                      *ngComponentOutlet="
                        lineTotal;
                        inputs: { sku: l.sku, qty: l.qty }
                      "
                  /></span>
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3">Cart total</th>
              <td class="num" data-testid="cart-total">
                <span class="inline-block min-w-16"
                  ><ng-container
                    *ngComponentOutlet="
                      cartTotal;
                      inputs: { lines: lines() ?? [] }
                    "
                /></span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      @if (lines() && !lines()!.length) {
        <div class="empty-state">The cart is empty.</div>
      }
    </div>
  `,
})
export class ConsoleCartTabComponent {
  public readonly lines = input<CartLineVm[] | null>(null);
  /** Shows the product name by sku: supplied by the implementation (`PRODUCT_NAME_FIELD`). */
  protected readonly productName = inject(PRODUCT_NAME_FIELD);
  /** Show the price, the line total and the cart total: supplied by the implementation. */
  protected readonly productPrice = inject(PRODUCT_PRICE_FIELD);
  protected readonly lineTotal = inject(LINE_TOTAL_FIELD);
  protected readonly cartTotal = inject(CART_TOTAL_FIELD);
  public readonly customerId = input<number | null>(null);
}

/** S7: tickets. A row opens the ticket panel; the order link opens the order panel. */
@Component({
  selector: 'app-console-tickets-tab',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    'data-testid': 'tab-tickets',
    '[attr.data-content]':
      'tickets() === null ? "none" : tickets()!.length ? "shown" : "empty"',
  },
  template: `
    <div data-part="main">
      <ul [attr.data-customer-id]="customerId()">
        @for (t of tickets() ?? []; track t.ticketId) {
          <li
            class="flex cursor-pointer items-center gap-3 border-t border-slate-100 px-5 py-3 first:border-t-0 hover:bg-slate-50/70"
            [attr.data-testid]="'ticket-' + t.ticketId"
            [attr.data-ticket-id]="t.ticketId"
            (click)="openTicket.emit(t.ticketId)"
          >
            <span class="font-mono text-xs text-slate-500">{{
              t.ticketId
            }}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-slate-900">{{
              t.subject
            }}</span>
            @if (t.orderId; as orderId) {
              <button
                type="button"
                class="font-mono text-xs text-indigo-600 hover:text-indigo-500"
                [attr.data-testid]="'ticket-order-' + orderId"
                (click)="$event.stopPropagation(); openOrder.emit(orderId)"
              >
                {{ orderId }}
              </button>
            }
            <span
              class="badge"
              data-testid="ticket-status"
              [class]="
                t.status === 'Open'
                  ? 'badge-bad'
                  : t.status === 'Waiting'
                    ? 'badge-warn'
                    : 'badge-good'
              "
              >{{ t.status }}</span
            >
            <span class="w-20 text-right text-xs text-slate-500">{{
              t.updated | date: 'MMM d'
            }}</span>
          </li>
        }
      </ul>
      @if (tickets() && !tickets()!.length) {
        <div class="empty-state">No tickets.</div>
      }
    </div>
  `,
})
export class ConsoleTicketsTabComponent {
  public readonly tickets = input<TicketRowVm[] | null>(null);
  public readonly customerId = input<number | null>(null);
  public readonly openTicket = output<string>();
  public readonly openOrder = output<string>();
}

/** S8: internal notes and the Add note form. Authors are a field component by agent id (`AGENT_NAME_FIELD`, the agent directory). The draft is kept until the list changes. */
@Component({
  selector: 'app-console-notes-tab',
  imports: [GenericErrorComponent, DatePipe, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    'data-testid': 'tab-notes',
    '[attr.data-content]':
      'notes() === null ? "none" : notes()!.length ? "shown" : "empty"',
  },
  template: `
    <form
      class="flex flex-col gap-2 p-5 pb-0"
      (submit)="$event.preventDefault(); add.emit(draft())"
    >
      <textarea
        class="input min-h-20"
        placeholder="Add an internal note…"
        aria-label="New note"
        data-testid="note-text"
        [value]="draft()"
        (input)="draft.set($any($event.target).value)"
      ></textarea>
      <!-- @s2-begin -->
      @if (addState().error) {
        <app-generic-error [error]="addState().error"></app-generic-error>
      }
      <!-- @s2-end -->
      <button
        type="submit"
        class="btn btn-primary btn-sm self-end"
        data-testid="note-add"
        [disabled]="addState().pending || !draft().trim()"
      >
        {{ addState().pending ? 'Saving…' : 'Save note' }}
      </button>
    </form>
    <div data-part="main">
      <div class="space-y-3 p-5" [attr.data-customer-id]="customerId()">
        @for (n of notes() ?? []; track n.noteId) {
          <div
            class="rounded-lg border border-slate-200 bg-slate-50 p-3"
            data-testid="note"
          >
            <div class="mb-1 text-xs text-slate-500">
              <span
                class="inline-block min-w-12 font-medium text-slate-700"
                data-testid="note-author"
                ><ng-container
                  *ngComponentOutlet="
                    agentName;
                    inputs: { agentId: n.authorId }
                  "
              /></span>
              · {{ n.at | date: 'MMM d' }}
            </div>
            <p class="text-sm text-slate-700">{{ n.text }}</p>
          </div>
        }
      </div>
      @if (notes() && !notes()!.length) {
        <div class="empty-state">No notes yet.</div>
      }
    </div>
  `,
})
export class ConsoleNotesTabComponent {
  public readonly notes = input<NoteVm[] | null>(null);
  /** Shows the name of an agent (agent directory): supplied by the implementation (`AGENT_NAME_FIELD`). */
  protected readonly agentName = inject(AGENT_NAME_FIELD);
  public readonly customerId = input<number | null>(null);
  public readonly addState = input<ActionState>(ACTION_IDLE);
  public readonly add = output<string>();
  /** UI draft: cleared when the notes list changes (a saved note appears), kept on failure. */
  protected readonly draft = linkedSignal<NoteVm[] | null, string>({
    source: this.notes,
    computation: () => '',
  });
}
