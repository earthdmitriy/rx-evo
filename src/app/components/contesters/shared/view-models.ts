/**
 * The UI contract of the support console (docs/contest/spec.md §2.2): what
 * each view needs, as specified by UX and product, independent of the
 * backend. The backend's DTOs (services/contesters) do not match these
 * shapes; producing them is the data layer's job.
 *
 * Fields typed `Part<T>` come from another service than the rest of their
 * object: they load and fail on their own, and the view shows the rest
 * meanwhile (a row without its badge, a line without its name).
 */

export type ISODate = string;

/** One field that loads and fails on its own. */
export type Part<T> =
  | { state: 'error'; value: null } // @s2-line
  | { state: 'loading'; value: null }
  | { state: 'ready'; value: T };

// ---------- top bar ----------

export type AgentVm = { agentId: number; name: string; initials: string; role: string };

/** One notification, ready to read. */
export type NotificationVm = { id: number; text: Part<string>; at: ISODate; unread: boolean };

// ---------- customer list ----------

export type TierVm = 'VIP' | 'Regular' | 'New';

export type CustomerListQuery = {
  text: string;
  filter: 'all' | 'vip' | 'open-tickets';
  sort: 'name' | 'lastOrder' | 'spend' | 'openTickets';
  dir: 'asc' | 'desc';
  page: number;
};

export type CustomerRowVm = {
  customerId: number;
  name: string;
  initials: string;
  email: string;
  tier: Part<TierVm>;
  openTickets: Part<number>;
};

export type CustomerPageVm = { rows: CustomerRowVm[]; total: number; page: number; pageSize: number };

// ---------- customer header and tabs ----------

export type CustomerHeaderVm = {
  customerId: number;
  name: string;
  initials: string;
  email: string;
  tier: TierVm;
  city: string;
  since: ISODate;
};

export type KpisVm = {
  lifetimeSpend: Part<number>;
  orders: Part<number>;
  avgOrder: Part<number>;
  openTickets: Part<number>;
};

/** Tab badges; a tab without a counter shows none. */
export type TabCountersVm = { orders: Part<number>; openTickets: Part<number> };

export type OrderStatusVm = 'Processing' | 'Shipped' | 'Delivered' | 'Refunded';

export type OrderRowVm = { orderId: string; date: ISODate; status: OrderStatusVm; items: number; total: number };

export type CartLineVm = { sku: string; qty: number; name: Part<string>; price: Part<number> };

export type TicketStatusVm = 'Open' | 'Waiting' | 'Solved';

export type TicketRowVm = { ticketId: string; subject: string; status: TicketStatusVm; updated: ISODate; orderId: string | null };

export type NoteVm = { noteId: number; author: Part<string>; at: ISODate; text: string };

// ---------- rail ----------

export type ShipmentVm = { carrier: string; state: 'Label created' | 'In transit' | 'Delayed'; eta: ISODate; lastScan: string };

export type ActivityVm = { at: ISODate; text: Part<string> };

// ---------- panels ----------

export type OrderLineVm = { sku: string; name: Part<string>; qty: number; unitPrice: number };

export type OrderVm = {
  orderId: string;
  customerId: number;
  date: ISODate;
  status: OrderStatusVm;
  items: number;
  total: number;
  address: string;
  payment: string;
  shipping: 'Standard' | 'Express';
  lines: OrderLineVm[];
};

/** The ticket an order is discussed in, as shown in the order panel. */
export type LinkedTicketVm = { ticketId: string; subject: string; status: TicketStatusVm };

/** A search hit in the order editor: name from search, price and stock from their services. */
export type ProductHitVm = { sku: string; name: string; price: Part<number>; stock: Part<number> };

export type MessageVm = { from: 'customer' | 'agent'; author: Part<string>; at: ISODate; text: string };

export type TicketThreadVm = {
  ticketId: string;
  customerId: number;
  subject: string;
  status: TicketStatusVm;
  orderId: string | null;
  messages: MessageVm[];
};

/** Helpers for producing parts. */
export const part = {
  loading: <T>(): Part<T> => ({ state: 'loading', value: null }),
  ready: <T>(value: T): Part<T> => ({ state: 'ready', value }),
  error: <T>(): Part<T> => ({ state: 'error', value: null }), // @s2-line
};
