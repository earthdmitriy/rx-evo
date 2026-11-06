import { expect, scenario } from '../support/console';
import { signedIn, withCart } from '../support/flows';

const ALL = [
  'login', 'logout', 'profile', 'agents', 'notifications', 'markNotificationsRead', 'customers', 'customer', 'tiers', 'orders', 'orderStats', 'order',
  'updateOrder', 'resendConfirmation', 'shipment', 'cart', 'products', 'searchProducts', 'prices', 'stock', 'tickets', 'ticketsByOrder', 'ticketCounts',
  'ticket', 'replyTicket', 'notes', 'addNote', 'activity',
] as const;

// ---------- stage 1 ----------

scenario('A1', 1, 'signed out shows only the sign-in screen', async ({ c }) => {
  await c.open();
  await expect(c.testId('signin')).toBeVisible();
  await expect(c.testId('agent')).toHaveCount(0);
  await expect(c.testId('customers')).toHaveCount(0);
}, { smoke: true });

scenario('A2', 1, 'sign in shows agent, notifications and the customer list', async ({ c }) => {
  await signedIn(c);
  await c.expectState('agent', 'ready');
  await c.expectState('customers', 'ready');
  await expect(c.testId('bell')).toBeVisible();
  await expect(c.testId('customer-header')).toHaveCount(0);
  await expect(c.testId('console-main')).toContainText('Select a customer');
}, { smoke: true });

scenario('A3', 1, 'logout removes every user-scope view at once', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.testId('close-panel').click();
  await c.logout();
  await expect(c.shownForCustomer(fx.editable.customerId)).toHaveCount(0);
  await expect(c.page.locator('[data-order-id]:visible')).toHaveCount(0);
  await expect(c.page.locator('[data-user-id]:visible')).toHaveCount(0);
});

scenario('A4', 1, 'a response arriving after logout changes nothing', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectCustomer(fx.editable.customerId, fx.editable.customerName);
  await c.waitPending('orders');
  await c.logout();
  if (await c.pendingCount('orders')) await c.release('orders');
  await c.idle(200);
  await expect(c.testId('signin')).toBeVisible();
  await expect(c.testId('tab-orders')).toHaveCount(0);
});

scenario('A5', 1, 'a new session never shows the previous session', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.logout();
  await c.testId('login-email').fill('kim.another@shop.example');
  await c.login();
  // everything of session 2 is held
  await c.idle(200);
  await expect(c.shownForCustomer(fx.editable.customerId, 'console-main')).toHaveCount(0);
  await expect(c.page.locator('[data-user-id]:visible')).toHaveCount(0);
  await expect(c.testId('customer-header')).toHaveCount(0);
});

scenario('A8', 1, 'leaving the page and coming back keeps customer, tab and panel', async ({ c, page }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await page.locator('a[href="/"]:visible').first().click();
  await expect(c.testId('agent')).toHaveCount(0);
  await page.goBack();
  await c.settle();
  await expect(c.testId('customer-name')).toHaveText(fx.editable.customerName);
  await expect(c.testId('order-panel')).toHaveAttribute('data-order-id', fx.editable.orderId);
});

// ---------- stage 2 ----------

scenario('A4', 2, 'logout cancels reads in flight', async ({ c }) => {
  const fx = await signedIn(c);
  await c.resetStats();
  await c.selectCustomer(fx.editable.customerId, fx.editable.customerName);
  await c.waitPending('orders');
  await c.logout();
  await c.idle(200);
  expect((await c.stats('orders')).cancelled).toBeGreaterThanOrEqual(1);
});

scenario('A9', 2, 'a failed profile breaks nothing else; Retry refetches only the profile', async ({ c }) => {
  await c.open();
  await c.login();
  await c.fail('profile');
  await c.settle();
  await c.expectPartState('agent', 'error');
  await c.expectState('customers', 'ready');
  await c.resetStats();
  await c.retryIn('agent');
  await c.settle();
  await c.expectState('agent', 'ready');
  expect(await c.totals('profile', 'customers', 'notifications')).toEqual({ profile: 1, customers: 0, notifications: 0 });
});

// ---------- stage 3 ----------

scenario('A1', 3, 'signed out sends no request', async ({ c }) => {
  await c.open();
  await c.idle(600);
  const totals = await c.totals(...ALL);
  expect(Object.values(totals).reduce((a, b) => a + b, 0)).toBe(0);
});

scenario('A2', 3, 'sign in starts profile, notifications and customers in parallel, once each', async ({ c }) => {
  await c.open();
  await c.testId('login').click();
  await c.release('login');
  await c.waitPending('profile');
  await c.waitPending('notifications');
  await c.waitPending('customers');
  await c.settle();
  expect(await c.totals('profile', 'notifications', 'customers', 'tiers', 'ticketCounts', 'customer')).toEqual({
    profile: 1, notifications: 1, customers: 1, tiers: 1, ticketCounts: 1, customer: 0,
  });
});

scenario('A6', 3, 'signed out, time passes, nothing is requested', async ({ c, page }) => {
  await c.open({ clock: true });
  await page.clock.runFor(120_000);
  await c.idle(300);
  const totals = await c.totals(...ALL);
  expect(Object.values(totals).reduce((a, b) => a + b, 0)).toBe(0);
});

scenario('A7', 3, 'products and prices survive logout', async ({ c }) => {
  await signedIn(c);
  const { customerId, customerName } = await withCart(c);
  await c.selectAndSettle(customerId, customerName);
  await c.tab('cart');
  await c.settle();
  await c.logout();
  await c.resetStats();
  await c.login();
  await c.settle();
  await c.selectAndSettle(customerId, customerName);
  await c.resetStats();
  await c.tab('cart');
  await c.settle();
  await c.expectState('tab-cart', 'ready');
  expect(await c.totals('cart', 'products', 'prices')).toEqual({ cart: 1, products: 0, prices: 0 });
});

scenario('A8', 3, 'coming back to the page requests nothing', async ({ c, page }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await page.locator('a[href="/"]:visible').first().click();
  await expect(c.testId('agent')).toHaveCount(0);
  await c.resetStats();
  await page.goBack();
  await c.expectState('customer-header', 'ready');
  await c.idle(300);
  const totals = await c.totals(...ALL);
  expect(Object.entries(totals).filter(([, n]) => n > 0)).toEqual([]);
});

