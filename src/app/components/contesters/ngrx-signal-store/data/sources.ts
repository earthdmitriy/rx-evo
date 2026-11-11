import { inject } from '@angular/core';
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
import { createKeyedCache } from './entity-store';

/**
 * Every read of the console, as native NgRx SignalStore keyed caches
 * (`entity-store.ts`'s `createKeyedCache`). The three batch endpoints
 * (`tiers`, `ticketCounts`, `prices`) are read one id per call here: the
 * cache dedupes and shares by id (and cancels a superseded read, R-B1/R-B8),
 * but nothing collects the ids several consumers ask for in the same tick
 * into one batched call — batching is a stage-3 cost this entry does not
 * pay (see the README's Bad).
 */
export const PROFILE = createKeyedCache<number, Agent>(() => {
  const api = inject(SessionApi);
  return () => api.profile();
});
export const NOTIFICATIONS = createKeyedCache<number, AgentNotification[]>(
  () => {
    const api = inject(NotificationsApi);
    return () => api.notifications();
  },
);
export const CUSTOMERS_PAGE = createKeyedCache<string, Page<CustomerHit>>(
  () => {
    const api = inject(CustomersApi);
    return (q) => api.searchCustomers(JSON.parse(q) as CustomerQuery);
  },
);
export const CUSTOMER = createKeyedCache<number, CustomerProfile>(() => {
  const api = inject(CustomersApi);
  return (id) => api.customer(id);
});
export const ORDERS = createKeyedCache<number, OrderRow[]>(() => {
  const api = inject(OrdersApi);
  return (id) => api.orders(id);
});
export const ORDER_STATS = createKeyedCache<number, OrderStats>(() => {
  const api = inject(OrdersApi);
  return (id) => api.orderStats(id);
});
export const ACTIVITY = createKeyedCache<number, ActivityEntry[]>(() => {
  const api = inject(ActivityApi);
  return (id) => api.activity(id);
});
export const CART = createKeyedCache<number, CartLine[]>(() => {
  const api = inject(CartApi);
  return (id) => api.cart(id);
});
export const TICKETS = createKeyedCache<number, TicketRow[]>(() => {
  const api = inject(TicketsApi);
  return (id) => api.tickets(id);
});
export const TICKETS_BY_ORDER = createKeyedCache<string, TicketRow[]>(() => {
  const api = inject(TicketsApi);
  return (id) => api.ticketsByOrder(id);
});
export const TICKET = createKeyedCache<string, TicketThread>(() => {
  const api = inject(TicketsApi);
  return (id) => api.ticket(id);
});
export const NOTES = createKeyedCache<number, Note[]>(() => {
  const api = inject(NotesApi);
  return (id) => api.notes(id);
});
export const ORDER = createKeyedCache<string, OrderDetail>(() => {
  const api = inject(OrdersApi);
  return (id) => api.order(id);
});
export const SHIPMENT = createKeyedCache<string, Shipment>(() => {
  const api = inject(ShipmentsApi);
  return (id) => api.shipment(id);
});
/** Public: kept across sessions (never cleared on logout). */
export const SEARCH_PRODUCTS = createKeyedCache<string, Product[]>(() => {
  const api = inject(ProductsApi);
  return (text) => api.searchProducts(text);
});

export const AGENT_NAME = createKeyedCache<number, AgentRef>(() => {
  const api = inject(AgentsApi);
  return (id) => api.agent(id);
});
export const TIER = createKeyedCache<number, CustomerTier>(() => {
  const api = inject(CustomersApi);
  return (id) => api.tiers([id]).pipe(map(([t]) => t));
});
export const TICKET_COUNT = createKeyedCache<number, TicketCount>(() => {
  const api = inject(TicketsApi);
  return (id) => api.ticketCounts([id]).pipe(map(([c]) => c));
});
/** Public: kept across sessions. */
export const PRODUCT_NAME = createKeyedCache<string, Product>(() => {
  const api = inject(ProductsApi);
  return (sku) => api.product(sku);
});
export const PRICE = createKeyedCache<string, Price>(() => {
  const api = inject(PricingApi);
  return (sku) => api.prices([sku]).pipe(map(([p]) => p));
});
export const STOCK = createKeyedCache<string, Stock>(() => {
  const api = inject(InventoryApi);
  return (sku) => api.stock(sku);
});

/** Every cache bound to the user: cleared on logout (products, prices, stock and product search are public, not here). */
export const SESSION_CACHES = [
  PROFILE,
  NOTIFICATIONS,
  CUSTOMERS_PAGE,
  CUSTOMER,
  ORDERS,
  ORDER_STATS,
  ACTIVITY,
  CART,
  TICKETS,
  TICKETS_BY_ORDER,
  TICKET,
  NOTES,
  ORDER,
  SHIPMENT,
  AGENT_NAME,
  TIER,
  TICKET_COUNT,
] as const;
