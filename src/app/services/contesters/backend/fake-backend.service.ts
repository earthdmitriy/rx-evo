import { Injectable, signal } from '@angular/core';
import { base, en, Faker } from '@faker-js/faker';
import { interval, Observable, Subject } from 'rxjs';
import {
  ActivityEntry,
  ActivityKind,
  Agent,
  AgentNotification,
  AgentRef,
  CartLine,
  CUSTOMER_PAGE_SIZE,
  CustomerHit,
  CustomerProfile,
  CustomerQuery,
  CustomerTier,
  IN_FLIGHT,
  MAX_BATCH,
  Note,
  OrderDetail,
  OrderLine,
  OrderLineChange,
  OrderRow,
  OrderStats,
  Page,
  Price,
  Product,
  PushEvent,
  Shipment,
  Stock,
  TicketCount,
  TicketRow,
  TicketStatus,
  TicketThread,
} from '../console.types';
import { copyJson, httpError } from './http-error';
import { createDb, DbState, OrderRecord } from './seed';

/** Push events come every this many ms while an agent is signed in. */
export const PUSH_PERIOD_MS = 25_000;

/** Server-side product search returns at most this many hits. */
export const PRODUCT_SEARCH_LIMIT = 10;

const readSeed = () => {
  const value =
    typeof location === 'undefined'
      ? null
      : new URLSearchParams(location.search).get('seed');
  const seed = Number(value);
  return value !== null && Number.isFinite(seed) ? seed : 1;
};

const now = () => new Date().toISOString();
const notFound = (what: string, url: string) =>
  httpError(404, `${what} not found`, url);
const conflict = (message: string, url: string) => httpError(409, message, url);
const badRequest = (message: string, url: string) =>
  httpError(400, message, url);

