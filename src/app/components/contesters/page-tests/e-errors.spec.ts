import type { ConsolePage, Fixtures } from './console-page.harness';
import { otherCustomer } from './flows';
import { scenario, signedInScenario, withCart } from './scenario';

// ---------- stage 1 (an error is shown, nothing loads forever) and stage 2 (it breaks only its own part) ----------
// Ported from e2e/specs/e-f-errors.spec.ts.

/** Selects the two-in-flight customer and answers its requests, failing `key` for that customer. */
const failForCustomer = (c: ConsolePage, fx: Fixtures, key: 'customer' | 'orders' | 'activity' | 'orderStats') => {
  const { customerId, customerName } = fx.twoInFlight;
  c.selectCustomer(customerId, customerName);
  c.failFor(key, (arg) => arg === customerId);
  c.settle();
};

/** E3: two in-flight orders, the first one's tracking fails. */
const failOneShipment = (c: ConsolePage, fx: Fixtures) => {
  const { customerId, customerName, orderIds } = fx.twoInFlight;
  c.selectCustomer(customerId, customerName);
  // stage 1 does not require shipments to start before the rest
  for (const key of ['customer', 'orders', 'activity'] as const) c.releaseFor(key, (arg) => arg === customerId);
  c.failFor('shipment', (arg) => arg === orderIds[0]);
  c.settle();
};

/** E4: the Cart tab of a customer with a cart; `key` fails whenever it is asked. */
const failInCart = (c: ConsolePage, key: 'products' | 'prices') => {
  const { customerId, customerName } = withCart(c);
  c.setThrow(key, true);
  c.selectAndSettle(customerId, customerName);
  c.tab('cart');
  c.settle();
  c.setThrow(key, false);
};

/** E5: the order panel with a failing linked ticket. */
const failLinkedTicket = (c: ConsolePage, fx: Fixtures) => {
  c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  c.openOrder(fx.editable.orderId);
  c.release('order');
  c.fail('ticketsByOrder');
  c.settle();
};

/** E7: activity loaded once, the next poll fails. */
const failActivityPoll = (c: ConsolePage, fx: Fixtures) => {
  c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  c.idle(20_000);
  c.fail('activity');
  c.idle(100);
};

const errorShown = (c: ConsolePage, testId: string) => expect(c.hasError(c.one(testId)!)).toBe(true);

describe('E · errors (stage 1)', () => {
                  signedInScenario('F5', 2, 'another customer recovers without Retry', (c, fx) => {
    failForCustomer(c, fx, 'customer');
    const other = otherCustomer(fx, fx.twoInFlight.customerId);
    c.selectAndSettle(other.id, other.name);
    expect(c.state('customer-header')).toBe('ready');
    expect(c.text('customer-name')).toBe(other.name);
  });
});

describe('E · errors (stage 2)', () => {
  const partState = (c: ConsolePage, testId: string) => c.partState(testId);
  const allParts = (c: ConsolePage, region: string, testId: string) => new Set(c.partStates(c.one(region)!, testId));

  signedInScenario('E1', 2, 'a failed header breaks nothing else', (c, fx) => {
    failForCustomer(c, fx, 'customer');
    expect(c.partState('customer-profile')).toBe('error');
    expect(allParts(c, 'customer-header', 'kpi-spend')).toEqual(new Set(['ready']));
    expect(c.state('tab-orders')).toBe('ready');
    expect(c.state('shipments')).toBe('ready');
    expect(['ready', 'empty']).toContain(c.state('activity'));
  });

  signedInScenario('E2', 2, 'failed orders break only orders and shipments', (c, fx) => {
    failForCustomer(c, fx, 'orders');
    expect(c.state('customer-header')).toBe('ready');
    expect(['ready', 'empty']).toContain(c.state('activity'));
    expect(c.failedSources('tab-orders')).toContain('orders');
  });

  signedInScenario('E3', 2, 'a failed tracking breaks only its row', (c, fx) => {
    const [o1, o2] = fx.twoInFlight.orderIds;
    failOneShipment(c, fx);
    expect(c.state('shipments')).toBe('ready');
    expect(partState(c, `shipment-${o1}`)).toBe('error');
    expect(partState(c, `shipment-${o2}`)).toBe('ready');
  });

  signedInScenario('E4', 2, 'the cart names the failed source and keeps the rest', (c) => {
    failInCart(c, 'products');
    expect(c.state('tab-cart')).toBe('ready');
    expect(allParts(c, 'tab-cart', 'line-name')).toEqual(new Set(['error']));
    expect(allParts(c, 'tab-cart', 'line-price')).toEqual(new Set(['ready']));
    expect(allParts(c, 'tab-cart', 'cart-total')).toEqual(new Set(['ready']));
    expect(c.state('customer-header')).toBe('ready');
  });

  signedInScenario('E5', 2, 'a failed linked ticket breaks only the ticket box', (c, fx) => {
    failLinkedTicket(c, fx);
    expect(c.state('order-panel')).toBe('ready');
    expect(partState(c, 'order-ticket')).toBe('error');
    expect(c.has('edit-items')).toBe(true);
  });
});
