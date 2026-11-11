import { expect, scenario } from '../support/console';
import { signedIn, typeSearch, withCart } from '../support/flows';

// ---------- stage 3 ----------

scenario('D1', 3, 'a section renders as soon as its own data arrives', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName } = fx.twoInFlight;
  await c.selectCustomer(customerId, customerName);
  await c.releaseFor('activity', (arg) => arg === customerId);
  await c.expectState('activity', 'ready');
  await c.expectState('customer-header', 'loading');
  await c.expectState('tab-orders', 'loading');
  await c.expectState('shipments', 'loading');
}, { smoke: true });

scenario('D2', 3, 'tracking starts when the orders arrive, rows load one by one', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, orderIds } = fx.twoInFlight;
  await c.selectCustomer(customerId, customerName);
  await c.waitPending('orders');
  expect(await c.pendingCount('shipment')).toBe(0);
  await c.releaseFor('orders', (arg) => arg === customerId);
  await c.expectState('tab-orders', 'ready');
  await c.waitPending('shipment', orderIds.length);
  for (const id of orderIds) await c.expectTracking(id, 'empty');
});

scenario('D3', 3, 'each shipment row fills in on its own', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, orderIds } = fx.twoInFlight;
  await c.selectCustomer(customerId, customerName);
  await c.releaseFor('orders', (arg) => arg === customerId);
  await c.waitPending('shipment', orderIds.length);
  await c.releaseFor('shipment', (arg) => arg === orderIds[1]);
  await c.expectTracking(orderIds[1], 'shown');
  await c.expectTracking(orderIds[0], 'empty');
});

scenario('D4', 3, 'the linked ticket needs only the order id: it does not wait for the order', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.resetStats();
  await c.openOrder(fx.editable.orderId);
  await c.waitPending('order');
  await c.waitPending('ticketsByOrder');
  await c.release('ticketsByOrder');
  await c.expectFieldState('order-ticket', 'shown');
  await c.expectState('order-panel', 'loading');
  expect(await c.total('ticketsByOrder')).toBe(1);
});

scenario('D5', 3, 'the order shows before its names and its ticket', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.release('order');
  await c.expectState('order-panel', 'ready');
  await c.expectFieldState('order-ticket', 'empty');
  await c.waitPending('product');
  await c.expectFields(c.testId('order-panel'), 'line-name', 'empty');
  await expect(c.testId('order-panel-total')).toContainText('$');
  await c.release('product');
  await c.expectFields(c.testId('order-panel'), 'line-name', 'shown');
});

scenario('D6', 3, 'pending hits block only the hits area', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.testId('edit-items').click();
  await typeSearch(c, fx.editable.addName.slice(0, 6));
  await c.waitPending('searchProducts');
  await expect(c.testId('hit-price')).toHaveCount(0);
  const before = await c.testId('order-panel-total').textContent();
  await c.testId('order-panel').locator('[data-testid^="qty-inc-"]').first().click();
  await expect(c.testId('order-panel-total')).not.toHaveText(before ?? '');
});

scenario('D7', 3, 'a hit shows its name first, then its price and stock as they arrive', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.testId('edit-items').click();
  await typeSearch(c, fx.editable.addName.slice(0, 10));
  await c.release('searchProducts');
  const hit = c.testId('catalog-search').locator(`[data-sku="${fx.editable.addSku}"]`);
  await expect(hit).toContainText(fx.editable.addName);
  await c.waitPending('prices');
  await c.waitPending('stock');
  await c.release('prices');
  await c.expectFields(c.testId('catalog-search'), 'hit-price', 'shown');
  await c.expectFields(c.testId('catalog-search'), 'hit-stock', 'empty');
  await expect(c.testId(`add-${fx.editable.addSku}`)).toBeDisabled();
  await c.release('stock');
  await expect(c.testId(`add-${fx.editable.addSku}`)).toBeEnabled();
});

scenario('D8', 3, 'activity sentences show before the product names they need', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName } = fx.twoInFlight;
  await c.selectCustomer(customerId, customerName);
  expect(await c.total('product')).toBe(0);
  await c.releaseFor('activity', (arg) => arg === customerId);
  await c.expectState('activity', 'ready');
  const region = c.testId('activity');
  await expect.poll(() => c.fieldStates(region, 'activity-text')).toContain('empty');
  expect(await c.fieldStates(region, 'activity-text')).toContain('shown');
  await c.waitPending('product');
  await c.settle();
  await c.expectNoLoading(region);
});

scenario('D9', 3, 'a cart line shows its price while its name is on the way', async ({ c }) => {
  await signedIn(c);
  const { customerId, customerName } = await withCart(c);
  await c.selectAndSettle(customerId, customerName);
  await c.tab('cart');
  await c.release('cart');
  await c.waitPending('product');
  await c.waitPending('prices');
  await c.release('prices');
  const cart = c.testId('tab-cart');
  await c.expectFields(cart, 'line-price', 'shown');
  await c.expectFields(cart, 'line-name', 'empty');
  await c.expectFields(cart, 'cart-total', 'shown');
  await c.release('product');
  await c.expectFields(cart, 'line-name', 'shown');
});

scenario('D10', 3, 'list rows show before their badges, which load together', async ({ c }) => {
  await c.open();
  await c.login();
  await c.releaseFor('customers', () => true);
  await c.expectState('customers', 'ready');
  await expect(c.page.locator('[data-testid^="customer-"][data-customer-id]')).toHaveCount(8);
  await c.expectFields(c.testId('customers'), 'row-tier', 'empty');
  await c.expectFields(c.testId('customers'), 'row-open-tickets', 'empty');
  await c.waitPending('tiers');
  await c.waitPending('ticketCounts');
});
