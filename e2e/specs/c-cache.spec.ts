import { expect, scenario } from '../support/console';
import { firstCustomers, searchProducts, signedIn, withCartOrderOverlap } from '../support/flows';

const none = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, 0]));

// ---------- stage 3 ----------

scenario('C1', 3, 'a customer loads only what is shown, once per key', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, orderIds } = fx.twoInFlight;
  const row = await c.findCustomer(customerId, customerName);
  await c.resetStats();
  await row.click();
  await c.settle();
  const t = await c.totals('customer', 'orderStats', 'orders', 'activity', 'shipment');
  expect(t).toEqual({ customer: 1, orderStats: 1, orders: 1, activity: 1, shipment: orderIds.length });
  // the list already loaded this customer's tier and counter; names come with the viewed products
  expect((await c.total('products'))).toBeLessThanOrEqual(1);
  expect(await c.totals('ticketCounts', 'tiers', 'cart', 'tickets', 'notes', 'order', 'ticketsByOrder', 'ticket', 'agents', 'prices', 'stock', 'searchProducts')).toEqual(
    none(['ticketCounts', 'tiers', 'cart', 'tickets', 'notes', 'order', 'ticketsByOrder', 'ticket', 'agents', 'prices', 'stock', 'searchProducts']),
  );
}, { smoke: true });

scenario('C2', 3, 'a tab shown again comes from cache', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.tab('cart');
  await c.settle();
  await c.tab('tickets');
  await c.settle();
  await c.resetStats();
  await c.tab('cart');
  await c.expectState('tab-cart', 'ready', 'empty');
  await c.idle(200);
  expect(await c.totals('cart', 'products', 'prices')).toEqual({ cart: 0, products: 0, prices: 0 });
});

scenario('C3', 3, 'going back to a customer comes from cache', async ({ c }) => {
  await signedIn(c);
  const [a, b] = await firstCustomers(c);
  await c.selectAndSettle(a.id, a.name);
  await c.selectAndSettle(b.id, b.name);
  await c.resetStats();
  await c.selectCustomer(a.id, a.name);
  await c.expectState('customer-header', 'ready');
  await expect(c.testId('customer-name')).toHaveText(a.name);
  await c.idle(200);
  expect(await c.totals('customer', 'orders', 'activity', 'orderStats', 'ticketCounts', 'products')).toEqual({
    customer: 0, orders: 0, activity: 0, orderStats: 0, ticketCounts: 0, products: 0,
  });
});

scenario('C4', 3, 'a list page shown again comes from cache', async ({ c }) => {
  await signedIn(c);
  await c.testId('page-next').click();
  await c.settle();
  await c.resetStats();
  await c.testId('page-prev').click();
  await expect(c.testId('page-info')).toContainText('page 1');
  await c.idle(300);
  expect(await c.totals('customers', 'tiers', 'ticketCounts')).toEqual({ customers: 0, tiers: 0, ticketCounts: 0 });
});

scenario('C5', 3, 'the dropdown shares the badge request', async ({ c }) => {
  await signedIn(c);
  await c.resetStats();
  await c.testId('bell').click();
  await c.testId('bell').click();
  await c.testId('bell').click();
  await c.idle(200);
  expect(await c.total('notifications')).toBe(0);
});

scenario('C6', 3, 'an order opened again comes from cache', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.testId('close-panel').click();
  await c.resetStats();
  await c.openOrder(fx.editable.orderId);
  await c.expectState('order-panel', 'ready');
  await c.idle(200);
  expect(await c.totals('order', 'ticketsByOrder', 'products')).toEqual({ order: 0, ticketsByOrder: 0, products: 0 });
});

scenario('C7', 3, 'the editor requests nothing until a text is typed, and remembers searches', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.resetStats();
  await c.testId('edit-items').click();
  await c.idle(500);
  expect(await c.totals('searchProducts', 'prices', 'stock')).toEqual({ searchProducts: 0, prices: 0, stock: 0 });
  const first = fx.editable.addName.slice(0, 10);
  await searchProducts(c, first);
  expect(await c.totals('searchProducts', 'prices', 'stock')).toEqual({ searchProducts: 1, prices: 1, stock: 1 });
  await searchProducts(c, fx.editable.addName.slice(0, 4));
  await c.resetStats();
  await searchProducts(c, first);
  await c.expectParts(c.testId('catalog-search'), 'hit-price', 'ready');
  expect(await c.totals('searchProducts', 'prices', 'stock')).toEqual({ searchProducts: 0, prices: 0, stock: 0 });
});

