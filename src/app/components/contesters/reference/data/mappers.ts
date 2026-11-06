import { ActivityEntry, Agent, AgentNotification, CustomerProfile, OrderRow, Shipment, TicketRow } from '../../../../services/contesters';
import {
  ActivityVm,
  AgentVm,
  CustomerHeaderVm,
  LinkedTicketVm,
  NotificationVm,
  OrderRowVm,
  Part,
  part,
  ShipmentVm,
  TicketRowVm,
} from '../../shared';

/** DTO to view model mapping: what the shared views take is not what the backend returns. */

export const unique = <T>(items: T[]): T[] => [...new Set(items)];

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const toAgentVm = (a: Agent): AgentVm => ({ agentId: a.agentId, name: a.name, initials: a.initials, role: a.role });

export const toHeaderVm = (c: CustomerProfile): CustomerHeaderVm => ({
  customerId: c.customerId,
  name: c.name,
  initials: c.initials,
  email: c.email,
  tier: c.tier,
  city: c.city,
  since: c.since,
});

export const toOrderRowVm = (o: OrderRow): OrderRowVm => ({ orderId: o.orderId, date: o.date, status: o.status, items: o.items, total: o.total });

export const toTicketRowVm = (t: TicketRow): TicketRowVm => ({
  ticketId: t.ticketId,
  subject: t.subject,
  status: t.status,
  updated: t.updated,
  orderId: t.orderId ?? null,
});

export const toShipmentVm = (s: Shipment): ShipmentVm => ({ carrier: s.carrier, state: s.state, eta: s.eta, lastScan: s.lastScan });

/** The ticket an order is discussed in: the first open one, else the most recent. */
export const toLinkedTicket = (rows: TicketRow[]): LinkedTicketVm | null => {
  const byRecent = [...rows].sort((a, b) => b.updated.localeCompare(a.updated));
  const t = byRecent.find((r) => r.status !== 'Solved') ?? byRecent[0];
  return t ? { ticketId: t.ticketId, subject: t.subject, status: t.status } : null;
};

/** Notification sentence; only ticket replies need the customer's name. */
export const toNotificationVm = (n: AgentNotification, customerName: Part<string> | null): NotificationVm => {
  const text: Part<string> =
    n.kind === 'ticket-reply'
      ? customerName && customerName.state === 'ready'
        ? part.ready(`${n.ticketId}: new message from ${customerName.value}`)
        : (customerName ?? part.loading())
      : n.kind === 'ticket-escalated'
        ? part.ready(`${n.ticketId} escalated to you`)
        : part.ready(`${n.orderId} delivered`);
  return { id: n.id, text, at: n.at, unread: n.unread };
};

/** Activity sentence; only `product-viewed` needs a name from the product service. */
export const toActivityVm = (e: ActivityEntry, productName: Part<string> | null): ActivityVm => {
  const text: Part<string> =
    e.kind === 'product-viewed'
      ? productName && productName.state === 'ready'
        ? part.ready(`Viewed ${productName.value}`)
        : (productName ?? part.loading())
      : e.kind === 'order-placed'
        ? part.ready(`Placed order ${e.refId}`)
        : e.kind === 'order-changed'
          ? part.ready(`Changed order ${e.refId}`)
          : e.kind === 'order-delivered'
            ? part.ready(`Order ${e.refId} delivered`)
            : part.ready(`Opened ticket ${e.refId}`);
  return { at: e.at, text };
};
