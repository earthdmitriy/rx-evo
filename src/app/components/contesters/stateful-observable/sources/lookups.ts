import { inject, InjectionToken } from '@angular/core';
import { map } from 'rxjs';
import {
  ActivityApi,
  AgentsApi,
  CartApi,
  CustomersApi,
  InventoryApi,
  NotesApi,
  OrdersApi,
  PricingApi,
  ProductsApi,
  ShipmentsApi,
  TicketsApi,
} from '../../../../services/contesters';
import { MAX_BATCH } from '../../../../services/contesters/console.types';
import {
  statefulObservableBatchFactory,
  statefulObservableFactory,
} from '../lib';
import { LOGGED_IN } from './session';

/** Ids asked within this window (0: the same tick, one render pass) go into one call of a batch endpoint. */
const BATCH_TIME_MS = 0;

/**
 * Every server entity addressed by an id is a factory token, one atomic token
 * each. A factory returns one shared stream per id, so a header KPI and a tab
 * badge that show the same customer's open tickets read the same stream, and
 * any component can reload the entry it changed. Three endpoints answer many
 * ids per call (`tiers`, `ticketCounts`, `prices`: up to 20): their tokens are
 * batch factories, which collect the ids asked within a few milliseconds into
 * one call and give each id its item. The others (`agent`, `product`, `stock`)
 * take one id and have plain factories. What is keyed by UI state (the
 * customer list's query, the editor's search text) is not an entity and stays
 * in its component.
 *
 * Streams of user data have `active` on the session: going inactive drops
 * the cached results of every entry, kept ones (`refCount: false`) included,
 * so nothing needs to be reset by hand on logout.
 */
const lookup = <F>(name: string, factory: () => F) =>
  new InjectionToken<F>(name, { providedIn: 'root', factory });

// ---------- by customer ----------

export const CUSTOMER_BY_ID = lookup('customerById', () => {
  const api = inject(CustomersApi);
  return statefulObservableFactory({
    loader: (id: number) => api.customer(id),
    active: inject(LOGGED_IN),
    cacheSize: 200,
  });
});

export const OPEN_TICKETS_BY_CUSTOMER = lookup('openTicketsByCustomer', () => {
  const api = inject(TicketsApi);
  return statefulObservableBatchFactory({
    loader: (ids: readonly number[]) => api.ticketCounts([...ids]),
    idOf: (count) => count.customerId,
    batchTime: BATCH_TIME_MS,
    maxBatchSize: MAX_BATCH,
    active: inject(LOGGED_IN),
    refCount: false,
    cacheSize: 200,
  });
});

export const ORDER_STATS_BY_CUSTOMER = lookup('orderStatsByCustomer', () => {
  const api = inject(OrdersApi);
  return statefulObservableFactory({
    loader: (id: number) => api.orderStats(id),
    active: inject(LOGGED_IN),
    cacheSize: 200,
  });
});

export const ORDERS_BY_CUSTOMER = lookup('ordersByCustomer', () => {
  const api = inject(OrdersApi);
  return statefulObservableFactory({
    loader: (id: number) => api.orders(id),
    active: inject(LOGGED_IN),
  });
});

export const TIER_BY_CUSTOMER = lookup('tierByCustomer', () => {
  const api = inject(CustomersApi);
  return statefulObservableBatchFactory({
    loader: (ids: readonly number[]) => api.tiers([...ids]),
    idOf: (tier) => tier.customerId,
    batchTime: BATCH_TIME_MS,
    maxBatchSize: MAX_BATCH,
    active: inject(LOGGED_IN),
    refCount: false,
    cacheSize: 200,
  });
});

export const CART_BY_CUSTOMER = lookup('cartByCustomer', () => {
  const api = inject(CartApi);
  return statefulObservableFactory({
    loader: (id: number) => api.cart(id),
    active: inject(LOGGED_IN),
  });
});

export const NOTES_BY_CUSTOMER = lookup('notesByCustomer', () => {
  const api = inject(NotesApi);
  return statefulObservableFactory({
    loader: (id: number) => api.notes(id),
    active: inject(LOGGED_IN),
  });
});

/**
 * One request per load, so the factory keeps the settled list (R-L5): going
 * back to a customer shows it with no new request. The 20 s poll is not here:
 * the activity section reloads the entry it shows while it shows it (R-D2,
 * R-L8), so a customer nobody shows is not polled. The list carries its
 * customer, so the view can tell whose list it still shows.
 */
export const ACTIVITY_BY_CUSTOMER = lookup('activityByCustomer', () => {
  const api = inject(ActivityApi);
  return statefulObservableFactory({
    loader: (id: number) =>
      api.activity(id).pipe(map((entries) => ({ customerId: id, entries }))),
    active: inject(LOGGED_IN),
  });
});

export const TICKETS_BY_CUSTOMER = lookup('ticketsByCustomer', () => {
  const api = inject(TicketsApi);
  return statefulObservableFactory({
    loader: (id: number) => api.tickets(id),
    active: inject(LOGGED_IN),
  });
});

// ---------- by order / ticket / agent ----------

export const ORDER_BY_ID = lookup('orderById', () => {
  const api = inject(OrdersApi);
  return statefulObservableFactory({
    loader: (id: string) => api.order(id),
    active: inject(LOGGED_IN),
  });
});

export const SHIPMENT_BY_ORDER = lookup('shipmentByOrder', () => {
  const api = inject(ShipmentsApi);
  return statefulObservableFactory({
    loader: (id: string) => api.shipment(id),
    active: inject(LOGGED_IN),
    cacheSize: 200,
  });
});

export const TICKETS_BY_ORDER = lookup('ticketsByOrder', () => {
  const api = inject(TicketsApi);
  return statefulObservableFactory({
    loader: (id: string) => api.ticketsByOrder(id),
    active: inject(LOGGED_IN),
  });
});

export const TICKET_BY_ID = lookup('ticketById', () => {
  const api = inject(TicketsApi);
  return statefulObservableFactory({
    loader: (id: string) => api.ticket(id),
    active: inject(LOGGED_IN),
  });
});

export const AGENT_NAME = lookup('agentName', () => {
  const api = inject(AgentsApi);
  return statefulObservableFactory({
    loader: (id: number) => api.agent(id).pipe(map((agent) => agent.name)),
    active: inject(LOGGED_IN),
    refCount: false,
  });
});

// ---------- shared by every user ----------

/** Names do not change: kept for the lifetime of the page. */
export const PRODUCT_NAME = lookup('productName', () => {
  const api = inject(ProductsApi);
  return statefulObservableFactory({
    loader: (sku: string) =>
      api.product(sku).pipe(map((product) => product.name)),
    refCount: false,
    cacheSize: 500,
  });
});

/** Public and kept (R-L6): a price is requested once per sku, kept across logout; a write that changes stock or price marks it outdated. */
export const CURRENT_PRICE = lookup('currentPrice', () => {
  const api = inject(PricingApi);
  return statefulObservableBatchFactory({
    loader: (skus: readonly string[]) => api.prices([...skus]),
    idOf: (price) => price.sku,
    batchTime: BATCH_TIME_MS,
    maxBatchSize: MAX_BATCH,
    refCount: false,
    cacheSize: 500,
  });
});

export const STOCK_BY_SKU = lookup('stockBySku', () => {
  const api = inject(InventoryApi);
  return statefulObservableFactory({
    loader: (sku: string) => api.stock(sku).pipe(map((s) => s.stock)),
    refCount: false,
    cacheSize: 500,
  });
});
