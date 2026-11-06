/**
 * Data types of the support console's fake backend (docs/contest/spec.md §4).
 *
 * The backend is a set of services, each owning its data. Responses carry ids
 * of entities owned by other services, not their shape: composing them for
 * the screen is the client's job. Plain JSON: every response is a fresh copy.
 */

export type ISODate = string;

// ---------- session service ----------

/** The signed-in agent (`profile`). */
export type Agent = {
  agentId: number;
  name: string;
  initials: string;
  email: string;
  role: string;
};

// ---------- agent directory ----------

/** Any agent, by id (`agents(ids)`). */
export type AgentRef = {
  agentId: number;
  name: string;
  initials: string;
};

// ---------- notifications service ----------

export type NotificationKind = 'ticket-reply' | 'ticket-escalated' | 'order-delivered';

/** No text: the client composes it from the ticket, order and customer it refers to. */
export type AgentNotification = {
  id: number;
  kind: NotificationKind;
  at: ISODate;
  unread: boolean;
  customerId: number;
  ticketId?: string;
  orderId?: string;
};

/** One event on the push channel: a notification just stored on the server. */
export type PushEvent = {
  kind: NotificationKind;
  notification: AgentNotification;
};

// ---------- customer search service ----------

export type CustomerFilter = 'all' | 'vip' | 'open-tickets';
export type CustomerSort = 'name' | 'lastOrder' | 'spend' | 'openTickets';
export type SortDir = 'asc' | 'desc';

export type CustomerQuery = {
  /** Matches name or email, case-insensitive. */
  text?: string;
  filter?: CustomerFilter;
  sort?: CustomerSort;
  dir?: SortDir;
  /** 1-based. */
  page?: number;
};

export const CUSTOMER_PAGE_SIZE = 8;

/** A search hit: the index knows names and emails, nothing else. */
export type CustomerHit = {
  customerId: number;
  name: string;
  email: string;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

// ---------- CRM ----------

export type Tier = 'VIP' | 'Regular' | 'New';

/** One customer's profile (`customer(id)`). No counters: they belong to other services. */
export type CustomerProfile = {
  customerId: number;
  name: string;
  initials: string;
  email: string;
  tier: Tier;
  city: string;
  since: ISODate;
};

/** `tiers(ids)`. */
export type CustomerTier = { customerId: number; tier: Tier };

// ---------- orders service ----------

export type OrderStatus = 'Processing' | 'Shipped' | 'Delivered' | 'Refunded';

/** Statuses with a shipment to track. */
export const IN_FLIGHT: readonly OrderStatus[] = ['Processing', 'Shipped'];

export type OrderRow = {
  orderId: string;
  customerId: number;
  date: ISODate;
  status: OrderStatus;
  items: number;
  total: number;
};

/** A line knows its product only by sku, and the price it was sold at. */
export type OrderLine = {
  sku: string;
  qty: number;
  unitPrice: number;
};

/** No link to tickets: tickets know their order, not the other way round. */
export type OrderDetail = OrderRow & {
  lines: OrderLine[];
  address: string;
  payment: string;
  shipping: 'Standard' | 'Express';
};

/** Input of `updateOrder`: the new full list of lines. New lines are priced by the pricing service. */
export type OrderLineChange = { sku: string; qty: number };

/** `orderStats(customerId)`: what the orders service knows about a customer. */
export type OrderStats = {
  customerId: number;
  orders: number;
  lifetimeSpend: number;
  avgOrder: number;
  lastOrder: ISODate | null;
};

// ---------- shipping service ----------

export type ShipmentState = 'Label created' | 'In transit' | 'Delayed';

export type Shipment = {
  orderId: string;
  carrier: string;
  state: ShipmentState;
  eta: ISODate;
  lastScan: string;
};

// ---------- cart service ----------

/** Skus and quantities only. */
export type CartLine = { sku: string; qty: number };

// ---------- product, pricing and inventory services ----------

/** At most this many ids per batch call (`products`, `prices`, `stock`, `tiers`, `ticketCounts`, `agents`); 400 above. */
export const MAX_BATCH = 20;

/** Product service: names only. Prices and stock live elsewhere. */
export type Product = { sku: string; name: string };

/** Pricing service: the current price. Order lines keep the price they were sold at. */
export type Price = { sku: string; price: number };

/** Inventory service. */
export type Stock = { sku: string; stock: number };

// ---------- tickets service ----------

export type TicketStatus = 'Open' | 'Waiting' | 'Solved';

export type TicketRow = {
  ticketId: string;
  customerId: number;
  subject: string;
  status: TicketStatus;
  updated: ISODate;
  orderId?: string;
};

/** Authors by id: a customer id or an agent id (agent directory). */
export type TicketMessage = {
  from: 'customer' | 'agent';
  authorId: number;
  at: ISODate;
  text: string;
};

export type TicketThread = TicketRow & { messages: TicketMessage[] };

/** `ticketCounts(ids)`. */
export type TicketCount = { customerId: number; open: number };

// ---------- notes service ----------

export type Note = {
  noteId: number;
  customerId: number;
  /** Agent directory id. */
  authorId: number;
  at: ISODate;
  text: string;
};

// ---------- activity service ----------

export type ActivityKind = 'order-placed' | 'order-changed' | 'order-delivered' | 'product-viewed' | 'ticket-opened';

/** An event by kind and reference: an order id, a sku or a ticket id. The client writes the sentence. */
export type ActivityEntry = {
  at: ISODate;
  kind: ActivityKind;
  refId: string;
};
