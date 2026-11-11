import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import * as mock from './layout-draft.mock';
import { SignInDraftComponent } from './sign-in-draft.component';

type Tab = 'orders' | 'cart' | 'tickets' | 'notes';
type SortKey = 'name' | 'lastOrder' | 'spend' | 'openTickets';

/**
 * Temporary layout draft of the support console (contesters). Static data and
 * UI-only signals (tab, drawer, selection); no APIs, no dataflow.
 */
@Component({
  selector: 'app-layout-draft',
  imports: [CurrencyPipe, SignInDraftComponent],
  templateUrl: './layout-draft.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutDraftComponent {
  protected readonly m = mock;
  protected readonly tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'orders', label: 'Orders', count: mock.ORDERS.length },
    { id: 'cart', label: 'Cart', count: mock.CART.lines.length },
    { id: 'tickets', label: 'Tickets', count: mock.TICKETS.length },
    { id: 'notes', label: 'Notes' },
  ];

  protected readonly loggedIn = signal(true);
  protected readonly selectedId = signal<number | null>(1041);
  protected readonly tab = signal<Tab>('orders');
  protected readonly openOrder = signal<string | null>(null);
  protected readonly notificationsOpen = signal(false);

  protected readonly sortOptions: { id: SortKey; label: string }[] = [
    { id: 'name', label: 'Name' },
    { id: 'lastOrder', label: 'Last order' },
    { id: 'spend', label: 'Lifetime spend' },
    { id: 'openTickets', label: 'Open tickets' },
  ];
  protected readonly sortBy = signal<SortKey>('lastOrder');
  protected readonly sortDesc = signal(true);
  protected readonly customers = computed(() => {
    const key = this.sortBy();
    const dir = this.sortDesc() ? -1 : 1;
    return [...mock.CUSTOMERS].sort((a, b) => {
      const x = a[key];
      const y = b[key];
      return (
        (typeof x === 'string'
          ? x.localeCompare(y as string)
          : x - (y as number)) * dir
      );
    });
  });

  /**
   * Back-office sections. The agent works in Customers (orders, cart and
   * tickets live inside the customer); the rest belong to other departments.
   */
  protected readonly nav: { label: string; owner?: string }[] = [
    { label: 'Customers' },
    { label: 'Catalog', owner: 'Merchandising' },
    { label: 'Inventory', owner: 'Warehouse' },
    { label: 'Promotions', owner: 'Marketing' },
    { label: 'Finance', owner: 'Accounting' },
    { label: 'Reports', owner: 'Management' },
    { label: 'Settings', owner: 'Admin' },
  ];

  // ---------- order panel (UI-only edit state) ----------
  protected readonly order = computed(
    () => mock.ORDERS.find((o) => o.id === this.openOrder()) ?? null,
  );
  /** Items can change only before the order ships. */
  protected readonly editable = computed(
    () => this.order()?.status === 'Processing',
  );
  protected readonly ticket = computed(
    () => mock.TICKETS.find((t) => t.orderId === this.openOrder()) ?? null,
  );
  protected readonly editing = signal(false);
  protected readonly lines = signal<mock.OrderLine[]>(mock.ORDER_LINES);
  protected readonly catalogQuery = signal('');
  protected readonly catalogHits = computed(() => {
    const q = this.catalogQuery().trim().toLowerCase();
    return q
      ? mock.CATALOG.filter((p) => p.product.toLowerCase().includes(q)).slice(
          0,
          4,
        )
      : [];
  });
  protected readonly originalTotal = sum(mock.ORDER_LINES);
  protected readonly total = computed(() => sum(this.lines()));

  protected readonly openTicket = signal<string | null>(null);
  protected readonly ticketOpen = computed(
    () => mock.TICKETS.find((t) => t.id === this.openTicket()) ?? null,
  );

  protected open(orderId: string | null) {
    this.openTicket.set(null);
    this.openOrder.set(orderId);
    this.editing.set(false);
    this.lines.set(mock.ORDER_LINES);
    this.catalogQuery.set('');
  }

  protected setQty(sku: string, qty: number) {
    this.lines.update((ls) =>
      qty > 0
        ? ls.map((l) => (l.sku === sku ? { ...l, qty } : l))
        : ls.filter((l) => l.sku !== sku),
    );
  }

  protected add(p: (typeof mock.CATALOG)[number]) {
    const existing = this.lines().find((l) => l.sku === p.sku);
    if (existing) this.setQty(p.sku, existing.qty + 1);
    else
      this.lines.update((ls) => [
        ...ls,
        { product: p.product, sku: p.sku, qty: 1, price: p.price },
      ]);
    this.catalogQuery.set('');
  }

  protected readonly customer = computed(
    () => mock.CUSTOMERS.find((c) => c.id === this.selectedId()) ?? null,
  );

  protected readonly tierBadge: Record<mock.Tier, string> = {
    VIP: 'badge-accent',
    Regular: 'badge-neutral',
    New: 'badge-info',
  };
  protected readonly orderBadge: Record<mock.OrderStatus, string> = {
    Delivered: 'badge-good',
    Shipped: 'badge-info',
    Processing: 'badge-warn',
    Refunded: 'badge-neutral',
  };
  protected readonly shipmentBadge: Record<mock.ShipmentState, string> = {
    'In transit': 'badge-info',
    Delayed: 'badge-warn',
    'Label created': 'badge-neutral',
  };
  protected readonly ticketBadge: Record<mock.TicketStatus, string> = {
    Open: 'badge-bad',
    Waiting: 'badge-warn',
    Solved: 'badge-good',
  };
}

const sum = (lines: mock.OrderLine[]) =>
  lines.reduce((t, l) => t + l.qty * l.price, 0);
