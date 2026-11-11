import {
  firstCustomers,
  prepareOrderEdit,
  searchProducts,
  withCartOrderOverlap,
} from './flows';
import { scenario, signedInScenario, withCart } from './scenario';
import type { ConsoleApiKey } from '../../../services/contesters/backend/api-keys';

// Ported from e2e/specs/c-cache.spec.ts (all stage 3).

const none = (keys: ConsoleApiKey[]) =>
  Object.fromEntries(keys.map((k) => [k, 0]));
const ready = (c: { state(s: string): unknown }, section: string) =>
  ['ready', 'empty'].includes(c.state(section) as string);

describe('C · cache and sharing (stage 3)', () => {
  signedInScenario(
    'C1',
    3,
    'a customer loads only what is shown, once per key',
    async (c, fx) => {
      const { customerId, customerName, orderIds } = fx.twoInFlight;
      const row = await c.findCustomer(customerId, customerName);
      // the list's own calls (tiers, counters) may still be on their way: a batch leaves in a later task than the page
      await c.settle();
      c.resetStats();
      await c.click(row);
      await c.settle();
      expect(
        c.totals('customer', 'orderStats', 'orders', 'activity', 'shipment'),
      ).toEqual({
        customer: 1,
        orderStats: 1,
        orders: 1,
        activity: 1,
        shipment: orderIds.length,
      });
      // the list already loaded this customer's tier and counter; names come with the viewed products, one call each (no batch endpoint), never twice
      const named = c.calls<string>('product');
      expect(new Set(named).size).toBe(named.length);
      const rest: ConsoleApiKey[] = [
        'ticketCounts',
        'tiers',
        'cart',
        'tickets',
        'notes',
        'order',
        'ticketsByOrder',
        'ticket',
        'agent',
        'prices',
        'stock',
        'searchProducts',
      ];
      expect(c.totals(...rest)).toEqual(none(rest));
    },
  );

  signedInScenario(
    'C2',
    3,
    'a tab shown again comes from cache',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.tab('cart');
      await c.settle();
      await c.tab('tickets');
      await c.settle();
      c.resetStats();
      await c.tab('cart');
      expect(ready(c, 'tab-cart')).toBe(true);
      await c.idle(200);
      expect(c.totals('cart', 'product', 'prices')).toEqual({
        cart: 0,
        product: 0,
        prices: 0,
      });
    },
  );

  signedInScenario(
    'C3',
    3,
    'going back to a customer comes from cache',
    async (c) => {
      const [a, b] = await firstCustomers(c);
      await c.selectAndSettle(a.id, a.name);
      await c.selectAndSettle(b.id, b.name);
      c.resetStats();
      await c.selectCustomer(a.id, a.name);
      expect(c.state('customer-header')).toBe('ready');
      expect(c.text('customer-name')).toBe(a.name);
      await c.idle(200);
      expect(
        c.totals(
          'customer',
          'orders',
          'activity',
          'orderStats',
          'ticketCounts',
          'product',
        ),
      ).toEqual({
        customer: 0,
        orders: 0,
        activity: 0,
        orderStats: 0,
        ticketCounts: 0,
        product: 0,
      });
    },
  );

  signedInScenario(
    'C4',
    3,
    'a list page shown again comes from cache',
    async (c) => {
      await c.click('page-next');
      await c.settle();
      c.resetStats();
      await c.click('page-prev');
      expect(c.text('page-info')).toContain('page 1');
      await c.idle(300);
      expect(c.totals('customers', 'tiers', 'ticketCounts')).toEqual({
        customers: 0,
        tiers: 0,
        ticketCounts: 0,
      });
    },
  );

  signedInScenario(
    'C5',
    3,
    'the dropdown shares the badge request',
    async (c) => {
      c.resetStats();
      await c.click('bell');
      await c.click('bell');
      await c.click('bell');
      await c.idle(200);
      expect(c.total('notifications')).toBe(0);
    },
  );

  signedInScenario(
    'C6',
    3,
    'an order opened again comes from cache',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.settle();
      await c.click('close-panel');
      c.resetStats();
      await c.openOrder(fx.editable.orderId);
      expect(c.state('order-panel')).toBe('ready');
      await c.idle(200);
      expect(c.totals('order', 'ticketsByOrder', 'product')).toEqual({
        order: 0,
        ticketsByOrder: 0,
        product: 0,
      });
    },
  );

  signedInScenario(
    'C7',
    3,
    'the editor requests nothing until a text is typed, and remembers searches',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.settle();
      c.resetStats();
      await c.click('edit-items');
      await c.idle(500);
      expect(c.totals('searchProducts', 'prices', 'stock')).toEqual({
        searchProducts: 0,
        prices: 0,
        stock: 0,
      });
      const first = fx.editable.addName.slice(0, 10);
      await searchProducts(c, first);
      // prices are one batch; stock has no batch endpoint: one call per hit
      expect(c.totals('searchProducts', 'prices', 'stock')).toEqual({
        searchProducts: 1,
        prices: 1,
        stock: c.truth<unknown[]>('searchProducts', first).length,
      });
      await searchProducts(c, fx.editable.addName.slice(0, 4));
      c.resetStats();
      await searchProducts(c, first);
      expect(c.fieldsAre(c.one('catalog-search')!, 'hit-price', 'shown')).toBe(
        true,
      );
      expect(c.totals('searchProducts', 'prices', 'stock')).toEqual({
        searchProducts: 0,
        prices: 0,
        stock: 0,
      });
    },
  );

  signedInScenario(
    'C8',
    3,
    'no tracking requested when nothing is in flight',
    async (c, fx) => {
      const row = await c.findCustomer(
        fx.allDelivered.customerId,
        fx.allDelivered.customerName,
      );
      c.resetStats();
      await c.click(row);
      await c.settle();
      expect(c.total('shipment')).toBe(0);
      expect(c.state('shipments')).toBe('empty');
    },
  );

  signedInScenario('C9', 3, 'polls run only for what is shown', async (c) => {
    c.resetStats();
    await c.idle(30_000);
    await c.idle(200);
    await c.idle(30_000);
    await c.idle(200);
    expect(c.totals('activity', 'orderStats', 'notifications')).toEqual({
      activity: 0,
      orderStats: 0,
      notifications: 2,
    });
  });

  signedInScenario(
    'C15',
    3,
    'the activity poll runs only for the selected customer',
    async (c) => {
      const [a, b] = await firstCustomers(c);
      await c.selectAndSettle(a.id, a.name);
      await c.selectAndSettle(b.id, b.name);
      c.resetStats();
      await c.idle(30_000);
      await c.idle(200);
      await c.idle(30_000);
      await c.idle(200);
      const polled = c.calls<number>('activity');
      expect(polled.length).toBeGreaterThan(0);
      expect(polled.filter((id) => id !== b.id)).toEqual([]);
    },
  );

  signedInScenario(
    'C10',
    3,
    'notification sentences look customers up only while the dropdown is open',
    async (c) => {
      expect(c.total('customer')).toBe(0);
      const customers = new Set(
        c
          .truth<{ kind: string; customerId: number }[]>('notifications')
          .filter((n) => n.kind === 'ticket-reply')
          .map((n) => n.customerId),
      );
      expect(customers.size).toBeGreaterThan(0);
      await c.click('bell');
      await c.waitPending('customer', customers.size);
      await c.settle();
      expect(c.total('customer')).toBe(customers.size);
      expect(c.isLoading(c.one('notifications')!)).toBe(false);
      await c.click('bell');
      await c.click('bell');
      await c.idle(200);
      expect(c.total('customer')).toBe(customers.size);
    },
  );

  scenario(
    'C11',
    3,
    'a list page asks tiers and counters once, for all its rows',
    async (c) => {
      await c.login();
      await c.releaseFor('customers', () => true);
      await c.waitPending('tiers');
      await c.waitPending('ticketCounts');
      await c.settle();
      const rows = await firstCustomers(c, 99).map((r) => r.id);
      expect(rows.length).toBe(8);
      const tiers = c.calls<number[]>('tiers');
      const counts = c.calls<number[]>('ticketCounts');
      expect(tiers.length).toBe(1);
      expect(counts.length).toBe(1);
      expect([...tiers[0]].sort()).toEqual([...rows].sort());
      expect([...counts[0]].sort()).toEqual([...rows].sort());
    },
  );

  signedInScenario(
    'C12',
    3,
    'the prices of a long cart are asked in batches of 20 (names one by one)',
    async (c, fx) => {
      const { customerId, customerName, lines } = fx.bigCart;
      await c.selectAndSettle(customerId, customerName);
      c.resetStats();
      await c.tab('cart');
      await c.settle();
      expect(c.fieldsAre(c.one('tab-cart')!, 'line-name', 'shown')).toBe(true);
      expect(c.truth<unknown[]>('cart', customerId).length).toBe(lines);
      // prices have a batch endpoint: at most 20 ids per call, the fewest calls
      const priceCalls = c.calls<string[]>('prices');
      expect(priceCalls.every((ids) => ids.length <= 20)).toBe(true);
      expect(priceCalls.length).toBe(Math.ceil(priceCalls.flat().length / 20));
      expect(priceCalls.flat().length).toBe(lines);
      expect(c.stats('prices').errors).toBe(0);
      // names have none: one call per sku, never twice
      const nameCalls = c.calls<string>('product');
      expect(new Set(nameCalls).size).toBe(nameCalls.length);
      expect(nameCalls.length).toBeLessThanOrEqual(lines); // fewer if a name was cached by the activity
      expect(nameCalls.length).toBeGreaterThan(lines - 5);
      expect(c.stats('product').errors).toBe(0);
    },
  );

  signedInScenario(
    'C13',
    3,
    'a sku shown in several sections is asked of products once',
    async (c) => {
      const { customerId, customerName, orderId } = withCartOrderOverlap(c);
      c.resetStats();
      await c.selectAndSettle(customerId, customerName);
      await c.tab('cart');
      await c.settle();
      await c.tab('orders');
      await c.openOrder(orderId);
      await c.settle();
      expect(c.isLoading(c.one('order-panel')!)).toBe(false);
      const asked = c.calls<string>('product');
      expect(asked.length).toBeGreaterThan(0);
      expect(new Set(asked).size).toBe(asked.length);
    },
  );

  signedInScenario(
    'C14',
    3,
    'caches are shared between sections',
    async (c) => {
      await c.click('bell');
      await c.settle();
      const notified =
        c.truth<{ kind: string; customerId: number }[]>('notifications');
      const customerId = notified.find(
        (n) => n.kind === 'ticket-reply',
      )!.customerId;
      const { name } = c.truth('customer', customerId);
      await c.click('bell');
      const row = await c.findCustomer(customerId, name);
      c.resetStats();
      await c.click(row);
      await c.settle();
      expect(c.state('customer-header')).toBe('ready');
      // the sentence's look-up is the header's profile; the row's counter is the KPI's
      expect(c.totals('customer', 'ticketCounts')).toEqual({
        customer: 0,
        ticketCounts: 0,
      });
    },
  );

  signedInScenario(
    'C16',
    3,
    'an order change refreshes the stock of the skus it touches, and only those',
    async (c, fx) => {
      await prepareOrderEdit(c, fx.editable);
      // touched: the order's lines before the change plus the added one
      const touched = new Set([
        ...c
          .truth<{ lines: { sku: string }[] }>('order', fx.editable.orderId)
          .lines.map((l) => l.sku),
        fx.editable.addSku,
      ]);
      c.resetStats();
      await c.click('save');
      await c.release('updateOrder');
      await c.settle();
      await c.click('edit-items');
      await c.settle();
      await searchProducts(c, fx.editable.addName.slice(0, 10));
      // now (eager) or when shown again (lazy): either way the added sku is asked again, and no untouched hit is
      const asked = c.calls<string>('stock');
      expect(asked).toContain(fx.editable.addSku);
      expect(asked.filter((sku) => !touched.has(sku))).toEqual([]);
      const hit = c
        .one('catalog-search')!
        .querySelector<HTMLElement>(`[data-sku="${fx.editable.addSku}"]`)!;
      expect(c.text('hit-stock', hit)).toContain(
        String(c.truth<{ stock: number }>('stock', fx.editable.addSku).stock),
      );
    },
  );
});

void withCart;
