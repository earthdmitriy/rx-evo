import {
  Agent,
  CustomerHit,
  CustomerProfile,
  OrderDetail,
  OrderRow,
  Shipment,
  TicketRow,
  TicketThread,
} from '../../../../services/contesters';
import {
  AgentVm,
  CustomerHeaderVm,
  LinkedTicketVm,
  OrderRowVm,
  OrderVm,
  ShipmentVm,
  TicketRowVm,
  TicketThreadVm,
} from '../../shared';

/** Backend DTOs to the view models of the shared views. Pure. */

export const toAgentVm = ({
  agentId,
  name,
  initials,
  role,
}: Agent): AgentVm => ({ agentId, name, initials, role });

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const hitInitials = (hit: CustomerHit) => initialsOf(hit.name);

export const toHeaderVm = (c: CustomerProfile): CustomerHeaderVm => ({
  customerId: c.customerId,
  name: c.name,
  initials: c.initials,
  email: c.email,
  tier: c.tier,
  city: c.city,
  since: c.since,
});

export const toOrderRowVm = ({
  orderId,
  date,
  status,
  items,
  total,
}: OrderRow): OrderRowVm => ({ orderId, date, status, items, total });

export const toTicketRowVm = (t: TicketRow): TicketRowVm => ({
  ticketId: t.ticketId,
  subject: t.subject,
  status: t.status,
  updated: t.updated,
  orderId: t.orderId ?? null,
});

export const toOrderVm = (o: OrderDetail): OrderVm => ({
  orderId: o.orderId,
  customerId: o.customerId,
  date: o.date,
  status: o.status,
  items: o.items,
  total: o.total,
  address: o.address,
  payment: o.payment,
  shipping: o.shipping,
  lines: o.lines.map(({ sku, qty, unitPrice }) => ({ sku, qty, unitPrice })),
});

/** R-J5: the open ticket of the order, else the most recently updated one. */
export const linkedTicketOf = (tickets: TicketRow[]): LinkedTicketVm | null => {
  const open = tickets.find((t) => t.status !== 'Solved');
  const latest = [...tickets].sort((a, b) =>
    b.updated.localeCompare(a.updated),
  )[0];
  const ticket = open ?? latest;
  return ticket
    ? {
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        status: ticket.status,
      }
    : null;
};

export const toThreadVm = (t: TicketThread): TicketThreadVm => ({
  ticketId: t.ticketId,
  customerId: t.customerId,
  subject: t.subject,
  status: t.status,
  orderId: t.orderId ?? null,
  messages: t.messages.map(({ from, authorId, at, text }) => ({
    from,
    authorId,
    at,
    text,
  })),
});

export const toShipmentVm = ({
  carrier,
  state,
  eta,
  lastScan,
}: Shipment): ShipmentVm => ({ carrier, state, eta, lastScan });
