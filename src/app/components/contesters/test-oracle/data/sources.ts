import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import {
  ActivityApi,
  ActivityEntry,
  Agent,
  AgentNotification,
  AgentRef,
  AgentsApi,
  CartApi,
  CartLine,
  CustomerHit,
  CustomerProfile,
  CustomerQuery,
  CustomersApi,
  CustomerTier,
  InventoryApi,
  Note,
  NotesApi,
  NotificationsApi,
  OrderDetail,
  OrderRow,
  OrdersApi,
  OrderStats,
  Page,
  Price,
  PricingApi,
  Product,
  ProductsApi,
  SessionApi,
  Shipment,
  ShipmentsApi,
  Stock,
  TicketCount,
  TicketRow,
  TicketsApi,
  TicketThread,
} from '../../../../services/contesters';
import { defect } from './defects';
import { EntityCache } from './entity-cache';
import { Query } from './query';

/**
 * Every read of the console: keyed queries for whole responses, entity
 * caches for the batched services (one entry per id, many ids per call).
 */
@Injectable({ providedIn: 'root' })
export class ConsoleSources {
  private readonly sessionApi = inject(SessionApi);
  private readonly agentsApi = inject(AgentsApi);
  private readonly notificationsApi = inject(NotificationsApi);
  private readonly customersApi = inject(CustomersApi);
  private readonly ordersApi = inject(OrdersApi);
  private readonly shipmentsApi = inject(ShipmentsApi);
  private readonly cartApi = inject(CartApi);
  private readonly productsApi = inject(ProductsApi);
  private readonly pricingApi = inject(PricingApi);
  private readonly inventoryApi = inject(InventoryApi);
  private readonly ticketsApi = inject(TicketsApi);
  private readonly notesApi = inject(NotesApi);
  private readonly activityApi = inject(ActivityApi);

  // ---------- queries: one request per key ----------

  public readonly profile = new Query<void, Agent>({
    key: 'profile',
    fetch: () => this.sessionApi.profile(),
  });
  public readonly notifications = new Query<void, AgentNotification[]>({
    key: 'notifications',
    fetch: () => this.notificationsApi.notifications(),
    pollMs: 30_000,
    keepOnError: true,
  });
  public readonly customers = new Query<CustomerQuery, Page<CustomerHit>>({
    key: 'customers',
    fetch: (q) => this.customersApi.searchCustomers(q),
  });
  public readonly customer = new Query<number, CustomerProfile>({
    key: 'customer',
    fetch: (id) => this.customersApi.customer(id),
  });
  public readonly orders = new Query<number, OrderRow[]>({
    key: 'orders',
    fetch: (id) => this.ordersApi.orders(id),
  });
  public readonly orderStats = new Query<number, OrderStats>({
    key: 'orderStats',
    fetch: (id) => this.ordersApi.orderStats(id),
  });
  public readonly activity = new Query<number, ActivityEntry[]>({
    key: 'activity',
    fetch: (id) => this.activityApi.activity(id),
    pollMs: 20_000,
    keepOnError: true,
  });
  public readonly cart = new Query<number, CartLine[]>({
    key: 'cart',
    fetch: (id) => this.cartApi.cart(id),
  });
  public readonly tickets = new Query<number, TicketRow[]>({
    key: 'tickets',
    fetch: (id) => this.ticketsApi.tickets(id),
  });
  public readonly ticketsByOrder = new Query<string, TicketRow[]>({
    key: 'ticketsByOrder',
    fetch: (id) => this.ticketsApi.ticketsByOrder(id),
  });
  public readonly ticket = new Query<string, TicketThread>({
    key: 'ticket',
    fetch: (id) => this.ticketsApi.ticket(id),
  });
  public readonly notes = new Query<number, Note[]>({
    key: 'notes',
    fetch: (id) => this.notesApi.notes(id),
  });
  public readonly order = new Query<string, OrderDetail>({
    key: 'order',
    fetch: (id) => this.ordersApi.order(id),
  });
  public readonly shipment = new Query<string, Shipment>({
    key: 'shipment',
    fetch: (id) => this.shipmentsApi.shipment(id),
  });
  /** Public: the same for everyone, kept across sessions. */
  public readonly searchProducts = new Query<string, Product[]>({
    key: 'searchProducts',
    fetch: (text) => this.productsApi.searchProducts(text),
  });

  // ---------- entities: cached per id (tiers, ticketCounts and prices are batch endpoints; agent, product and stock take one id) ----------

  /** No batch endpoint: one call per agent. */
  public readonly agents = new EntityCache<number, AgentRef>({
    key: 'agent',
    fetch: ([id]) => this.agentsApi.agent(id).pipe(map((a) => [a])),
    idOf: (a) => a.agentId,
    batched: false,
  });
  public readonly tiers = new EntityCache<number, CustomerTier>({
    key: 'tiers',
    fetch: (ids) => this.customersApi.tiers(ids),
    idOf: (t) => t.customerId,
  });
  public readonly ticketCounts = new EntityCache<number, TicketCount>({
    key: 'ticketCounts',
    fetch: (ids) => this.ticketsApi.ticketCounts(ids),
    idOf: (c) => c.customerId,
  });
  /** Public: kept across sessions. */
  public readonly products = new EntityCache<string, Product>({
    key: 'product',
    fetch: ([sku]) => this.productsApi.product(sku).pipe(map((p) => [p])),
    idOf: (p) => p.sku,
    batched: false,
  });
  public readonly prices = new EntityCache<string, Price>({
    key: 'prices',
    fetch: (skus) => this.pricingApi.prices(skus),
    idOf: (p) => p.sku,
  });
  public readonly stock = new EntityCache<string, Stock>({
    key: 'stock',
    fetch: ([sku]) => this.inventoryApi.stock(sku).pipe(map((s) => [s])),
    idOf: (s) => s.sku,
    batched: false,
  });

  /** Everything bound to the user: forgotten on logout (products, prices, stock and product search are public). */
  public clearSession() {
    [
      this.profile,
      this.notifications,
      this.customers,
      this.customer,
      this.orders,
      this.orderStats,
      this.activity,
      this.cart,
      this.tickets,
      this.ticketsByOrder,
      this.ticket,
      this.notes,
      this.order,
      this.shipment,
    ].forEach((q) => q.clear());
    [this.agents, this.tiers, this.ticketCounts].forEach((e) => e.clear());
    if (defect('clear-public')) {
      [this.products, this.prices, this.stock].forEach((e) => e.clear());
      this.searchProducts.clear();
    }
  }
}
