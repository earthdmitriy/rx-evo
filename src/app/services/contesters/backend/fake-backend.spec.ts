import { HttpErrorResponse } from '@angular/common/http';
import { discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Observable, Subscription } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../../app.config';
import {
  ActivityApi,
  AgentsApi,
  CustomersApi,
  InventoryApi,
  MAX_BATCH,
  NotesApi,
  NotificationsApi,
  OrdersApi,
  PricingApi,
  ProductsApi,
  PUSH_PERIOD_MS,
  PushEvent,
  SessionApi,
  TicketsApi,
} from '../index';
import { FakeTransport } from './fake-transport.service';
import { createDb } from './seed';

type Result<T> = { value?: T; error?: unknown; done: boolean };

/** Subscribes and lets the (zero) latency pass. Call inside fakeAsync. */
const run = <T>(source: Observable<T>): Result<T> => {
  const result: Result<T> = { done: false };
  source.subscribe({
    next: (value) => (result.value = value),
    error: (error) => ((result.error = error), (result.done = true)),
    complete: () => (result.done = true),
  });
  tick(1);
  return result;
};

const status = (error: unknown) => (error as HttpErrorResponse).status;

describe('contesters fake backend', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: SKIPDELAY_TOKEN, useValue: true }] });
  });

  /** Services are created inside each fakeAsync test, so the push timer is fake. */
  const apis = () => ({
    session: TestBed.inject(SessionApi),
    agents: TestBed.inject(AgentsApi),
    customers: TestBed.inject(CustomersApi),
    orders: TestBed.inject(OrdersApi),
    tickets: TestBed.inject(TicketsApi),
    products: TestBed.inject(ProductsApi),
    pricing: TestBed.inject(PricingApi),
    inventory: TestBed.inject(InventoryApi),
    notes: TestBed.inject(NotesApi),
    activity: TestBed.inject(ActivityApi),
    notifications: TestBed.inject(NotificationsApi),
    transport: TestBed.inject(FakeTransport),
  });
  type Apis = ReturnType<typeof apis>;

  const signIn = (api: Apis) => run(api.session.login('dana@shop.example', 'secret'));

  /** A customer with a Processing order and an open ticket about it (guaranteed by the seed). */
  const editable = (api: Apis) => {
    for (let page = 1; ; page++) {
      const hits = run(api.customers.searchCustomers({ page })).value!.items;
      if (!hits.length) throw new Error('no editable order in the seed');
      for (const c of hits) {
        const order = run(api.orders.orders(c.customerId)).value!.find((o) => o.status === 'Processing');
        if (!order) continue;
        const ticket = run(api.tickets.ticketsByOrder(order.orderId)).value!.find((t) => t.status !== 'Solved');
        if (ticket) return { customerId: c.customerId, orderId: order.orderId, ticketId: ticket.ticketId };
      }
    }
  };

  it('generates the same data for the same seed', () => {
    const a = createDb(1);
    const b = createDb(1);
    expect(a.customers).toEqual(b.customers);
    expect(a.orders).toEqual(b.orders);
    expect(createDb(2).customers[0]).not.toEqual(a.customers[0]);
  });

  it('answers user-scope calls with 401 while signed out; products, prices and stock are public', fakeAsync(() => {
    const api = apis();
    expect(status(run(api.customers.searchCustomers({})).error)).toBe(401);
    const hits = run(api.products.searchProducts('a')).value!;
    expect(hits.length).toBeGreaterThan(0);
    expect(run(api.pricing.prices([hits[0].sku])).value![0].price).toBeGreaterThan(0);
    signIn(api);
    expect(run(api.session.profile()).value!.name).toBeTruthy();
    run(api.session.logout());
    expect(status(run(api.session.profile()).error)).toBe(401);
    discardPeriodicTasks();
  }));

  it('returns ids for entities of other services, never their shape', fakeAsync(() => {
    const api = apis();
    signIn(api);
    const hit = run(api.customers.searchCustomers({})).value!.items[0];
    expect(Object.keys(hit).sort()).toEqual(['customerId', 'email', 'name']);
    expect(Object.keys(run(api.customers.customer(hit.customerId)).value!)).not.toContain('counters');
    const { orderId, ticketId } = editable(api);
    const order = run(api.orders.order(orderId)).value!;
    expect(Object.keys(order.lines[0]).sort()).toEqual(['qty', 'sku', 'unitPrice']);
    expect(order).not.toHaveProperty('ticketId');
    const message = run(api.tickets.ticket(ticketId)).value!.messages[0];
    expect(message).toHaveProperty('authorId');
    expect(message).not.toHaveProperty('author');
    const notification = run(api.notifications.notifications()).value![0];
    expect(notification).not.toHaveProperty('text');
    discardPeriodicTasks();
  }));

  it('limits batch calls to MAX_BATCH ids', fakeAsync(() => {
    const api = apis();
    signIn(api);
    const ids = run(api.customers.searchCustomers({ page: 1 })).value!.items.map((c) => c.customerId);
    expect(run(api.customers.tiers(ids)).value!.length).toBe(ids.length);
    const tooMany = Array.from({ length: MAX_BATCH + 1 }, (_, i) => 1001 + i);
    expect(status(run(api.customers.tiers(tooMany)).error)).toBe(400);
    expect(status(run(api.tickets.ticketCounts(tooMany)).error)).toBe(400);
    expect(status(run(api.products.products(tooMany.map(String))).error)).toBe(400);
    discardPeriodicTasks();
  }));

  it('pages, filters and sorts customers by data of other services', fakeAsync(() => {
    const api = apis();
    signIn(api);
    const page1 = run(api.customers.searchCustomers({ sort: 'spend', dir: 'desc' })).value!;
    expect(page1.items.length).toBe(8);
    const spend = (id: number) => run(api.orders.orderStats(id)).value!.lifetimeSpend;
    expect(spend(page1.items[0].customerId)).toBeGreaterThanOrEqual(spend(page1.items[7].customerId));
    const vip = run(api.customers.searchCustomers({ filter: 'vip' })).value!;
    const tiers = run(api.customers.tiers(vip.items.map((c) => c.customerId))).value!;
    expect(tiers.every((t) => t.tier === 'VIP')).toBe(true);
    discardPeriodicTasks();
  }));

  it('changes an order and replies on its ticket in one write; stats and counts follow', fakeAsync(() => {
    const api = apis();
    signIn(api);
    const { customerId, orderId, ticketId } = editable(api);
    const before = run(api.orders.order(orderId)).value!;
    const statsBefore = run(api.orders.orderStats(customerId)).value!;
    const hit = run(api.products.searchProducts('e')).value!.find(
      (p) => !before.lines.some((l) => l.sku === p.sku) && run(api.inventory.stock([p.sku])).value![0].stock > 0,
    )!;
    const price = run(api.pricing.prices([hit.sku])).value![0].price;
    const lines = [...before.lines.map((l) => ({ sku: l.sku, qty: l.qty })), { sku: hit.sku, qty: 1 }];

    const saved = run(api.orders.updateOrder(orderId, lines, { ticketId, text: 'Added.' })).value!;

    expect(saved.total).toBe(before.total + price);
    expect(saved.lines.find((l) => l.sku === hit.sku)!.unitPrice).toBe(price);
    expect(run(api.orders.orderStats(customerId)).value!.lifetimeSpend).toBe(statsBefore.lifetimeSpend + price);
    const thread = run(api.tickets.ticket(ticketId)).value!;
    expect(thread.messages.at(-1)!.text).toBe('Added.');
    expect(thread.status).toBe('Waiting');
    const author = thread.messages.at(-1)!.authorId;
    expect(run(api.agents.agents([author])).value![0].name).toBe(run(api.session.profile()).value!.name);
    discardPeriodicTasks();
  }));

  it('refuses to change a shipped order', fakeAsync(() => {
    const api = apis();
    signIn(api);
    const rows = run(api.customers.searchCustomers({})).value!.items;
    const shipped = rows.flatMap((c) => run(api.orders.orders(c.customerId)).value!).find((o) => o.status !== 'Processing')!;
    expect(status(run(api.orders.updateOrder(shipped.orderId, [{ sku: 'X', qty: 1 }])).error)).toBe(409);
    discardPeriodicTasks();
  }));

  it('cancels a read on unsubscribe, but a write still reaches the backend', fakeAsync(() => {
    const api = apis();
    signIn(api);
    api.transport.latency.set('manual');

    const read: Subscription = api.customers.searchCustomers({}).subscribe();
    expect(api.transport.pendingCalls('customers').length).toBe(1);
    read.unsubscribe();
    expect(api.transport.pendingCalls('customers').length).toBe(0);
    expect(api.transport.stats().customers.cancelled).toBe(1);

    const customerId = 1001;
    api.notes.addNote(customerId, 'sent, then the client left').subscribe().unsubscribe();
    expect(api.transport.stats().addNote.cancelled).toBe(1);
    api.transport.pendingCalls('addNote')[0].release(); // the server still gets it

    api.transport.latency.set('fast');
    let texts: string[] = [];
    api.notes.notes(customerId).subscribe((n) => (texts = n.map((x) => x.text)));
    tick(500);
    expect(texts).toContain('sent, then the client left');
    discardPeriodicTasks();
  }));

  it('pushes notifications on a timer while signed in, even with no subscriber', fakeAsync(() => {
    const api = apis();
    const events: PushEvent[] = [];
    api.notifications.push$.subscribe((e) => events.push(e));

    tick(PUSH_PERIOD_MS);
    expect(events.length).toBe(0); // signed out

    signIn(api);
    const before = run(api.notifications.notifications()).value!.length;
    tick(PUSH_PERIOD_MS);
    expect(events.length).toBe(1);

    tick(PUSH_PERIOD_MS * 2); // hot: the server keeps creating them
    const after = run(api.notifications.notifications()).value!;
    expect(after.length).toBe(before + 3);
    expect(after[0].unread).toBe(true);
    discardPeriodicTasks();
  }));

  it('grows the activity list on every poll after the first', fakeAsync(() => {
    const api = apis();
    signIn(api);
    const first = run(api.activity.activity(1001)).value!;
    const second = run(api.activity.activity(1001)).value!;
    expect(second.length).toBe(first.length + 1);
    expect(second[0]).toEqual(expect.objectContaining({ kind: 'product-viewed' }));
    discardPeriodicTasks();
  }));
});
