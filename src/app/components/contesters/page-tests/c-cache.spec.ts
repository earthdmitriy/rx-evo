import { firstCustomers, searchProducts, withCartOrderOverlap } from './flows';
import { scenario, signedInScenario, withCart } from './scenario';
import type { ConsoleApiKey } from '../../../services/contesters/backend/api-keys';

// Ported from e2e/specs/c-cache.spec.ts (all stage 3).

const none = (keys: ConsoleApiKey[]) => Object.fromEntries(keys.map((k) => [k, 0]));
const ready = (c: { state(s: string): unknown }, section: string) => ['ready', 'empty'].includes(c.state(section) as string);

describe('C · cache and sharing (stage 3)', () => {
  signedInScenario('C1', 3, 'a customer loads only what is shown, once per key', (c, fx) => {
    const { customerId, customerName, orderIds } = fx.twoInFlight;
    const row = c.findCustomer(customerId, customerName);
    c.resetStats();
    c.click(row);
    c.settle();
    expect(c.totals('customer', 'orderStats', 'orders', 'activity', 'shipment')).toEqual({
      customer: 1, orderStats: 1, orders: 1, activity: 1, shipment: orderIds.length,
    });
    // the list already loaded this customer's tier and counter; names come with the viewed products
    expect(c.total('products')).toBeLessThanOrEqual(1);
    const rest: ConsoleApiKey[] = ['ticketCounts', 'tiers', 'cart', 'tickets', 'notes', 'order', 'ticketsByOrder', 'ticket', 'agents', 'prices', 'stock', 'searchProducts'];
    expect(c.totals(...rest)).toEqual(none(rest));
  });

  signedInScenario('C2', 3, 'a tab shown again comes from cache', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.tab('cart');
    c.settle();
    c.tab('tickets');
    c.settle();
    c.resetStats();
    c.tab('cart');
    expect(ready(c, 'tab-cart')).toBe(true);
    c.idle(200);
    expect(c.totals('cart', 'products', 'prices')).toEqual({ cart: 0, products: 0, prices: 0 });
  });

  signedInScenario('C3', 3, 'going back to a customer comes from cache', (c) => {
    const [a, b] = firstCustomers(c);
    c.selectAndSettle(a.id, a.name);
    c.selectAndSettle(b.id, b.name);
    c.resetStats();
    c.selectCustomer(a.id, a.name);
    expect(c.state('customer-header')).toBe('ready');
    expect(c.text('customer-name')).toBe(a.name);
    c.idle(200);
    expect(c.totals('customer', 'orders', 'activity', 'orderStats', 'ticketCounts', 'products')).toEqual({
      customer: 0, orders: 0, activity: 0, orderStats: 0, ticketCounts: 0, products: 0,
    });
  });

  signedInScenario('C4', 3, 'a list page shown again comes from cache', (c) => {
    c.click('page-next');
    c.settle();
    c.resetStats();
    c.click('page-prev');
    expect(c.text('page-info')).toContain('page 1');
    c.idle(300);
    expect(c.totals('customers', 'tiers', 'ticketCounts')).toEqual({ customers: 0, tiers: 0, ticketCounts: 0 });
  });

  signedInScenario('C5', 3, 'the dropdown shares the badge request', (c) => {
    c.resetStats();
    c.click('bell');
    c.click('bell');
    c.click('bell');
    c.idle(200);
    expect(c.total('notifications')).toBe(0);
  });

  signedInScenario('C6', 3, 'an order opened again comes from cache', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.openOrder(fx.editable.orderId);
    c.settle();
    c.click('close-panel');
    c.resetStats();
    c.openOrder(fx.editable.orderId);
    expect(c.state('order-panel')).toBe('ready');
    c.idle(200);
    expect(c.totals('order', 'ticketsByOrder', 'products')).toEqual({ order: 0, ticketsByOrder: 0, products: 0 });
  });

  signedInScenario('C7', 3, 'the editor requests nothing until a text is typed, and remembers searches', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.openOrder(fx.editable.orderId);
    c.settle();
    c.resetStats();
    c.click('edit-items');
    c.idle(500);
    expect(c.totals('searchProducts', 'prices', 'stock')).toEqual({ searchProducts: 0, prices: 0, stock: 0 });
    const first = fx.editable.addName.slice(0, 10);
    searchProducts(c, first);
    expect(c.totals('searchProducts', 'prices', 'stock')).toEqual({ searchProducts: 1, prices: 1, stock: 1 });
    searchProducts(c, fx.editable.addName.slice(0, 4));
    c.resetStats();
    searchProducts(c, first);
    expect(c.partsAre(c.one('catalog-search')!, 'hit-price', 'ready')).toBe(true);
    expect(c.totals('searchProducts', 'prices', 'stock')).toEqual({ searchProducts: 0, prices: 0, stock: 0 });
  });

  signedInScenario('C8', 3, 'no tracking requested when nothing is in flight', (c, fx) => {
    const row = c.findCustomer(fx.allDelivered.customerId, fx.allDelivered.customerName);
    c.resetStats();
    c.click(row);
    c.settle();
    expect(c.total('shipment')).toBe(0);
    expect(c.state('shipments')).toBe('empty');
  });

  signedInScenario('C9', 3, 'polls run only for what is shown', (c) => {
    c.resetStats();
    c.idle(30_000);
    c.idle(200);
    c.idle(30_000);
    c.idle(200);
    expect(c.totals('activity', 'orderStats', 'notifications')).toEqual({ activity: 0, orderStats: 0, notifications: 2 });
  });

  signedInScenario('C10', 3, 'notification sentences look customers up only while the dropdown is open', (c) => {
    expect(c.total('customer')).toBe(0);
    const customers = new Set(c.truth<{ kind: string; customerId: number }[]>('notifications').filter((n) => n.kind === 'ticket-reply').map((n) => n.customerId));
    expect(customers.size).toBeGreaterThan(0);
    c.click('bell');
    c.waitPending('customer', customers.size);
    c.settle();
    expect(c.total('customer')).toBe(customers.size);
    expect(c.isLoading(c.one('notifications')!)).toBe(false);
    c.click('bell');
    c.click('bell');
    c.idle(200);
    expect(c.total('customer')).toBe(customers.size);
  });

  scenario('C11', 3, 'a list page asks tiers and counters once, for all its rows', (c) => {
    c.login();
    c.releaseFor('customers', () => true);
    c.waitPending('tiers');
    c.waitPending('ticketCounts');
    c.settle();
    const rows = firstCustomers(c, 99).map((r) => r.id);
    expect(rows.length).toBe(8);
    const tiers = c.calls<number[]>('tiers');
    const counts = c.calls<number[]>('ticketCounts');
    expect(tiers.length).toBe(1);
    expect(counts.length).toBe(1);
    expect([...tiers[0]].sort()).toEqual([...rows].sort());
    expect([...counts[0]].sort()).toEqual([...rows].sort());
  });

  signedInScenario('C12', 3, 'a long cart is asked in batches of 20', (c, fx) => {
    const { customerId, customerName, lines } = fx.bigCart;
    c.selectAndSettle(customerId, customerName);
    c.resetStats();
    c.tab('cart');
    c.settle();
    expect(c.partsAre(c.one('tab-cart')!, 'line-name', 'ready')).toBe(true);
    expect(c.truth<unknown[]>('cart', customerId).length).toBe(lines);
    for (const key of ['products', 'prices'] as const) {
      const calls = c.calls<string[]>(key);
      expect(calls.every((ids) => ids.length <= 20)).toBe(true);
      expect(calls.length).toBe(Math.ceil(calls.flat().length / 20));
      expect(c.stats(key).errors).toBe(0);
    }
    expect(c.calls<string[]>('prices').flat().length).toBe(lines);
  });

  signedInScenario('C13', 3, 'a sku shown in several sections is asked of products once', (c) => {
    const { customerId, customerName, orderId } = withCartOrderOverlap(c);
    c.resetStats();
    c.selectAndSettle(customerId, customerName);
    c.tab('cart');
    c.settle();
    c.tab('orders');
    c.openOrder(orderId);
    c.settle();
    expect(c.isLoading(c.one('order-panel')!)).toBe(false);
    const asked = c.calls<string[]>('products').flat();
    expect(asked.length).toBeGreaterThan(0);
    expect(new Set(asked).size).toBe(asked.length);
  });

  signedInScenario('C14', 3, 'caches are shared between sections', (c) => {
    c.click('bell');
    c.settle();
    const notified = c.truth<{ kind: string; customerId: number }[]>('notifications');
    const customerId = notified.find((n) => n.kind === 'ticket-reply')!.customerId;
    const { name } = c.truth('customer', customerId);
    c.click('bell');
    const row = c.findCustomer(customerId, name);
    c.resetStats();
    c.click(row);
    c.settle();
    expect(c.state('customer-header')).toBe('ready');
    // the sentence's look-up is the header's profile; the row's counter is the KPI's
    expect(c.totals('customer', 'ticketCounts')).toEqual({ customer: 0, ticketCounts: 0 });
  });
});

void withCart;
