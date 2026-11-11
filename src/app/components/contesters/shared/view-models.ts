/**
 * The UI contract of the support console (docs/contest/spec.md §2.2): what
 * each view needs, as specified by UX and product, independent of the
 * backend. The backend's DTOs (services/contesters) do not match these
 * shapes; producing them is the data layer's job.
 *
 * View models carry DATA ONLY, no status, and each carries only the data of
 * one source. What other services know about the things a view shows (the
 * tier of a customer, the name or the price of a product, a total made of
 * them) is NOT inside the rows and is NOT an input of the view: the view
 * renders a field component by id (`fields.ts`) that the implementation
 * supplies, and the component is empty until its value has arrived. `null` is
 * real data ("there is none"). How a page shows that something is loading
 * below the level of a section is up to the implementation.
 */

export type ISODate = string;

// ---------- top bar ----------

export type AgentVm = {
  agentId: number;
  name: string;
  initials: string;
  role: string;
};

export type NotificationKindVm =
  | 'ticket-reply'
  | 'ticket-escalated'
  | 'order-delivered';

/**
 * One notification by kind and reference. The view writes the sentence: a
 * reply names its customer, from the `customerNames` lookup.
 */
export type NotificationVm = {
  id: number;
  kind: NotificationKindVm;
  customerId: number;
  ticketId?: string;
  orderId?: string;
  at: ISODate;
  unread: boolean;
};

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
};

export type CustomerPageVm = {
  rows: CustomerRowVm[];
  total: number;
  page: number;
  pageSize: number;
};

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

export type OrderStatusVm = 'Processing' | 'Shipped' | 'Delivered' | 'Refunded';

export type OrderRowVm = {
  orderId: string;
  date: ISODate;
  status: OrderStatusVm;
  items: number;
  total: number;
};

export type CartLineVm = { sku: string; qty: number };

export type TicketStatusVm = 'Open' | 'Waiting' | 'Solved';

export type TicketRowVm = {
  ticketId: string;
  subject: string;
  status: TicketStatusVm;
  updated: ISODate;
  orderId: string | null;
};

/** `authorId` is an agent id (the agent directory names it). */
export type NoteVm = {
  noteId: number;
  authorId: number;
  at: ISODate;
  text: string;
};

// ---------- rail ----------

export type ShipmentVm = {
  carrier: string;
  state: 'Label created' | 'In transit' | 'Delayed';
  eta: ISODate;
  lastScan: string;
};

export type ActivityKindVm =
  | 'order-placed'
  | 'order-changed'
  | 'order-delivered'
  | 'product-viewed'
  | 'ticket-opened';

/**
 * One event by kind and reference (an order id, a sku or a ticket id). The
 * view writes the sentence: a viewed product names itself, from the
 * `productNames` lookup.
 */
export type ActivityVm = { at: ISODate; kind: ActivityKindVm; refId: string };

// ---------- panels ----------

export type OrderLineVm = { sku: string; qty: number; unitPrice: number };

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
export type LinkedTicketVm = {
  ticketId: string;
  subject: string;
  status: TicketStatusVm;
};

/** A search hit in the order editor: sku and name from the search (price and stock are lookups by sku). */
export type ProductHitVm = { sku: string; name: string };

/** `authorId` is a customer id or an agent id, by `from`. */
export type MessageVm = {
  from: 'customer' | 'agent';
  authorId: number;
  at: ISODate;
  text: string;
};

export type TicketThreadVm = {
  ticketId: string;
  customerId: number;
  subject: string;
  status: TicketStatusVm;
  orderId: string | null;
  messages: MessageVm[];
};
