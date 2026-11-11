import { firstCustomers, prepareOrderEdit } from './flows';
import { signedInScenario, usd0 } from './scenario';
import type { ConsolePage } from './console-page.harness';

// Ported from e2e/specs/b-change.spec.ts.

const KEYS_OF_CUSTOMER = ['customer', 'orders', 'activity'] as const;
const listIds = (c: ConsolePage) =>
  firstCustomers(c, 99)
    .map((r) => r.id)
    .join();

describe('B · change of input (stage 1)', () => {
  signedInScenario('B1', 1, 'the latest customer wins a race', async (c) => {
    const [a, b] = await firstCustomers(c);
    await c.selectCustomer(a.id, a.name);
    expect(c.pending('customer').length).toBeGreaterThan(0);
    await c.selectCustomer(b.id, b.name);
    for (const key of KEYS_OF_CUSTOMER)
      await c.releaseFor(key, (arg) => arg === b.id);
    await c.settle();
    expect(c.text('customer-name')).toBe(b.name);
    expect(c.shownForCustomer(a.id, 'console-main')).toHaveLength(0);
    expect(c.shownForCustomer(a.id, 'console-rail')).toHaveLength(0);
  });

  signedInScenario(
    'B2',
    1,
    'a block that is not loading never shows the previous customer',
    async (c) => {
      const [a, b] = await firstCustomers(c);
      await c.selectAndSettle(a.id, a.name);
      await c.selectCustomer(b.id, b.name);
      await c.idle(200);
      // old data may stay under a block's spinner; outside a loading block nothing of the previous customer shows
      expect(c.shownForCustomerSettled(a.id, 'console-main')).toHaveLength(0);
      expect(c.shownForCustomerSettled(a.id, 'console-rail')).toHaveLength(0);
    },
  );

  signedInScenario(
    'B4',
    1,
    'typing a search ends on the whole text, page 1',
    async (c, fx) => {
      const word = fx.allDelivered.customerName.split(' ')[1].slice(0, 5);
      await c.type('customer-search', word);
      await c.idle(500);
      await c.settle();
      expect(c.text('page-info')).toContain('page 1');
      const names = c
        .all('customers')[0]
        .querySelectorAll('[data-customer-id] .truncate');
      expect(names.length).toBeGreaterThan(0);
      for (const n of names)
        expect((n.textContent ?? '').toLowerCase()).toContain(
          word.toLowerCase(),
        );
    },
  );

  signedInScenario(
    'B5',
    1,
    'a filter change goes back to page 1',
    async (c) => {
      await c.click('page-next');
      await c.settle();
      await c.click('page-next');
      await c.settle();
      expect(c.text('page-info')).toContain('page 3');
      await c.click('filter-vip');
      await c.idle();
      await c.settle();
      expect(c.text('page-info')).toContain('page 1');
    },
  );

  signedInScenario(
    'B6',
    1,
    'an old list response never replaces a newer one',
    async (c) => {
      await c.select('sort', 'spend');
      expect(c.pending('customers').length).toBeGreaterThan(0);
      await c.select('sort', 'lastOrder');
      await c.idle();
      await c.releaseFor(
        'customers',
        (arg) => (arg as { sort?: string }).sort === 'lastOrder',
      );
      await c.idle(200);
      const shown = listIds(c);
      if (c.pending('customers').length) await c.release('customers');
      await c.idle(200);
      expect(listIds(c)).toBe(shown);
    },
  );

  signedInScenario(
    'B7',
    1,
    'the latest order wins in the order panel',
    async (c, fx) => {
      const [o1, o2] = fx.twoInFlight.orderIds;
      await c.selectAndSettle(
        fx.twoInFlight.customerId,
        fx.twoInFlight.customerName,
      );
      await c.openOrder(o1);
      expect(c.pending('order').length).toBeGreaterThan(0);
      await c.click('close-panel');
      await c.openOrder(o2);
      await c.releaseFor('order', (arg) => arg === o2);
      if (c.pending('order').length) await c.release('order');
      await c.settle();
      expect(c.one('order-panel')!.getAttribute('data-order-id')).toBe(o2);
      expect(
        (c.one('order-panel')!.querySelector('h3')!.textContent ?? '').trim(),
      ).toBe(o2);
    },
  );

  signedInScenario(
    'B9',
    1,
    'the latest customer wins for the counters too',
    async (c) => {
      const [a, b] = await firstCustomers(c);
      await c.selectCustomer(a.id, a.name);
      expect(c.pending('orderStats').length).toBeGreaterThan(0);
      await c.selectCustomer(b.id, b.name);
      await c.releaseFor('orderStats', (arg) => arg === b.id);
      await c.idle(100);
      await c.settle();
      const stats = c.truth('orderStats', b.id);
      expect(c.text('kpi-spend')).toBe(usd0(stats.lifetimeSpend));
      expect(c.text('kpi-orders')).toBe(String(stats.orders));
      expect(
        new Set(c.fieldStates(c.one('customer-header')!, 'kpi-spend')),
      ).toEqual(new Set(['shown']));
    },
  );
});

