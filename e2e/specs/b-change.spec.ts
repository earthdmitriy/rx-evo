import { expect, scenario } from '../support/console';
import { firstCustomers, prepareOrderEdit, signedIn, usd0 } from '../support/flows';

const KEYS_OF_CUSTOMER = ['customer', 'orders', 'activity'] as const;

// ---------- stage 1 ----------

scenario('B1', 1, 'the latest customer wins a race', async ({ c }) => {
  await signedIn(c);
  const [a, b] = await firstCustomers(c);
  await c.selectCustomer(a.id, a.name);
  await c.waitPending('customer');
  await c.selectCustomer(b.id, b.name);
  for (const key of KEYS_OF_CUSTOMER) await c.releaseFor(key, (arg) => arg === b.id);
  await c.settle();
  await expect(c.testId('customer-name')).toHaveText(b.name);
  await expect(c.shownForCustomer(a.id, 'console-main')).toHaveCount(0);
  await expect(c.shownForCustomer(a.id, 'console-rail')).toHaveCount(0);
}, { smoke: true });

scenario('B2', 1, 'switching customer never shows the previous one', async ({ c }) => {
  await signedIn(c);
  const [a, b] = await firstCustomers(c);
  await c.selectAndSettle(a.id, a.name);
  await c.selectCustomer(b.id, b.name);
  await c.idle(200);
  await expect(c.shownForCustomer(a.id, 'console-main')).toHaveCount(0);
  await expect(c.shownForCustomer(a.id, 'console-rail')).toHaveCount(0);
});

scenario('B4', 1, 'typing a search ends on the whole text, page 1', async ({ c }) => {
  const fx = await signedIn(c);
  const word = fx.allDelivered.customerName.split(' ')[1].slice(0, 5);
  await c.testId('customer-search').pressSequentially(word, { delay: 30 });
  await c.idle(500);
  await c.settle();
  await expect(c.testId('page-info')).toContainText('page 1');
  const names = await c.page.locator('[data-testid^="customer-"][data-customer-id] .truncate').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n.toLowerCase()).toContain(word.toLowerCase());
});

scenario('B5', 1, 'a filter change goes back to page 1', async ({ c }) => {
  await signedIn(c);
  await c.testId('page-next').click();
  await c.settle();
  await c.testId('page-next').click();
  await c.settle();
  await expect(c.testId('page-info')).toContainText('page 3');
  await c.testId('filter-vip').click();
  await c.idle();
  await c.settle();
  await expect(c.testId('page-info')).toContainText('page 1');
});

scenario('B6', 1, 'an old list response never replaces a newer one', async ({ c }) => {
  await signedIn(c);
  await c.testId('sort').selectOption('spend');
  await c.waitPending('customers');
  await c.testId('sort').selectOption('lastOrder');
  await c.idle();
  await c.releaseFor('customers', (arg) => (arg as { sort?: string }).sort === 'lastOrder');
  await c.idle(200);
  const ids = () => c.page.locator('[data-testid^="customer-"][data-customer-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-customer-id')).join());
  const shown = await ids();
  if (await c.pendingCount('customers')) await c.release('customers');
  await c.idle(200);
  expect(await ids()).toBe(shown);
});

scenario('B7', 1, 'the latest order wins in the order panel', async ({ c }) => {
  const fx = await signedIn(c);
  const [o1, o2] = fx.twoInFlight.orderIds;
  await c.selectAndSettle(fx.twoInFlight.customerId, fx.twoInFlight.customerName);
  await c.openOrder(o1);
  await c.waitPending('order');
  await c.testId('close-panel').click();
  await c.openOrder(o2);
  await c.releaseFor('order', (arg) => arg === o2);
  if (await c.pendingCount('order')) await c.release('order');
  await c.settle();
  await expect(c.testId('order-panel')).toHaveAttribute('data-order-id', o2);
  await expect(c.testId('order-panel').locator('h3')).toHaveText(o2);
});

