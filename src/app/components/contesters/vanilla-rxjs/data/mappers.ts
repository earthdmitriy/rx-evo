import {
  ActivityEntry,
  Agent,
  AgentNotification,
  CustomerProfile,
  OrderRow,
  Shipment,
  TicketRow,
} from '../../../../services/contesters';
import {
  AgentVm,
  CustomerHeaderVm,
  LinkedTicketVm,
  OrderRowVm,
  ShipmentVm,
  TicketRowVm,
} from '../../shared';
import { Fetched, fetched } from './fetched';
import { RawActivity, RawNotification } from './raw-models';

/** DTO to view model mapping: what the shared views take is not what the backend returns. */

export const unique = <T>(items: T[]): T[] => [...new Set(items)];

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const toAgentVm = (a: Agent): AgentVm => ({
  agentId: a.agentId,
  name: a.name,
  initials: a.initials,
  role: a.role,
});

export const toHeaderVm = (c: CustomerProfile): CustomerHeaderVm => ({
  customerId: c.customerId,
  name: c.name,
  initials: c.initials,
  email: c.email,
  tier: c.tier,
  city: c.city,
  since: c.since,
});

export const toOrderRowVm = (o: OrderRow): OrderRowVm => ({
  orderId: o.orderId,
  date: o.date,
  status: o.status,
  items: o.items,
  total: o.total,
});

export const toTicketRowVm = (t: TicketRow): TicketRowVm => ({
  ticketId: t.ticketId,
  subject: t.subject,
  status: t.status,
  updated: t.updated,
  orderId: t.orderId ?? null,
});

export const toShipmentVm = (s: Shipment): ShipmentVm => ({
  carrier: s.carrier,
  state: s.state,
  eta: s.eta,
  lastScan: s.lastScan,
});

/** The ticket an order is discussed in: the first open one, else the most recent. */
export const toLinkedTicket = (rows: TicketRow[]): LinkedTicketVm | null => {
  const byRecent = [...rows].sort((a, b) => b.updated.localeCompare(a.updated));
  const t = byRecent.find((r) => r.status !== 'Solved') ?? byRecent[0];
  return t
    ? { ticketId: t.ticketId, subject: t.subject, status: t.status }
    : null;
};

/** A notification with the customer's name when it needs one (only ticket replies do). */
export const toNotificationVm = (
  n: AgentNotification,
  customerName: Fetched<string> | null,
): RawNotification => ({
  id: n.id,
  kind: n.kind,
  customerId: n.customerId,
  ticketId: n.ticketId,
  orderId: n.orderId,
  at: n.at,
  unread: n.unread,
  name: n.kind === 'ticket-reply' ? (customerName ?? fetched.loading()) : null,
});

/** An activity entry with the product's name when it needs one (only `product-viewed` does). */
export const toActivityVm = (
  e: ActivityEntry,
  productName: Fetched<string> | null,
): RawActivity => ({
  at: e.at,
  kind: e.kind,
  refId: e.refId,
  name: e.kind === 'product-viewed' ? (productName ?? fetched.loading()) : null,
});