describe('B · change of input (stage 2)', () => {
  signedInScenario(
    'B1',
    2,
    'superseded customer reads are cancelled',
    async (c) => {
      const [a, b] = await firstCustomers(c);
      c.resetStats();
      await c.selectCustomer(a.id, a.name);
      expect(c.pending('customer').length).toBeGreaterThan(0);
      await c.selectCustomer(b.id, b.name);
      await c.idle(200);
      expect(c.stats('customer').cancelled).toBeGreaterThanOrEqual(1);
    },
  );

  signedInScenario(
    'B3',
    2,
    'a same-key reload keeps the content, dimmed',
    async (c, fx) => {
      await prepareOrderEdit(c, fx.editable);
      await c.click('save');
      await c.release('updateOrder');
      expect(c.pending('orders').length).toBeGreaterThan(0);
      await c.click('close-panel');
      await c.tab('orders');
      expect(c.state('tab-orders')).toBe('reloading');
      expect(c.shown(`order-${fx.editable.orderId}`).length).toBe(1);
      await c.settle();
      expect(c.state('tab-orders')).toBe('ready');
    },
  );

  signedInScenario(
    'B8',
    2,
    'a superseded order read is cancelled',
    async (c, fx) => {
      const [o1, o2] = fx.twoInFlight.orderIds;
      await c.selectAndSettle(
        fx.twoInFlight.customerId,
        fx.twoInFlight.customerName,
      );
      c.resetStats();
      await c.openOrder(o1);
      expect(c.pending('order').length).toBeGreaterThan(0);
      await c.click('close-panel');
      await c.openOrder(o2);
      await c.idle(200);
      expect(c.stats('order').cancelled).toBeGreaterThanOrEqual(1);
    },
  );
});

describe('B · change of input (stage 3)', () => {
  signedInScenario(
    'B4',
    3,
    'the search is debounced: one request per pause',
    async (c, fx) => {
      c.resetStats();
      await c.type('customer-search', fx.allDelivered.customerName.slice(0, 5));
      await c.idle(600);
      expect(c.total('customers')).toBe(1);
      await c.settle();
      const t = c.totals('tiers', 'ticketCounts');
      expect(t['tiers']).toBeLessThanOrEqual(1);
      expect(t['ticketCounts']).toBeLessThanOrEqual(1);
    },
  );

  signedInScenario(
    'B5',
    3,
    'a filter change resets the page in one request',
    async (c) => {
      await c.click('page-next');
      await c.settle();
      c.resetStats();
      await c.click('filter-vip');
      await c.idle(500);
      expect(c.total('customers')).toBe(1);
    },
  );

  signedInScenario(
    'B10',
    3,
    'the editor search is debounced: one search, one batch of prices, stock once per hit',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.settle();
      await c.click('edit-items');
      c.resetStats();
      await c.type('catalog-search', fx.editable.addName.slice(0, 5));
      await c.idle(600);
      await c.settle();
      expect(c.total('searchProducts')).toBe(1);
      const t = c.totals('prices', 'stock');
      expect(t['prices']).toBeLessThanOrEqual(1);
      // stock has no batch endpoint: one call per hit of the one search, none twice
      const hits = c.truth<unknown[]>(
        'searchProducts',
        fx.editable.addName.slice(0, 5),
      ).length;
      expect(t['stock']).toBeLessThanOrEqual(hits);
      const stockCalls = c.calls<string>('stock');
      expect(new Set(stockCalls).size).toBe(stockCalls.length);
    },
  );
});
