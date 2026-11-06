import { firstCustomers, prepareOrderEdit } from './flows';
import { signedInScenario, usd0 } from './scenario';
import type { ConsolePage } from './console-page.harness';

// Ported from e2e/specs/b-change.spec.ts.

const KEYS_OF_CUSTOMER = ['customer', 'orders', 'activity'] as const;
const listIds = (c: ConsolePage) => firstCustomers(c, 99).map((r) => r.id).join();

describe('B · change of input (stage 1)', () => {
  signedInScenario('B1', 1, 'the latest customer wins a race', (c) => {
    const [a, b] = firstCustomers(c);
    c.selectCustomer(a.id, a.name);
    expect(c.pending('customer').length).toBeGreaterThan(0);
    c.selectCustomer(b.id, b.name);
    for (const key of KEYS_OF_CUSTOMER) c.releaseFor(key, (arg) => arg === b.id);
    c.settle();
    expect(c.text('customer-name')).toBe(b.name);
    expect(c.shownForCustomer(a.id, 'console-main')).toHaveLength(0);
    expect(c.shownForCustomer(a.id, 'console-rail')).toHaveLength(0);
  });

  signedInScenario('B2', 1, 'switching customer never shows the previous one', (c) => {
    const [a, b] = firstCustomers(c);
    c.selectAndSettle(a.id, a.name);
    c.selectCustomer(b.id, b.name);
    c.idle(200);
    expect(c.shownForCustomer(a.id, 'console-main')).toHaveLength(0);
    expect(c.shownForCustomer(a.id, 'console-rail')).toHaveLength(0);
  });

  signedInScenario('B4', 1, 'typing a search ends on the whole text, page 1', (c, fx) => {
    const word = fx.allDelivered.customerName.split(' ')[1].slice(0, 5);
    c.type('customer-search', word);
    c.idle(500);
    c.settle();
    expect(c.text('page-info')).toContain('page 1');
    const names = c.all('customers')[0].querySelectorAll('[data-customer-id] .truncate');
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect((n.textContent ?? '').toLowerCase()).toContain(word.toLowerCase());
  });

  signedInScenario('B5', 1, 'a filter change goes back to page 1', (c) => {
    c.click('page-next');
    c.settle();
    c.click('page-next');
    c.settle();
    expect(c.text('page-info')).toContain('page 3');
    c.click('filter-vip');
    c.idle();
    c.settle();
    expect(c.text('page-info')).toContain('page 1');
  });

  signedInScenario('B6', 1, 'an old list response never replaces a newer one', (c) => {
    c.select('sort', 'spend');
    expect(c.pending('customers').length).toBeGreaterThan(0);
    c.select('sort', 'lastOrder');
    c.idle();
    c.releaseFor('customers', (arg) => (arg as { sort?: string }).sort === 'lastOrder');
    c.idle(200);
    const shown = listIds(c);
    if (c.pending('customers').length) c.release('customers');
    c.idle(200);
    expect(listIds(c)).toBe(shown);
  });

  signedInScenario('B7', 1, 'the latest order wins in the order panel', (c, fx) => {
    const [o1, o2] = fx.twoInFlight.orderIds;
    c.selectAndSettle(fx.twoInFlight.customerId, fx.twoInFlight.customerName);
    c.openOrder(o1);
    expect(c.pending('order').length).toBeGreaterThan(0);
    c.click('close-panel');
    c.openOrder(o2);
    c.releaseFor('order', (arg) => arg === o2);
    if (c.pending('order').length) c.release('order');
    c.settle();
    expect(c.one('order-panel')!.getAttribute('data-order-id')).toBe(o2);
    expect((c.one('order-panel')!.querySelector('h3')!.textContent ?? '').trim()).toBe(o2);
  });

  signedInScenario('B9', 1, 'the latest customer wins for the counters too', (c) => {
    const [a, b] = firstCustomers(c);
    c.selectCustomer(a.id, a.name);
    expect(c.pending('orderStats').length).toBeGreaterThan(0);
    c.selectCustomer(b.id, b.name);
    c.releaseFor('orderStats', (arg) => arg === b.id);
    c.idle(100);
    c.settle();
    const stats = c.truth('orderStats', b.id);
    expect(c.text('kpi-spend')).toBe(usd0(stats.lifetimeSpend));
    expect(c.text('kpi-orders')).toBe(String(stats.orders));
    expect(new Set(c.partStates(c.one('customer-header')!, 'kpi-spend'))).toEqual(new Set(['ready']));
  });
});

describe('B · change of input (stage 2)', () => {
  signedInScenario('B1', 2, 'superseded customer reads are cancelled', (c) => {
    const [a, b] = firstCustomers(c);
    c.resetStats();
    c.selectCustomer(a.id, a.name);
    expect(c.pending('customer').length).toBeGreaterThan(0);
    c.selectCustomer(b.id, b.name);
    c.idle(200);
    expect(c.stats('customer').cancelled).toBeGreaterThanOrEqual(1);
  });

  signedInScenario('B3', 2, 'a same-key reload keeps the content, dimmed', (c, fx) => {
    prepareOrderEdit(c, fx.editable);
    c.click('save');
    c.release('updateOrder');
    expect(c.pending('orders').length).toBeGreaterThan(0);
    c.click('close-panel');
    c.tab('orders');
    expect(c.state('tab-orders')).toBe('reloading');
    expect(c.shown(`order-${fx.editable.orderId}`).length).toBe(1);
    c.settle();
    expect(c.state('tab-orders')).toBe('ready');
  });

  signedInScenario('B8', 2, 'a superseded order read is cancelled', (c, fx) => {
    const [o1, o2] = fx.twoInFlight.orderIds;
    c.selectAndSettle(fx.twoInFlight.customerId, fx.twoInFlight.customerName);
    c.resetStats();
    c.openOrder(o1);
    expect(c.pending('order').length).toBeGreaterThan(0);
    c.click('close-panel');
    c.openOrder(o2);
    c.idle(200);
    expect(c.stats('order').cancelled).toBeGreaterThanOrEqual(1);
  });
});

describe('B · change of input (stage 3)', () => {
  signedInScenario('B4', 3, 'the search is debounced: one request per pause', (c, fx) => {
    c.resetStats();
    c.type('customer-search', fx.allDelivered.customerName.slice(0, 5));
    c.idle(600);
    expect(c.total('customers')).toBe(1);
    c.settle();
    const t = c.totals('tiers', 'ticketCounts');
    expect(t['tiers']).toBeLessThanOrEqual(1);
    expect(t['ticketCounts']).toBeLessThanOrEqual(1);
  });

  signedInScenario('B5', 3, 'a filter change resets the page in one request', (c) => {
    c.click('page-next');
    c.settle();
    c.resetStats();
    c.click('filter-vip');
    c.idle(500);
    expect(c.total('customers')).toBe(1);
  });

  signedInScenario('B10', 3, 'the editor search is debounced: one search, one batch of prices and stock', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.openOrder(fx.editable.orderId);
    c.settle();
    c.click('edit-items');
    c.resetStats();
    c.type('catalog-search', fx.editable.addName.slice(0, 5));
    c.idle(600);
    c.settle();
    expect(c.total('searchProducts')).toBe(1);
    const t = c.totals('prices', 'stock');
    expect(t['prices']).toBeLessThanOrEqual(1);
    expect(t['stock']).toBeLessThanOrEqual(1);
  });
});
