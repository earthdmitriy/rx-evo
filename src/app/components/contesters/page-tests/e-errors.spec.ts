import type { ConsolePage, Fixtures } from './console-page.harness';
import { otherCustomer } from './flows';
import { expectErrorView, signedInScenario, withCart } from './scenario';

// ---------- stage 1 (an error is shown, nothing loads forever) and stage 2 (it breaks only its own part) ----------
// Ported from e2e/specs/e-f-errors.spec.ts.

/** Selects the two-in-flight customer and answers its requests, failing `key` for that customer. */
const failForCustomer = async (
  c: ConsolePage,
  fx: Fixtures,
  key: 'customer' | 'orders' | 'activity' | 'orderStats',
) => {
  const { customerId, customerName } = fx.twoInFlight;
  await c.selectCustomer(customerId, customerName);
  await c.failFor(key, (arg) => arg === customerId);
  await c.settle();
};

/** E3: two in-flight orders, the first one's tracking fails. */
const failOneShipment = async (c: ConsolePage, fx: Fixtures) => {
  const { customerId, customerName, orderIds } = fx.twoInFlight;
  await c.selectCustomer(customerId, customerName);
  // stage 1 does not require shipments to start before the rest
  for (const key of ['customer', 'orders', 'activity'] as const)
    await c.releaseFor(key, (arg) => arg === customerId);
  await c.failFor('shipment', (arg) => arg === orderIds[0]);
  await c.settle();
};

/** E4: the Cart tab of a customer with a cart; `key` fails whenever it is asked. */
const failInCart = async (c: ConsolePage, key: 'product' | 'prices') => {
  const { customerId, customerName } = withCart(c);
  c.setThrow(key, true);
  await c.selectAndSettle(customerId, customerName);
  await c.tab('cart');
  await c.settle();
  c.setThrow(key, false);
};

/** E5: the order panel with a failing linked ticket. */
const failLinkedTicket = async (c: ConsolePage, fx: Fixtures) => {
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.release('order');
  await c.fail('ticketsByOrder');
  await c.settle();
};

/** E7: activity loaded once, the next poll fails. */
const failActivityPoll = async (c: ConsolePage, fx: Fixtures) => {
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.idle(20_000);
  await c.fail('activity');
  await c.idle(100);
};

const errorShown = (c: ConsolePage, testId: string) =>
  expect(c.hasError(c.one(testId)!)).toBe(true);

describe('E · errors (stage 1)', () => {
  signedInScenario(
    'F5',
    2,
    'another customer recovers without Retry',
    async (c, fx) => {
      await failForCustomer(c, fx, 'customer');
      const other = otherCustomer(fx, fx.twoInFlight.customerId);
      await c.selectAndSettle(other.id, other.name);
      expect(c.state('customer-header')).toBe('ready');
      expect(c.text('customer-name')).toBe(other.name);
    },
  );
});

describe('E · errors (stage 2)', () => {
  const allFields = (c: ConsolePage, region: string, testId: string) =>
    new Set(c.fieldStates(c.one(region)!, testId));

  signedInScenario(
    'E1',
    2,
    'a failed header breaks nothing else',
    async (c, fx) => {
      await failForCustomer(c, fx, 'customer');
      expect(c.state('customer-header')).toBe('error');
      expectErrorView(c, 'customer-header');
      expect(c.state('tab-orders')).toBe('ready');
      expect(c.state('shipments')).toBe('ready');
      expect(['ready', 'empty']).toContain(c.state('activity'));
    },
  );

  signedInScenario(
    'E2',
    2,
    'failed orders break only orders and shipments',
    async (c, fx) => {
      await failForCustomer(c, fx, 'orders');
      expect(c.state('customer-header')).toBe('ready');
      expect(['ready', 'empty']).toContain(c.state('activity'));
      expectErrorView(c, 'tab-orders');
    },
  );

  signedInScenario(
    'E3',
    2,
    'a failed tracking breaks only its row',
    async (c, fx) => {
      const o2 = fx.twoInFlight.orderIds[1];
      await failOneShipment(c, fx);
      expect(c.state('shipments')).toBe('ready');
      expectErrorView(c, 'shipments');
      expect(c.trackingOf(o2)).toBe('shown');
    },
  );

  signedInScenario(
    'E4',
    2,
    'the cart names the failed source and keeps the rest',
    async (c, _fx) => {
      await failInCart(c, 'product');
      expect(c.state('tab-cart')).toBe('ready');
      expectErrorView(c, 'tab-cart');
      expect(allFields(c, 'tab-cart', 'line-price')).toEqual(
        new Set(['shown']),
      );
      expect(allFields(c, 'tab-cart', 'cart-total')).toEqual(
        new Set(['shown']),
      );
      expect(c.state('customer-header')).toBe('ready');
    },
  );

  signedInScenario(
    'E5',
    2,
    'a failed linked ticket breaks only the ticket box',
    async (c, fx) => {
      await failLinkedTicket(c, fx);
      expect(c.state('order-panel')).toBe('ready');
      expectErrorView(c, 'order-panel');
      expect(c.has('edit-items')).toBe(true);
    },
  );
});