scenario('B9', 1, 'the latest customer wins for the counters too', async ({ c }) => {
  await signedIn(c);
  const [a, b] = await firstCustomers(c);
  await c.selectCustomer(a.id, a.name);
  await c.waitPending('orderStats');
  await c.selectCustomer(b.id, b.name);
  await c.releaseFor('orderStats', (arg) => arg === b.id);
  await c.idle(100);
  await c.settle();
  const stats = await c.truth('orderStats', b.id);
  await expect(c.testId('kpi-spend')).toHaveText(usd0(stats.lifetimeSpend));
  await expect(c.testId('kpi-orders')).toHaveText(String(stats.orders));
  await c.expectParts(c.testId('customer-header'), 'kpi-spend', 'ready');
});

// ---------- stage 2 ----------

scenario('B1', 2, 'superseded customer reads are cancelled', async ({ c }) => {
  await signedIn(c);
  const [a, b] = await firstCustomers(c);
  await c.resetStats();
  await c.selectCustomer(a.id, a.name);
  await c.waitPending('customer');
  await c.selectCustomer(b.id, b.name);
  await c.idle(200);
  expect((await c.stats('customer')).cancelled).toBeGreaterThanOrEqual(1);
});

scenario('B3', 2, 'a same-key reload keeps the content, dimmed', async ({ c }) => {
  const fx = await signedIn(c);
  await prepareOrderEdit(c, fx.editable);
  await c.testId('save').click();
  await c.release('updateOrder');
  await c.waitPending('orders');
  await c.testId('close-panel').click();
  await c.tab('orders');
  await c.expectState('tab-orders', 'reloading');
  await expect(c.testId(`order-${fx.editable.orderId}`)).toBeVisible();
  await c.settle();
  await c.expectState('tab-orders', 'ready');
});

scenario('B8', 2, 'a superseded order read is cancelled', async ({ c }) => {
  const fx = await signedIn(c);
  const [o1, o2] = fx.twoInFlight.orderIds;
  await c.selectAndSettle(fx.twoInFlight.customerId, fx.twoInFlight.customerName);
  await c.resetStats();
  await c.openOrder(o1);
  await c.waitPending('order');
  await c.testId('close-panel').click();
  await c.openOrder(o2);
  await c.idle(200);
  expect((await c.stats('order')).cancelled).toBeGreaterThanOrEqual(1);
});

// ---------- stage 3 ----------

scenario('B4', 3, 'the search is debounced: one request per pause', async ({ c }) => {
  const fx = await signedIn(c);
  await c.resetStats();
  await c.testId('customer-search').pressSequentially(fx.allDelivered.customerName.slice(0, 5), { delay: 30 });
  await c.idle(600);
  expect(await c.total('customers')).toBe(1);
  await c.settle();
  const t = await c.totals('tiers', 'ticketCounts');
  expect(t.tiers).toBeLessThanOrEqual(1);
  expect(t.ticketCounts).toBeLessThanOrEqual(1);
});

scenario('B5', 3, 'a filter change resets the page in one request', async ({ c }) => {
  await signedIn(c);
  await c.testId('page-next').click();
  await c.settle();
  await c.resetStats();
  await c.testId('filter-vip').click();
  await c.idle(500);
  expect(await c.total('customers')).toBe(1);
});


scenario('B10', 3, 'the editor search is debounced: one search, one batch of prices and stock', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.testId('edit-items').click();
  await c.resetStats();
  await c.testId('catalog-search').locator('input').pressSequentially(fx.editable.addName.slice(0, 5), { delay: 30 });
  await c.idle(600);
  await c.settle();
  expect(await c.total('searchProducts')).toBe(1);
  const t = await c.totals('prices', 'stock');
  expect(t.prices).toBeLessThanOrEqual(1);
  expect(t.stock).toBeLessThanOrEqual(1);
});