scenario('C8', 3, 'no tracking requested when nothing is in flight', async ({ c }) => {
  const fx = await signedIn(c);
  const row = await c.findCustomer(fx.allDelivered.customerId, fx.allDelivered.customerName);
  await c.resetStats();
  await row.click();
  await c.settle();
  expect(await c.total('shipment')).toBe(0);
  await c.expectState('shipments', 'empty');
});

scenario('C9', 3, 'polls run only for what is shown', async ({ c, page }) => {
  await signedIn(c, { clock: true });
  await c.resetStats();
  await page.clock.runFor(30_000);
  await c.idle(200);
  await page.clock.runFor(30_000);
  await c.idle(200);
  expect(await c.totals('activity', 'orderStats', 'notifications')).toEqual({ activity: 0, orderStats: 0, notifications: 2 });
});

scenario('C10', 3, 'notification sentences look customers up only while the dropdown is open', async ({ c }) => {
  await signedIn(c);
  expect(await c.total('customer')).toBe(0);
  const customers = new Set(((await c.truth('notifications')) as { kind: string; customerId: number }[]).filter((n) => n.kind === 'ticket-reply').map((n) => n.customerId));
  expect(customers.size).toBeGreaterThan(0);
  await c.testId('bell').click();
  await c.waitPending('customer', customers.size);
  await c.settle();
  expect(await c.total('customer')).toBe(customers.size);
  await c.expectNoLoading(c.testId('notifications'));
  await c.testId('bell').click();
  await c.testId('bell').click();
  await c.idle(200);
  expect(await c.total('customer')).toBe(customers.size);
}, { smoke: true });

scenario('C11', 3, 'a list page asks tiers and counters once, for all its rows', async ({ c }) => {
  await c.open();
  await c.login();
  await c.releaseFor('customers', () => true);
  await c.waitPending('tiers');
  await c.waitPending('ticketCounts');
  await c.settle();
  const rows = await c.page.locator('[data-testid^="customer-"][data-customer-id]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-customer-id'))));
  expect(rows.length).toBe(8);
  const tiers = await c.calls<number[]>('tiers');
  const counts = await c.calls<number[]>('ticketCounts');
  expect(tiers.length).toBe(1);
  expect(counts.length).toBe(1);
  expect([...tiers[0]].sort()).toEqual([...rows].sort());
  expect([...counts[0]].sort()).toEqual([...rows].sort());
});

scenario('C12', 3, 'a long cart is asked in batches of 20', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, lines } = fx.bigCart;
  await c.selectAndSettle(customerId, customerName);
  await c.resetStats();
  await c.tab('cart');
  await c.settle();
  await c.expectParts(c.testId('tab-cart'), 'line-name', 'ready');
  const skus = ((await c.truth('cart', customerId)) as { sku: string }[]).length;
  expect(skus).toBe(lines);
  for (const key of ['products', 'prices'] as const) {
    const calls = await c.calls<string[]>(key);
    expect(calls.every((ids) => ids.length <= 20)).toBe(true);
    expect(calls.length).toBe(Math.ceil(calls.flat().length / 20));
    expect((await c.stats(key)).errors).toBe(0);
  }
  expect((await c.calls<string[]>('prices')).flat().length).toBe(lines);
});

scenario('C13', 3, 'a sku shown in several sections is asked of products once', async ({ c }) => {
  await signedIn(c);
  const { customerId, customerName, orderId } = await withCartOrderOverlap(c);
  await c.resetStats();
  await c.selectAndSettle(customerId, customerName);
  await c.tab('cart');
  await c.settle();
  await c.tab('orders');
  await c.openOrder(orderId);
  await c.settle();
  await c.expectNoLoading(c.testId('order-panel'));
  const asked = (await c.calls<string[]>('products')).flat();
  expect(asked.length).toBeGreaterThan(0);
  expect(new Set(asked).size).toBe(asked.length);
});

scenario('C14', 3, 'caches are shared between sections', async ({ c }) => {
  await signedIn(c);
  await c.testId('bell').click();
  await c.settle();
  const notified = (await c.truth('notifications')) as { kind: string; customerId: number }[];
  const customerId = notified.find((n) => n.kind === 'ticket-reply')!.customerId;
  const { name } = await c.truth('customer', customerId);
  await c.testId('bell').click();
  const row = await c.findCustomer(customerId, name);
  await c.resetStats();
  await row.click();
  await c.settle();
  await c.expectState('customer-header', 'ready');
  // the sentence's look-up is the header's profile; the row's counter is the KPI's
  expect(await c.totals('customer', 'ticketCounts')).toEqual({ customer: 0, ticketCounts: 0 });
});
