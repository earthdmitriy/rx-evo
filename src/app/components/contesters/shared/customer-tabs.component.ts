import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component'; // @s2-line
import { PartComponent } from './part.component';
import { ACTION_IDLE, ActionState } from './view-state';
import { CartLineVm, NoteVm, OrderRowVm, OrderStatusVm, Part, TabCountersVm, TicketRowVm } from './view-models';

export type CustomerTab = 'orders' | 'cart' | 'tickets' | 'notes';

const TABS: { id: CustomerTab; label: string; count?: (c: TabCountersVm) => Part<number> }[] = [
  { id: 'orders', label: 'Orders', count: (c) => c.orders },
  { id: 'cart', label: 'Cart' },
  { id: 'tickets', label: 'Tickets', count: (c) => c.openTickets },
  { id: 'notes', label: 'Notes' },
];

/**
 * The tab card: the strip (counters as `Part`s from their services; none
 * while `counters` is null) and a slot for the active tab's section.
 */
@Component({
  selector: 'app-console-customer-tabs',
  imports: [PartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card block overflow-hidden' },
  template: `
    <nav class="flex gap-1 overflow-x-auto overflow-y-hidden px-3 shadow-[inset_0_-1px_0_var(--color-slate-200)]" aria-label="Customer sections">
      @for (t of tabs; track t.id) {
        <button
          type="button"
          class="flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors"
          [class]="active() === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'"
          [attr.data-testid]="'tab-' + t.id + '-toggle'"
          [attr.aria-current]="active() === t.id"
          (click)="activeChange.emit(t.id)"
        >
          {{ t.label }}
          @if (t.count && counters(); as c) {
            <app-part (retry)="retryParts.emit()" [part]="t.count(c)" [width]="1">
              <span class="badge badge-neutral">{{ t.count(c).value }}</span>
            </app-part>
          }
        </button>
      }
    </nav>
    <ng-content />
  `,
})
export class ConsoleCustomerTabsComponent {
  // @s2-begin
  /** A failed `Part` of this view asked to be tried again. */
  public readonly retryParts = output<void>();
  // @s2-end
  public readonly active = input.required<CustomerTab>();
  public readonly counters = input<TabCountersVm | null>(null);
  public readonly activeChange = output<CustomerTab>();
  protected readonly tabs = TABS;
}

/** S5: orders. A row opens the order panel. */
@Component({
  selector: 'app-console-orders-tab',
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'data-testid': 'tab-orders', '[attr.data-content]': 'orders() === null ? "none" : orders()!.length ? "shown" : "empty"' },
  template: `
    <div data-part="main">
      <div class="overflow-x-auto" [attr.data-customer-id]="customerId()">
        <table class="table table-hover">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Status</th><th class="num">Items</th><th class="num">Total</th></tr>
          </thead>
          <tbody>
            @for (o of orders() ?? []; track o.orderId) {
              <tr class="cursor-pointer" [attr.data-testid]="'order-' + o.orderId" [attr.data-order-id]="o.orderId" (click)="openOrder.emit(o.orderId)">
                <th class="font-mono text-xs">{{ o.orderId }}</th>
                <td class="whitespace-nowrap">{{ o.date | date: 'MMM d, y' }}</td>
                <td><span class="badge" [class]="badge[o.status]">{{ o.status }}</span></td>
                <td class="num" data-testid="order-items">{{ o.items }}</td>
                <td class="num font-medium text-slate-900" data-testid="order-total">{{ o.total | currency: 'USD' }}</td>
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

/** S6: the cart, read-only. Each line's name and price are `Part`s; the total waits for every price. */
@Component({
  selector: 'app-console-cart-tab',
  imports: [PartComponent, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'data-testid': 'tab-cart', '[attr.data-content]': 'lines() === null ? "none" : lines()!.length ? "shown" : "empty"' },
  template: `
    <div data-part="main">
      <div class="overflow-x-auto" [attr.data-customer-id]="customerId()">
        <table class="table">
          <thead>
            <tr><th>Product</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr>
          </thead>
          <tbody>
            @for (l of lines() ?? []; track l.sku) {
              <tr [attr.data-sku]="l.sku">
                <th>
                  <app-part (retry)="retryParts.emit()" data-testid="line-name" [part]="l.name" [width]="8">{{ l.name.value }}</app-part>
                  <span class="ml-1 font-mono text-xs font-normal text-slate-400">{{ l.sku }}</span>
                </th>
                <td class="num">{{ l.qty }}</td>
                <td class="num"><app-part (retry)="retryParts.emit()" data-testid="line-price" [part]="l.price">{{ l.price.value | currency: 'USD' }}</app-part></td>
                <td class="num"><app-part (retry)="retryParts.emit()" [part]="l.price">{{ l.qty * (l.price.value ?? 0) | currency: 'USD' }}</app-part></td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr><th colspan="3">Cart total</th><td class="num" data-testid="cart-total"><app-part (retry)="retryParts.emit()" [part]="total()" [width]="4">{{ total().value | currency: 'USD' }}</app-part></td></tr>
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
  // @s2-begin
  /** A failed `Part` of this view asked to be tried again. */
  public readonly retryParts = output<void>();
  // @s2-end
  public readonly lines = input<CartLineVm[] | null>(null);
  public readonly customerId = input<number | null>(null);
  /** Ready when every price is (loading until then). */
  protected readonly total = computed((): Part<number> => {
    const lines = this.lines() ?? [];
    if (lines.some((l) => l.price.state === 'error')) return { state: 'error', value: null }; // @s2-line
    if (lines.some((l) => l.price.state === 'loading')) return { state: 'loading', value: null };
    return { state: 'ready', value: lines.reduce((sum, l) => sum + l.qty * (l.price.value ?? 0), 0) };
  });
}

/** S7: tickets. A row opens the ticket panel; the order link opens the order panel. */
@Component({
  selector: 'app-console-tickets-tab',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'data-testid': 'tab-tickets', '[attr.data-content]': 'tickets() === null ? "none" : tickets()!.length ? "shown" : "empty"' },
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
            <span class="font-mono text-xs text-slate-500">{{ t.ticketId }}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-slate-900">{{ t.subject }}</span>
            @if (t.orderId; as orderId) {
              <button type="button" class="font-mono text-xs text-indigo-600 hover:text-indigo-500" [attr.data-testid]="'ticket-order-' + orderId" (click)="$event.stopPropagation(); openOrder.emit(orderId)">{{ orderId }}</button>
            }
            <span class="badge" data-testid="ticket-status" [class]="t.status === 'Open' ? 'badge-bad' : t.status === 'Waiting' ? 'badge-warn' : 'badge-good'">{{ t.status }}</span>
            <span class="w-20 text-right text-xs text-slate-500">{{ t.updated | date: 'MMM d' }}</span>
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

/** S8: internal notes and the Add note form. Authors are `Part`s (agent directory). The draft is kept until the list changes. */
@Component({
  selector: 'app-console-notes-tab',
  imports: [GenericErrorComponent, PartComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'data-testid': 'tab-notes', '[attr.data-content]': 'notes() === null ? "none" : notes()!.length ? "shown" : "empty"' },
  template: `
    <form class="flex flex-col gap-2 p-5 pb-0" (submit)="$event.preventDefault(); add.emit(draft())">
      <textarea class="input min-h-20" placeholder="Add an internal note…" aria-label="New note" data-testid="note-text" [value]="draft()" (input)="draft.set($any($event.target).value)"></textarea>
      <!-- @s2-begin -->
      @if (addState().error) {
        <app-generic-error [error]="addState().error"></app-generic-error>
      }
      <!-- @s2-end -->
      <button type="submit" class="btn btn-primary btn-sm self-end" data-testid="note-add" [disabled]="addState().pending || !draft().trim()">
        {{ addState().pending ? 'Saving…' : 'Save note' }}
      </button>
    </form>
    <div data-part="main">
      <div class="space-y-3 p-5" [attr.data-customer-id]="customerId()">
        @for (n of notes() ?? []; track n.noteId) {
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3" data-testid="note">
            <div class="mb-1 text-xs text-slate-500"><app-part (retry)="retryParts.emit()" class="font-medium text-slate-700" data-testid="note-author" [part]="n.author" [width]="5">{{ n.author.value }}</app-part> · {{ n.at | date: 'MMM d' }}</div>
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
  // @s2-begin
  /** A failed `Part` of this view asked to be tried again. */
  public readonly retryParts = output<void>();
  // @s2-end
  public readonly notes = input<NoteVm[] | null>(null);
  public readonly customerId = input<number | null>(null);
  public readonly addState = input<ActionState>(ACTION_IDLE);
  public readonly add = output<string>();
  /** UI draft: cleared when the notes list changes (a saved note appears), kept on failure. */
  protected readonly draft = linkedSignal<NoteVm[] | null, string>({ source: this.notes, computation: () => '' });
}
