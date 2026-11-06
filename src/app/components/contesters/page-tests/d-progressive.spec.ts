import { scenario, signedInScenario, usd0, withCart } from './scenario';
import { typeSearch } from './flows';

// Ported from e2e/specs/d-progressive.spec.ts (all stage 3).

void usd0;

describe('D · progressive loading (stage 3)', () => {
  signedInScenario('D1', 3, 'a section renders as soon as its own data arrives', (c, fx) => {
    const { customerId, customerName } = fx.twoInFlight;
    c.selectCustomer(customerId, customerName);
    c.releaseFor('activity', (arg) => arg === customerId);
    expect(c.state('activity')).toBe('ready');
    expect(c.state('customer-header')).toBe('loading');
    expect(c.state('tab-orders')).toBe('loading');
    expect(c.state('shipments')).toBe('loading');
  });

  signedInScenario('D2', 3, 'tracking starts when the orders arrive, rows load one by one', (c, fx) => {
    const { customerId, customerName, orderIds } = fx.twoInFlight;
    c.selectCustomer(customerId, customerName);
    c.waitPending('orders');
    expect(c.pending('shipment').length).toBe(0);
    c.releaseFor('orders', (arg) => arg === customerId);
    expect(c.state('tab-orders')).toBe('ready');
    c.waitPending('shipment', orderIds.length);
    for (const id of orderIds) expect(c.partState(`shipment-${id}`)).toBe('loading');
  });

  signedInScenario('D3', 3, 'each shipment row fills in on its own', (c, fx) => {
    const { customerId, customerName, orderIds } = fx.twoInFlight;
    c.selectCustomer(customerId, customerName);
    c.releaseFor('orders', (arg) => arg === customerId);
    c.waitPending('shipment', orderIds.length);
    c.releaseFor('shipment', (arg) => arg === orderIds[1]);
    expect(c.partState(`shipment-${orderIds[1]}`)).toBe('ready');
    expect(c.partState(`shipment-${orderIds[0]}`)).toBe('loading');
  });

  signedInScenario('D4', 3, 'the linked ticket needs only the order id: it does not wait for the order', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.resetStats();
    c.openOrder(fx.editable.orderId);
    c.waitPending('order');
    c.waitPending('ticketsByOrder');
    c.release('ticketsByOrder');
    expect(c.partState('order-ticket')).toBe('ready');
    expect(c.state('order-panel')).toBe('loading');
    expect(c.total('ticketsByOrder')).toBe(1);
  });

  signedInScenario('D5', 3, 'the order shows before its names and its ticket', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.openOrder(fx.editable.orderId);
    c.waitPending('order');
    c.release('order');
    expect(c.state('order-panel')).toBe('ready');
    expect(c.partState('order-ticket')).toBe('loading');
    c.waitPending('products');
    const panel = c.one('order-panel')!;
    expect(c.partsAre(panel, 'line-name', 'loading')).toBe(true);
    expect(c.text('order-panel-total')).toContain('$');
    c.release('products');
    expect(c.partsAre(panel, 'line-name', 'ready')).toBe(true);
  });

  signedInScenario('D6', 3, 'pending hits block only the hits area', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.openOrder(fx.editable.orderId);
    c.settle();
    c.click('edit-items');
    typeSearch(c, fx.editable.addName.slice(0, 6));
    c.waitPending('searchProducts');
    expect(c.partState('catalog-search')).toBe('loading');
    const before = c.text('order-panel-total');
    c.click(c.one('order-panel')!.querySelector<HTMLElement>('[data-testid^="qty-inc-"]')!);
    expect(c.text('order-panel-total')).not.toBe(before);
  });

  signedInScenario('D7', 3, 'a hit shows its name first, then its price and stock as they arrive', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.openOrder(fx.editable.orderId);
    c.settle();
    c.click('edit-items');
    typeSearch(c, fx.editable.addName.slice(0, 10));
    c.release('searchProducts');
    const hit = c.one('catalog-search')!.querySelector(`[data-sku="${fx.editable.addSku}"]`)!;
    expect(hit.textContent).toContain(fx.editable.addName);
    c.waitPending('prices');
    c.waitPending('stock');
    c.release('prices');
    const search = c.one('catalog-search')!;
    expect(c.partsAre(search, 'hit-price', 'ready')).toBe(true);
    expect(c.partsAre(search, 'hit-stock', 'loading')).toBe(true);
    expect((c.one(`add-${fx.editable.addSku}`) as HTMLButtonElement).disabled).toBe(true);
    c.release('stock');
    expect((c.one(`add-${fx.editable.addSku}`) as HTMLButtonElement).disabled).toBe(false);
  });

  signedInScenario('D8', 3, 'activity sentences show before the product names they need', (c, fx) => {
    const { customerId, customerName } = fx.twoInFlight;
    c.selectCustomer(customerId, customerName);
    expect(c.total('products')).toBe(0);
    c.releaseFor('activity', (arg) => arg === customerId);
    expect(c.state('activity')).toBe('ready');
    const region = c.one('activity')!;
    c.waitPending('products');
    expect(c.partStates(region)).toContain('loading');
    expect(c.partStates(region)).toContain('ready');
    c.settle();
    expect(c.isLoading(region)).toBe(false);
  });

  signedInScenario('D9', 3, 'a cart line shows its price while its name is on the way', (c) => {
    const { customerId, customerName } = withCart(c);
    c.selectAndSettle(customerId, customerName);
    c.tab('cart');
    c.waitPending('cart');
    c.release('cart');
    c.waitPending('products');
    c.waitPending('prices');
    c.release('prices');
    const cart = c.one('tab-cart')!;
    expect(c.partsAre(cart, 'line-price', 'ready')).toBe(true);
    expect(c.partsAre(cart, 'line-name', 'loading')).toBe(true);
    expect(c.partsAre(cart, 'cart-total', 'ready')).toBe(true);
    c.release('products');
    expect(c.partsAre(cart, 'line-name', 'ready')).toBe(true);
  });

  scenario('D10', 3, 'list rows show before their badges, which load together', (c) => {
    c.login();
    c.releaseFor('customers', () => true);
    expect(c.state('customers')).toBe('ready');
    expect(c.all('customers')[0].querySelectorAll('[data-customer-id]').length).toBe(8);
    expect(c.partsAre(c.one('customers')!, 'row-tier', 'loading')).toBe(true);
    expect(c.partsAre(c.one('customers')!, 'row-open-tickets', 'loading')).toBe(true);
    c.waitPending('tiers');
    c.waitPending('ticketCounts');
  });
});
