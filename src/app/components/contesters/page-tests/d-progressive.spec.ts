import { scenario, signedInScenario, usd0, withCart } from './scenario';
import { typeSearch } from './flows';

// Ported from e2e/specs/d-progressive.spec.ts (all stage 3).

void usd0;

describe('D · progressive loading (stage 3)', () => {
  signedInScenario(
    'D1',
    3,
    'a section renders as soon as its own data arrives',
    async (c, fx) => {
      const { customerId, customerName } = fx.twoInFlight;
      await c.selectCustomer(customerId, customerName);
      await c.releaseFor('activity', (arg) => arg === customerId);
      expect(c.state('activity')).toBe('ready');
      expect(c.state('customer-header')).toBe('loading');
      expect(c.state('tab-orders')).toBe('loading');
      expect(c.state('shipments')).toBe('loading');
    },
  );

  signedInScenario(
    'D2',
    3,
    'tracking starts when the orders arrive, rows load one by one',
    async (c, fx) => {
      const { customerId, customerName, orderIds } = fx.twoInFlight;
      await c.selectCustomer(customerId, customerName);
      await c.waitPending('orders');
      expect(c.pending('shipment').length).toBe(0);
      await c.releaseFor('orders', (arg) => arg === customerId);
      expect(c.state('tab-orders')).toBe('ready');
      await c.waitPending('shipment', orderIds.length);
      for (const id of orderIds) expect(c.trackingOf(id)).toBe('empty');
    },
  );

  signedInScenario(
    'D3',
    3,
    'each shipment row fills in on its own',
    async (c, fx) => {
      const { customerId, customerName, orderIds } = fx.twoInFlight;
      await c.selectCustomer(customerId, customerName);
      await c.releaseFor('orders', (arg) => arg === customerId);
      await c.waitPending('shipment', orderIds.length);
      await c.releaseFor('shipment', (arg) => arg === orderIds[1]);
      expect(c.trackingOf(orderIds[1])).toBe('shown');
      expect(c.trackingOf(orderIds[0])).toBe('empty');
    },
  );

  signedInScenario(
    'D4',
    3,
    'the linked ticket needs only the order id: it does not wait for the order',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      c.resetStats();
      await c.openOrder(fx.editable.orderId);
      await c.waitPending('order');
      await c.waitPending('ticketsByOrder');
      await c.release('ticketsByOrder');
      expect(c.fieldState('order-ticket')).toBe('shown');
      expect(c.state('order-panel')).toBe('loading');
      expect(c.total('ticketsByOrder')).toBe(1);
    },
  );

  signedInScenario(
    'D5',
    3,
    'the order shows before its names and its ticket',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.waitPending('order');
      await c.release('order');
      expect(c.state('order-panel')).toBe('ready');
      expect(c.fieldState('order-ticket')).toBe('empty');
      await c.waitPending('product');
      const panel = c.one('order-panel')!;
      expect(c.fieldsAre(panel, 'line-name', 'empty')).toBe(true);
      expect(c.text('order-panel-total')).toContain('$');
      await c.release('product');
      expect(c.fieldsAre(panel, 'line-name', 'shown')).toBe(true);
    },
  );

  signedInScenario(
    'D6',
    3,
    'pending hits block only the hits area',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.settle();
      await c.click('edit-items');
      await typeSearch(c, fx.editable.addName.slice(0, 6));
      await c.waitPending('searchProducts');
      expect(c.all('hit-price').length).toBe(0);
      const before = c.text('order-panel-total');
      await c.click(
        c
          .one('order-panel')!
          .querySelector<HTMLElement>('[data-testid^="qty-inc-"]')!,
      );
      expect(c.text('order-panel-total')).not.toBe(before);
    },
  );

  signedInScenario(
    'D7',
    3,
    'a hit shows its name first, then its price and stock as they arrive',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.settle();
      await c.click('edit-items');
      await typeSearch(c, fx.editable.addName.slice(0, 10));
      await c.release('searchProducts');
      const hit = c
        .one('catalog-search')!
        .querySelector(`[data-sku="${fx.editable.addSku}"]`)!;
      expect(hit.textContent).toContain(fx.editable.addName);
      await c.waitPending('prices');
      await c.waitPending('stock');
      await c.release('prices');
      const search = c.one('catalog-search')!;
      expect(c.fieldsAre(search, 'hit-price', 'shown')).toBe(true);
      expect(c.fieldsAre(search, 'hit-stock', 'empty')).toBe(true);
      expect(
        (c.one(`add-${fx.editable.addSku}`) as HTMLButtonElement).disabled,
      ).toBe(true);
      await c.release('stock');
      expect(
        (c.one(`add-${fx.editable.addSku}`) as HTMLButtonElement).disabled,
      ).toBe(false);
    },
  );

  signedInScenario(
    'D8',
    3,
    'activity sentences show before the product names they need',
    async (c, fx) => {
      const { customerId, customerName } = fx.twoInFlight;
      await c.selectCustomer(customerId, customerName);
      expect(c.total('product')).toBe(0);
      await c.releaseFor('activity', (arg) => arg === customerId);
      expect(c.state('activity')).toBe('ready');
      const region = c.one('activity')!;
      await c.waitPending('product');
      expect(c.fieldStates(region, 'activity-text')).toContain('empty');
      expect(c.fieldStates(region, 'activity-text')).toContain('shown');
      await c.settle();
      expect(c.isLoading(region)).toBe(false);
    },
  );

  signedInScenario(
    'D9',
    3,
    'a cart line shows its price while its name is on the way',
    async (c) => {
      const { customerId, customerName } = withCart(c);
      await c.selectAndSettle(customerId, customerName);
      await c.tab('cart');
      await c.waitPending('cart');
      await c.release('cart');
      await c.waitPending('product');
      await c.waitPending('prices');
      await c.release('prices');
      const cart = c.one('tab-cart')!;
      expect(c.fieldsAre(cart, 'line-price', 'shown')).toBe(true);
      expect(c.fieldsAre(cart, 'line-name', 'empty')).toBe(true);
      expect(c.fieldsAre(cart, 'cart-total', 'shown')).toBe(true);
      await c.release('product');
      expect(c.fieldsAre(cart, 'line-name', 'shown')).toBe(true);
    },
  );

  scenario(
    'D10',
    3,
    'list rows show before their badges, which load together',
    async (c) => {
      await c.login();
      await c.releaseFor('customers', () => true);
      expect(c.state('customers')).toBe('ready');
      expect(
        c.all('customers')[0].querySelectorAll('[data-customer-id]').length,
      ).toBe(8);
      expect(c.fieldsAre(c.one('customers')!, 'row-tier', 'empty')).toBe(true);
      expect(
        c.fieldsAre(c.one('customers')!, 'row-open-tickets', 'empty'),
      ).toBe(true);
      await c.waitPending('tiers');
      await c.waitPending('ticketCounts');
    },
  );
});