const hash = (text: string) =>
  [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** The batch endpoints (`tiers`, `ticketCounts`, `prices`) accept 1…MAX_BATCH distinct ids. */
const batch = <T>(ids: readonly T[], url: string): T[] => {
  const unique = [...new Set(ids)];
  if (!unique.length) throw badRequest('No ids', url);
  if (unique.length > MAX_BATCH)
    throw badRequest(
      `At most ${MAX_BATCH} ids per call, got ${unique.length}`,
      url,
    );
  return unique;
};

type Session = { sessionId: number; agentId: number };

/**
 * The support console's fake server: tables generated from `?seed`
 * (default 1), the session, every service's queries and writes, and the push
 * channel. Each service answers with its own data and refers to other
 * services' entities by id only. Synchronous and network-free: `FakeTransport`
 * adds latency, faults and the session check; the `*Api` classes are the
 * client-side endpoints.
 */
@Injectable({ providedIn: 'root' })
export class FakeBackend {
  private readonly db: DbState = createDb(readSeed());
  /** Randomness for things that happen after start (push, activity). */
  private readonly live = new Faker({ locale: [en, base] });
  private sessionSeq = 0;
  private readonly activityCalls = new Map<number, number>();

  private readonly sessionState = signal<Session | null>(null);
  public readonly session = this.sessionState.asReadonly();

  private readonly pushSubject = new Subject<PushEvent>();
  /** Hot: emits whether or not anyone listens; nothing while signed out. */
  public readonly push$: Observable<PushEvent> =
    this.pushSubject.asObservable();

  constructor() {
    this.live.seed(readSeed() + 1);
    // `?push=off` (e2e): no timer; tests push explicitly
    const pushOff =
      typeof location !== 'undefined' &&
      new URLSearchParams(location.search).get('push') === 'off';
    if (!pushOff) interval(PUSH_PERIOD_MS).subscribe(() => this.pushNow());
  }

  // ---------- session service ----------

  public login(email: string, password: string): Agent {
    if (!email.trim() || !password)
      throw httpError(401, 'Wrong email or password', 'login');
    const agent =
      this.db.agents[hash(email.trim().toLowerCase()) % this.db.agents.length];
    this.sessionState.set({
      sessionId: ++this.sessionSeq,
      agentId: agent.agentId,
    });
    return agent;
  }

  public logout(): void {
    this.sessionState.set(null);
  }

  public profile(): Agent {
    return this.sessionAgent();
  }

  // ---------- agent directory ----------

  public agent(id: number): AgentRef {
    const a = this.db.agents.find((x) => x.agentId === id);
    if (!a) throw notFound(`Agent ${id}`, 'agent');
    return { agentId: a.agentId, name: a.name, initials: a.initials };
  }

  // ---------- notifications service ----------

  public notifications(): AgentNotification[] {
    return [...this.agentNotifications()].sort((a, b) =>
      b.at.localeCompare(a.at),
    );
  }

  public markNotificationsRead(): void {
    this.agentNotifications().forEach((n) => (n.unread = false));
  }

  /** Emits one push event now (the timer calls this; tests may too). */
  public pushNow(): PushEvent | null {
    const session = this.sessionState();
    if (!session) return null;
    const event = this.makePushEvent();
    this.db.notifications.get(session.agentId)!.push(event.notification);
    this.pushSubject.next(copyJson(event));
    return event;
  }

  // ---------- customer search service ----------

  /** Search, filter, sort and page; the index knows the sort keys but returns names and emails only. */
  public searchCustomers(query: CustomerQuery): Page<CustomerHit> {
    const {
      text = '',
      filter = 'all',
      sort = 'name',
      dir = 'asc',
      page = 1,
    } = query;
    const needle = text.trim().toLowerCase();
    const rows = this.db.customers
      .filter(
        (c) =>
          !needle ||
          c.name.toLowerCase().includes(needle) ||
          c.email.includes(needle),
      )
      .filter(
        (c) =>
          filter === 'all' ||
          (filter === 'vip'
            ? c.tier === 'VIP'
            : this.openTickets(c.customerId) > 0),
      );
    const key = (customerId: number, name: string): string | number => {
      if (sort === 'name') return name;
      if (sort === 'openTickets') return this.openTickets(customerId);
      const stats = this.stats(customerId);
      return sort === 'spend' ? stats.lifetimeSpend : (stats.lastOrder ?? '');
    };
    const sign = dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const x = key(a.customerId, a.name);
      const y = key(b.customerId, b.name);
      const order =
        typeof x === 'number'
          ? x - (y as number)
          : x.localeCompare(y as string);
      return order * sign || a.customerId - b.customerId;
    });
    const start = (Math.max(1, page) - 1) * CUSTOMER_PAGE_SIZE;
    return {
      items: rows
        .slice(start, start + CUSTOMER_PAGE_SIZE)
        .map((c) => ({
          customerId: c.customerId,
          name: c.name,
          email: c.email,
        })),
      total: rows.length,
      page: Math.max(1, page),
      pageSize: CUSTOMER_PAGE_SIZE,
    };
  }

  // ---------- CRM ----------

  public customer(customerId: number): CustomerProfile {
    const c = this.customerRecord(customerId, 'customer');
    return {
      customerId,
      name: c.name,
      initials: c.initials,
      email: c.email,
      tier: c.tier,
      city: c.city,
      since: c.since,
    };
  }

  public tiers(ids: number[]): CustomerTier[] {
    return batch(ids, 'tiers').flatMap((id) => {
      const c = this.db.customers.find((x) => x.customerId === id);
      return c ? [{ customerId: id, tier: c.tier }] : [];
    });
  }

  // ---------- orders service ----------

  public orders(customerId: number): OrderRow[] {
    this.customerRecord(customerId, 'orders');
    return this.ordersOf(customerId).map(orderRow);
  }

  public orderStats(customerId: number): OrderStats {
    this.customerRecord(customerId, 'orderStats');
    return this.stats(customerId);
  }

  public order(orderId: string): OrderDetail {
    const o = this.orderRecord(orderId, 'order');
    return {
      ...orderRow(o),
      lines: o.lines,
      address: this.db.customers.find((c) => c.customerId === o.customerId)!
        .address,
      payment: o.payment,
      shipping: o.shipping,
    };
  }

  /**
   * Replaces the order's lines; existing lines keep their price, new lines
   * get the current price. Optionally replies on a ticket in the same call.
   */
  public updateOrder(
    orderId: string,
    lines: OrderLineChange[],
    reply?: { ticketId: string; text: string },
  ): OrderDetail {
    const url = 'updateOrder';
    const o = this.orderRecord(orderId, url);
    if (o.status !== 'Processing')
      throw conflict(`Order ${orderId} has shipped and can't be changed`, url);
    const wanted = lines.filter((l) => l.qty > 0);
    if (!wanted.length)
      throw badRequest('An order needs at least one line', url);

    const next: OrderLine[] = wanted.map((l) => {
      const existing = o.lines.find((x) => x.sku === l.sku);
      const product = this.db.catalog.find((p) => p.sku === l.sku);
      if (!existing && !product) throw notFound(`Product ${l.sku}`, url);
      const extra = l.qty - (existing?.qty ?? 0);
      if (product && extra > product.stock)
        throw conflict(`Only ${product.stock} of ${l.sku} in stock`, url);
      return {
        sku: l.sku,
        qty: l.qty,
        unitPrice: existing?.unitPrice ?? product!.price,
      };
    });
    if (reply) this.checkReply(reply.ticketId, reply.text, url);

    // stock moves with the change
    for (const p of this.db.catalog) {
      const before = o.lines.find((l) => l.sku === p.sku)?.qty ?? 0;
      const after = next.find((l) => l.sku === p.sku)?.qty ?? 0;
      p.stock -= after - before;
    }
    o.lines = next;
    this.logActivity(o.customerId, 'order-changed', orderId);
    if (reply) this.appendAgentMessage(reply.ticketId, reply.text, 'Waiting');
    return this.order(orderId);
  }

  public resendConfirmation(orderId: string): void {
    this.orderRecord(orderId, 'resendConfirmation');
  }

  // ---------- shipping service ----------

  public shipment(orderId: string): Shipment {
    const o = this.orderRecord(orderId, 'shipment');
    const s = this.db.shipments.get(orderId);
    if (!IN_FLIGHT.includes(o.status) || !s)
      throw notFound(`Shipment of ${orderId}`, 'shipment');
    return s;
  }

  // ---------- cart service ----------

  public cart(customerId: number): CartLine[] {
    this.customerRecord(customerId, 'cart');
    return this.db.carts.get(customerId) ?? [];
  }

  // ---------- product, pricing and inventory services ----------

  public product(sku: string): Product {
    const p = this.catalogItem(sku, 'product');
    return { sku: p.sku, name: p.name };
  }

  /** Server-side search by name; at most PRODUCT_SEARCH_LIMIT hits, names only. */
  public searchProducts(text: string): Product[] {
    const needle = text.trim().toLowerCase();
    if (!needle) return [];
    return this.db.catalog
      .filter((p) => p.name.toLowerCase().includes(needle))
      .slice(0, PRODUCT_SEARCH_LIMIT)
      .map((p) => ({ sku: p.sku, name: p.name }));
  }

  public prices(skus: string[]): Price[] {
    return this.items(skus, 'prices').map((p) => ({
      sku: p.sku,
      price: p.price,
    }));
  }

  public stock(sku: string): Stock {
    const p = this.catalogItem(sku, 'stock');
    return { sku: p.sku, stock: p.stock };
  }

  // ---------- tickets service ----------

  public tickets(customerId: number): TicketRow[] {
    this.customerRecord(customerId, 'tickets');
    return this.db.tickets
      .filter((t) => t.customerId === customerId)
      .map(ticketRow)
      .sort((a, b) => b.updated.localeCompare(a.updated));
  }

  /** The reverse link: tickets that mention an order, most recent first. */
  public ticketsByOrder(orderId: string): TicketRow[] {
    this.orderRecord(orderId, 'ticketsByOrder');
    return this.db.tickets
      .filter((t) => t.orderId === orderId)
      .map(ticketRow)
      .sort((a, b) => b.updated.localeCompare(a.updated));
  }

  public ticketCounts(customerIds: number[]): TicketCount[] {
    return batch(customerIds, 'ticketCounts').map((customerId) => ({
      customerId,
      open: this.openTickets(customerId),
    }));
  }

  public ticket(ticketId: string): TicketThread {
    return this.ticketRecord(ticketId, 'ticket');
  }

  public replyTicket(
    ticketId: string,
    text: string,
    status: TicketStatus,
  ): TicketThread {
    this.checkReply(ticketId, text, 'replyTicket');
    this.appendAgentMessage(ticketId, text, status);
    return this.ticket(ticketId);
  }

  // ---------- notes service ----------

  public notes(customerId: number): Note[] {
    this.customerRecord(customerId, 'notes');
    return this.db.notes
      .filter((n) => n.customerId === customerId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  public addNote(customerId: number, text: string): Note {
    this.customerRecord(customerId, 'addNote');
    if (!text.trim()) throw badRequest('A note needs some text', 'addNote');
    const note: Note = {
      noteId: this.db.nextIds.note++,
      customerId,
      authorId: this.sessionAgent().agentId,
      at: now(),
      text: text.trim(),
    };
    this.db.notes.push(note);
    return note;
  }

  // ---------- activity service ----------

  /** The activity as stored, without the side effect of a call (for tests that compare the page with the backend). */
  public peekActivity(customerId: number): ActivityEntry[] {
    return this.db.activity.get(customerId) ?? [];
  }

  /** Grows over time: every call after the first adds one new event. */
  public activity(customerId: number): ActivityEntry[] {
    this.customerRecord(customerId, 'activity');
    const calls = this.activityCalls.get(customerId) ?? 0;
    this.activityCalls.set(customerId, calls + 1);
    if (calls > 0)
      this.logActivity(
        customerId,
        'product-viewed',
        this.live.helpers.arrayElement(this.db.catalog).sku,
      );
    return this.db.activity.get(customerId) ?? [];
  }

  // ---------- test support ----------

  /**
   * Seeded cases the e2e tests need, found in the data (ids differ per seed).
   * Test support only; not part of the console's API.
   */
  public testFixtures() {
    const inFlight = (cid: number) =>
      this.ordersOf(cid).filter((o) => IN_FLIGHT.includes(o.status));
    const linked = (o: OrderRecord) =>
      [...this.db.tickets].reverse().find((t) => t.orderId === o.orderId);
    const withTicket = this.db.orders.find(
      (o) =>
        o.status === 'Processing' &&
        linked(o) &&
        linked(o)!.status !== 'Solved',
    );
    const shipped = this.db.orders.find(
      (o) => o.status === 'Shipped' || o.status === 'Delivered',
    );
    const openTicket = this.db.tickets.find((t) => t.status !== 'Solved');
    const name = (cid?: number) =>
      this.db.customers.find((c) => c.customerId === cid)?.name;
    const twoInFlight = this.db.customers.find(
      (c) => inFlight(c.customerId).length >= 2,
    )?.customerId;
    const allDelivered = this.db.customers.find((c) => {
      const orders = this.ordersOf(c.customerId);
      return (
        orders.length > 0 &&
        orders.every((o) => o.status === 'Delivered' || o.status === 'Refunded')
      );
    })?.customerId;
    const threaded = this.db.tickets.find(
      (t) =>
        t.status !== 'Solved' && t.messages.some((m) => m.from === 'agent'),
    );
    const noted = this.db.customers.find((c) =>
      this.db.notes.some((n) => n.customerId === c.customerId),
    )?.customerId;
    const bigCart = this.db.customers.find(
      (c) => (this.db.carts.get(c.customerId)?.length ?? 0) > MAX_BATCH,
    )?.customerId;
    const addable =
      withTicket &&
      this.db.catalog.find(
        (p) => p.stock > 3 && !withTicket.lines.some((l) => l.sku === p.sku),
      );
    return {
      /** A Processing order with an open linked ticket (G1). */
      editable: withTicket && {
        customerId: withTicket.customerId,
        customerName: name(withTicket.customerId),
        orderId: withTicket.orderId,
        ticketId: linked(withTicket)!.ticketId,
        addSku: addable!.sku,
        addName: addable!.name,
      },
      /** An order that can no longer be edited (G5). */
      shipped: shipped && {
        customerId: shipped.customerId,
        customerName: name(shipped.customerId),
        orderId: shipped.orderId,
      },
      /** A ticket that is not solved (G6, G7). */
      openTicket: openTicket && {
        customerId: openTicket.customerId,
        customerName: name(openTicket.customerId),
        ticketId: openTicket.ticketId,
      },
      /** A customer with at least two in-flight orders (D2, D3, E3). */
      twoInFlight: twoInFlight && {
        customerId: twoInFlight,
        customerName: name(twoInFlight),
        orderIds: inFlight(twoInFlight).map((o) => o.orderId),
      },
      /** A ticket with an agent's reply, not solved (H5, E15). */
      threaded: threaded && {
        customerId: threaded.customerId,
        customerName: name(threaded.customerId),
        ticketId: threaded.ticketId,
      },
      /** A customer with at least one note (H6, E16). */
      noted: noted && { customerId: noted, customerName: name(noted) },
      /** A customer whose cart has more skus than one batch call takes (H12, C12). */
      bigCart: bigCart && {
        customerId: bigCart,
        customerName: name(bigCart),
        lines: this.db.carts.get(bigCart)!.length,
      },
      /** A customer with orders, none in flight (C8). */
      allDelivered: allDelivered && {
        customerId: allDelivered,
        customerName: name(allDelivered),
      },
    };
  }

  // ---------- internals ----------

  private sessionAgent(): Agent {
    const session = this.sessionState();
    const agent =
      session && this.db.agents.find((a) => a.agentId === session.agentId);
    if (!agent) throw httpError(401, 'Not signed in', 'profile');
    return agent;
  }

  private agentNotifications(): AgentNotification[] {
    return this.db.notifications.get(this.sessionAgent().agentId)!;
  }

  private customerRecord(customerId: number, url: string) {
    const c = this.db.customers.find((x) => x.customerId === customerId);
    if (!c) throw notFound(`Customer ${customerId}`, url);
    return c;
  }

  private orderRecord(orderId: string, url: string): OrderRecord {
    const o = this.db.orders.find((x) => x.orderId === orderId);
    if (!o) throw notFound(`Order ${orderId}`, url);
    return o;
  }

  private ticketRecord(ticketId: string, url: string) {
    const t = this.db.tickets.find((x) => x.ticketId === ticketId);
    if (!t) throw notFound(`Ticket ${ticketId}`, url);
    return t;
  }

  /** One catalog item; 404 for an unknown sku. */
  private catalogItem(sku: string, url: string) {
    const item = this.db.catalog.find((p) => p.sku === sku);
    if (!item) throw notFound(`Product ${sku}`, url);
    return item;
  }

  /** Catalog items for a batch of skus; unknown skus are skipped (the pricing service is a batch endpoint). */
  private items(skus: string[], url: string) {
    return batch(skus, url).flatMap((sku) =>
      this.db.catalog.filter((p) => p.sku === sku),
    );
  }

  private ordersOf(customerId: number) {
    return this.db.orders
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  private stats(customerId: number): OrderStats {
    const all = this.ordersOf(customerId);
    const paid = all.filter((o) => o.status !== 'Refunded');
    const spend = paid.reduce((sum, o) => sum + total(o.lines), 0);
    return {
      customerId,
      orders: all.length,
      lifetimeSpend: spend,
      avgOrder: paid.length ? Math.round(spend / paid.length) : 0,
      lastOrder: all[0]?.date ?? null,
    };
  }

  private openTickets(customerId: number) {
    return this.db.tickets.filter(
      (t) => t.customerId === customerId && t.status !== 'Solved',
    ).length;
  }

  private checkReply(ticketId: string, text: string, url: string) {
    this.ticketRecord(ticketId, url);
    if (!text.trim()) throw badRequest('A reply needs some text', url);
  }

  private appendAgentMessage(
    ticketId: string,
    text: string,
    status: TicketStatus,
  ) {
    const t = this.ticketRecord(ticketId, 'replyTicket');
    const at = now();
    t.messages.push({
      from: 'agent',
      authorId: this.sessionAgent().agentId,
      at,
      text: text.trim(),
    });
    t.status = status;
    t.updated = at;
  }

  private logActivity(customerId: number, kind: ActivityKind, refId: string) {
    const list = this.db.activity.get(customerId) ?? [];
    list.unshift({ at: now(), kind, refId });
    this.db.activity.set(customerId, list);
  }

  private makePushEvent(): PushEvent {
    const id = this.db.nextIds.notification++;
    const at = now();
    const kind = this.live.helpers.weightedArrayElement<PushEvent['kind']>([
      { weight: 3, value: 'ticket-reply' },
      { weight: 1, value: 'ticket-escalated' },
      { weight: 1, value: 'order-delivered' },
    ]);

    if (kind === 'order-delivered') {
      const shipped = this.db.orders.filter((o) => o.status === 'Shipped');
      if (shipped.length) {
        const o = this.live.helpers.arrayElement(shipped);
        o.status = 'Delivered';
        this.db.shipments.delete(o.orderId);
        this.logActivity(o.customerId, 'order-delivered', o.orderId);
        return {
          kind,
          notification: {
            id,
            kind,
            at,
            unread: true,
            orderId: o.orderId,
            customerId: o.customerId,
          },
        };
      }
    }

    const ticket = this.live.helpers.arrayElement(this.db.tickets);
    if (kind === 'ticket-escalated') {
      return {
        kind,
        notification: {
          id,
          kind,
          at,
          unread: true,
          ticketId: ticket.ticketId,
          customerId: ticket.customerId,
        },
      };
    }

    // a customer replied: the thread grows and the ticket reopens
    ticket.messages.push({
      from: 'customer',
      authorId: ticket.customerId,
      at,
      text: this.live.helpers.arrayElement([
        'Any news?',
        'Thanks! One more thing…',
        'It still has not arrived.',
      ]),
    });
    ticket.status = 'Open';
    ticket.updated = at;
    return {
      kind: 'ticket-reply',
      notification: {
        id,
        kind: 'ticket-reply',
        at,
        unread: true,
        ticketId: ticket.ticketId,
        customerId: ticket.customerId,
      },
    };
  }
}

const total = (lines: OrderLine[]) =>
  lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

const orderRow = (o: OrderRecord): OrderRow => ({
  orderId: o.orderId,
  customerId: o.customerId,
  date: o.date,
  status: o.status,
  items: o.lines.reduce((n, l) => n + l.qty, 0),
  total: total(o.lines),
});

const ticketRow = ({
  messages: _,
  ...row
}: TicketRow & { messages: unknown }): TicketRow => row;
