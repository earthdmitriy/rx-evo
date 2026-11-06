import { ConsoleApiKeys } from './keys';
import { scenario, signedInScenario, withCart } from './scenario';

// Ported from e2e/specs/a-session.spec.ts. Not ported (they need a router and
// browser history, stay in e2e): A8 at stages 1 and 3.

describe('A · session (stage 1)', () => {
  scenario('A1', 1, 'signed out shows only the sign-in screen', (c) => {
    expect(c.has('signin')).toBe(true);
    expect(c.has('agent')).toBe(false);
    expect(c.has('customers')).toBe(false);
  });

  signedInScenario('A2', 1, 'sign in shows agent, notifications and the customer list', (c) => {
    expect(c.state('agent')).toBe('ready');
    expect(c.state('customers')).toBe('ready');
    expect(c.has('bell')).toBe(true);
    expect(c.has('customer-header')).toBe(false);
    expect(c.contentOf('console-main')).toContain('Select a customer');
  });

  signedInScenario('A3', 1, 'logout removes every user-scope view at once', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.openOrder(fx.editable.orderId);
    c.settle();
    c.click('close-panel');
    c.logout();
    expect(c.shownForCustomer(fx.editable.customerId)).toHaveLength(0);
    expect(c.shownBy('[data-order-id]')).toHaveLength(0);
    expect(c.shownBy('[data-user-id]')).toHaveLength(0);
  });

  signedInScenario('A4', 1, 'a response arriving after logout changes nothing', (c, fx) => {
    c.selectCustomer(fx.editable.customerId, fx.editable.customerName);
    expect(c.pending('orders').length).toBeGreaterThan(0);
    c.logout();
    if (c.pending('orders').length) c.release('orders');
    c.idle(200);
    expect(c.has('signin')).toBe(true);
    expect(c.has('tab-orders')).toBe(false);
  });

  signedInScenario('A5', 1, 'a new session never shows the previous session', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.logout();
    c.fill('login-email', 'kim.another@shop.example');
    c.login();
    // everything of session 2 is held
    c.idle(200);
    expect(c.shownForCustomer(fx.editable.customerId, 'console-main')).toHaveLength(0);
    expect(c.shownBy('[data-user-id]')).toHaveLength(0);
    expect(c.has('customer-header')).toBe(false);
  });

  });

describe('A · session (stage 2)', () => {
  signedInScenario('A4', 2, 'logout cancels reads in flight', (c, fx) => {
    c.resetStats();
    c.selectCustomer(fx.editable.customerId, fx.editable.customerName);
    expect(c.pending('orders').length).toBeGreaterThan(0);
    c.logout();
    c.idle(200);
    expect(c.stats('orders').cancelled).toBeGreaterThanOrEqual(1);
  });

  scenario('A9', 2, 'a failed profile breaks nothing else; Retry refetches only the profile', (c) => {
    c.login();
    c.fail('profile');
    c.settle();
    expect(c.partState('agent')).toBe('error');
    expect(c.state('customers')).toBe('ready');
    c.resetStats();
    c.retryIn('agent');
    c.settle();
    expect(c.state('agent')).toBe('ready');
    expect(c.totals('profile', 'customers', 'notifications')).toEqual({ profile: 1, customers: 0, notifications: 0 });
  });
});

describe('A · session (stage 3)', () => {
  scenario('A1', 3, 'signed out sends no request', (c) => {
    c.idle(600);
    expect(Object.values(c.totals(...ConsoleApiKeys)).reduce((a, b) => a + b, 0)).toBe(0);
  });

  scenario('A2', 3, 'sign in starts profile, notifications and customers in parallel, once each', (c) => {
    c.click('login');
    c.release('login');
    c.idle(0);
    expect(c.pending('profile').length).toBe(1);
    expect(c.pending('notifications').length).toBe(1);
    expect(c.pending('customers').length).toBe(1);
    c.settle();
    expect(c.totals('profile', 'notifications', 'customers', 'tiers', 'ticketCounts', 'customer')).toEqual({
      profile: 1, notifications: 1, customers: 1, tiers: 1, ticketCounts: 1, customer: 0,
    });
  });

  scenario('A6', 3, 'signed out, time passes, nothing is requested', (c) => {
    c.idle(120_000);
    expect(Object.values(c.totals(...ConsoleApiKeys)).reduce((a, b) => a + b, 0)).toBe(0);
  });

  signedInScenario('A7', 3, 'products and prices survive logout', (c) => {
    const { customerId, customerName } = withCart(c);
    c.selectAndSettle(customerId, customerName);
    c.tab('cart');
    c.settle();
    c.logout();
    c.resetStats();
    c.login();
    c.settle();
    c.selectAndSettle(customerId, customerName);
    c.resetStats();
    c.tab('cart');
    c.settle();
    expect(c.state('tab-cart')).toBe('ready');
    expect(c.totals('cart', 'products', 'prices')).toEqual({ cart: 1, products: 0, prices: 0 });
  });
});
