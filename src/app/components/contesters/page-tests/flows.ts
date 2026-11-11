import type { ConsolePage, Fixtures } from './console-page.harness';

/** A fixture customer other than `id` (id and name). */
export const otherCustomer = (fx: Fixtures, id: number) => {
  const all = [
    fx.allDelivered,
    fx.openTicket,
    fx.shipped,
    fx.twoInFlight,
    fx.editable,
  ];
  const other = all.find((x) => x.customerId !== id)!;
  return { id: other.customerId, name: other.customerName };
};

/** Ids and names of the first `n` rows of the customer list. */
export const firstCustomers = (c: ConsolePage, n = 2) =>
  [...c.all('customers')[0].querySelectorAll<HTMLElement>('[data-customer-id]')]
    .map((el) => ({
      id: Number(el.dataset['customerId']),
      name: el.querySelector('.truncate')?.textContent?.trim() ?? '',
    }))
    .slice(0, n);

export const text = (c: ConsolePage, testId: string) => c.text(testId);

/** Types into the editor's product search; answers the search, then the prices and stock of the hits. */
export const searchProducts = async (c: ConsolePage, value: string) => {
  await c.fill('catalog-search', value);
  await c.idle(450);
  await c.settle();
};

/** Types into the editor's product search without answering anything. */
export const typeSearch = async (c: ConsolePage, value: string) => {
  await c.fill('catalog-search', value);
  await c.idle(450);
};

/**
 * G1's flow up to Save: the ticket asks to add a product; open it, follow the
 * link to the order, Edit items, add the product from the product search.
 */
export const prepareOrderEdit = async (
  c: ConsolePage,
  fx: Fixtures['editable'],
) => {
  await c.selectAndSettle(fx.customerId, fx.customerName);
  await c.tab('tickets');
  await c.settle();
  await c.openTicket(fx.ticketId);
  await c.settle();
  await c.click('ticket-panel-order');
  await c.settle();
  expect(c.one('order-panel')!.getAttribute('data-order-id')).toBe(fx.orderId);
  const before = {
    total: c.text('order-panel-total'),
    spend: c.text('kpi-spend'),
  };
  await c.click('edit-items');
  await c.settle();
  await searchProducts(c, fx.addName.slice(0, 10));
  await c.click(`add-${fx.addSku}`);
  expect(
    c.one('order-panel')!.querySelector(`[data-sku="${fx.addSku}"]`),
  ).not.toBeNull();
  return before;
};

/** An order of a customer that has no ticket (any seed). */
export const orderWithoutTicket = (c: ConsolePage) => {
  for (let id = 1001; id < 1121; id++) {
    for (const o of c.truth<{ orderId: string }[]>('orders', id)) {
      if (!c.truth<unknown[]>('ticketsByOrder', o.orderId).length)
        return {
          customerId: id,
          customerName: c.truth('customer', id).name as string,
          orderId: o.orderId,
        };
    }
  }
  throw new Error('every order has a ticket');
};

/** A customer with an order that has a sku in common with the cart (any seed). */
export const withCartOrderOverlap = (c: ConsolePage) => {
  for (let id = 1001; id < 1121; id++) {
    const cart = c.truth<{ sku: string }[]>('cart', id).map((l) => l.sku);
    if (!cart.length || cart.length > 6) continue;
    for (const o of c.truth<{ orderId: string }[]>('orders', id)) {
      const lines = c
        .truth<{ lines: { sku: string }[] }>('order', o.orderId)
        .lines.map((l) => l.sku);
      if (lines.some((s) => cart.includes(s)))
        return {
          customerId: id,
          customerName: c.truth('customer', id).name as string,
          orderId: o.orderId,
        };
    }
  }
  throw new Error('no customer with a cart and an order in common');
};
