import {
  ActivityVm,
  CartLineVm,
  CustomerPageVm,
  CustomerRowVm,
  MessageVm,
  NoteVm,
  NotificationVm,
  OrderLineVm,
  OrderVm,
  ProductHitVm,
  TicketThreadVm,
  TierVm,
} from '../../shared';
import { Fetched, value } from './fetched';

/** What the orders service knows about the customer: the numbers of three KPIs and the orders badge. */
export type OrderStatsVm = {
  lifetimeSpend: number;
  orders: number;
  avgOrder: number;
};

/**
 * The reference's internal view models: the shared ones, with each value that
 * another service provides still a `Fetched` next to its row (so a failure can
 * be told from "not yet" before the store hands data to the views). The
 * functions below split a raw model into what the shared views take: the own
 * data of the section and one `Lookup` per service.
 */
export type RawNotification = NotificationVm & { name: Fetched<string> | null };
export type RawCustomerRow = CustomerRowVm & {
  tier: Fetched<TierVm>;
  openTickets: Fetched<number>;
};
export type RawCustomerPage = Omit<CustomerPageVm, 'rows'> & {
  rows: RawCustomerRow[];
};
export type RawKpis = {
  orderStats: Fetched<OrderStatsVm>;
  openTickets: Fetched<number>;
};
export type RawCartLine = CartLineVm & {
  name: Fetched<string>;
  price: Fetched<number>;
};
export type RawNote = NoteVm & { author: Fetched<string> };
export type RawActivity = ActivityVm & { name: Fetched<string> | null };
export type RawOrderLine = OrderLineVm & { name: Fetched<string> };
export type RawOrder = Omit<OrderVm, 'lines'> & { lines: RawOrderLine[] };
export type RawHit = ProductHitVm & {
  price: Fetched<number>;
  stock: Fetched<number>;
};
export type RawMessage = MessageVm & { author: Fetched<string> };
export type RawThread = Omit<TicketThreadVm, 'messages'> & {
  messages: RawMessage[];
};

/** Values of one service by the id of the thing they belong to; a missing key: not here (the reference's own internal shape). */
export type Lookup<V> = Readonly<Record<string, V>>;

/** The ready values of `items` as a lookup: `key` names the thing, `pick` the fetched value. */
const lookupOf = <I, V>(
  items: readonly I[],
  key: (i: I) => string | number,
  pick: (i: I) => Fetched<V> | null,
): Lookup<V> => {
  const out: Record<string, V> = {};
  for (const i of items) {
    const f = pick(i);
    const v = f ? value(f) : undefined;
    if (v !== undefined) out[String(key(i))] = v;
  }
  return out;
};

// notifications
export const ownNotifications = (l: RawNotification[]): NotificationVm[] =>
  l.map(({ name: _name, ...n }) => n);
export const customerNamesOf = (l: RawNotification[]): Lookup<string> =>
  lookupOf(
    l,
    (n) => n.customerId,
    (n) => n.name,
  );

// customer list
export const ownPage = (p: RawCustomerPage): CustomerPageVm => ({
  ...p,
  rows: p.rows.map(
    ({ tier: _tier, openTickets: _open, ...r }): CustomerRowVm => r,
  ),
});
export const tiersOf = (p: RawCustomerPage): Lookup<TierVm> =>
  lookupOf(
    p.rows,
    (r) => r.customerId,
    (r) => r.tier,
  );
export const openTicketsOf = (p: RawCustomerPage): Lookup<number> =>
  lookupOf(
    p.rows,
    (r) => r.customerId,
    (r) => r.openTickets,
  );

// cart
export const ownCart = (l: RawCartLine[]): CartLineVm[] =>
  l.map(({ sku, qty }) => ({ sku, qty }));
export const cartNamesOf = (l: RawCartLine[]): Lookup<string> =>
  lookupOf(
    l,
    (x) => x.sku,
    (x) => x.name,
  );
export const cartPricesOf = (l: RawCartLine[]): Lookup<number> =>
  lookupOf(
    l,
    (x) => x.sku,
    (x) => x.price,
  );

// notes
export const ownNotes = (l: RawNote[]): NoteVm[] =>
  l.map(({ author: _author, ...n }) => n);
export const authorsOf = (l: RawNote[]): Lookup<string> =>
  lookupOf(
    l,
    (n) => n.authorId,
    (n) => n.author,
  );

// activity
export const ownActivity = (l: RawActivity[]): ActivityVm[] =>
  l.map(({ name: _name, ...a }) => a);
export const activityNamesOf = (l: RawActivity[]): Lookup<string> =>
  lookupOf(
    l,
    (a) => a.refId,
    (a) => a.name,
  );

// order panel
export const ownOrder = (o: RawOrder): OrderVm => ({
  ...o,
  lines: o.lines.map(({ name: _name, ...l }): OrderLineVm => l),
});
export const orderNamesOf = (o: RawOrder): Lookup<string> =>
  lookupOf(
    o.lines,
    (l) => l.sku,
    (l) => l.name,
  );
export const ownHits = (l: RawHit[]): ProductHitVm[] =>
  l.map(({ sku, name }) => ({ sku, name }));
export const hitPricesOf = (l: RawHit[]): Lookup<number> =>
  lookupOf(
    l,
    (h) => h.sku,
    (h) => h.price,
  );
export const hitStockOf = (l: RawHit[]): Lookup<number> =>
  lookupOf(
    l,
    (h) => h.sku,
    (h) => h.stock,
  );

// ticket panel
export const ownThread = (t: RawThread): TicketThreadVm => ({
  ...t,
  messages: t.messages.map(({ author: _author, ...m }): MessageVm => m),
});
export const threadNamesOf = (
  t: RawThread,
  from: 'customer' | 'agent',
): Lookup<string> =>
  lookupOf(
    t.messages.filter((m) => m.from === from),
    (m) => m.authorId,
    (m) => m.author,
  );

/** The KPIs of the two services as the header and the tabs take them. */
export const orderStatsOf = (k: RawKpis): OrderStatsVm | null =>
  value(k.orderStats) ?? null;
export const openTicketsCountOf = (k: RawKpis): number | null =>
  value(k.openTickets) ?? null;
