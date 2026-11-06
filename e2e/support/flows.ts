import { Console, expect, Fixtures } from './console';

/** A fixture customer other than `id` (id and name). */
export const otherCustomer = (fx: Fixtures, id: number) => {
  const all = [fx.allDelivered, fx.openTicket, fx.shipped, fx.twoInFlight, fx.editable];
  const other = all.find((x) => x.customerId !== id)!;
  return { id: other.customerId, name: other.customerName };
};

/** Opens the page, signs in and lets everything load. */
export const signedIn = async (c: Console, options: { clock?: boolean } = {}) => {
  await c.open(options);
  await c.loginAndSettle();
  return c.fixtures();
};

/** Ids and names of the first `n` rows of the customer list. */
export const firstCustomers = async (c: Console, n = 2) => {
  const rows = c.page.locator('[data-testid^="customer-"][data-customer-id]');
  await expect(rows.first()).toBeVisible();
  const all = await rows.evaluateAll((els) =>
    els.map((el) => ({
      id: Number(el.getAttribute('data-customer-id')),
      name: el.querySelector('.truncate')?.textContent?.trim() ?? '',
    })),
  );
  return all.slice(0, n);
};

export const text = async (c: Console, testId: string) => ((await c.testId(testId).first().textContent()) ?? '').trim();

/** Types into the editor's product search; answers the search, then the prices and stock of the hits. */
export const searchProducts = async (c: Console, text: string) => {
  await c.testId('catalog-search').locator('input').fill(text);
  await c.idle(450);
  await c.settle();
};

/** Types into the editor's product search without answering anything. */
export const typeSearch = async (c: Console, text: string) => {
  await c.testId('catalog-search').locator('input').fill(text);
  await c.idle(450);
};

/**
 * G1's flow up to Save: the ticket asks to add a product; open it, follow the
 * link to the order, Edit items, add the product from the product search.
 */
export const prepareOrderEdit = async (c: Console, fx: Fixtures['editable']) => {
  await c.selectAndSettle(fx.customerId, fx.customerName);
  await c.tab('tickets');
  await c.settle();
  await c.openTicket(fx.ticketId);
  await c.settle();
  await c.testId('ticket-panel-order').click();
  await c.settle();
  await expect(c.testId('order-panel')).toHaveAttribute('data-order-id', fx.orderId);
  const before = { total: await text(c, 'order-panel-total'), spend: await text(c, 'kpi-spend') };
  await c.testId('edit-items').click();
  await c.settle();
  await searchProducts(c, fx.addName.slice(0, 10));
  await c.testId(`add-${fx.addSku}`).click();
  await expect(c.testId('order-panel').locator(`[data-sku="${fx.addSku}"]`)).toBeVisible();
  return before;
};

/** A customer with a non-empty cart (any seed). */
export const withCart = async (c: Console, skip = 0): Promise<{ customerId: number; customerName: string; skus: string[] }> =>
  c.page.evaluate((n) => {
    const api = (window as any).__api;
    const found: { customerId: number; customerName: string; skus: string[] }[] = [];
    for (let id = 1001; id < 1121 && found.length <= n; id++) {
      const cart = api.truth('cart', id) as { sku: string }[];
      if (cart.length && cart.length <= 6) found.push({ customerId: id, customerName: api.truth('customer', id).name, skus: cart.map((l) => l.sku) });
    }
    return found[n];
  }, skip);

/** Whole dollars as the currency pipe shows them. */
export const usd0 = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/** Dollars and cents as the currency pipe shows them. */
export const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A customer with an order that has a sku in common with the cart (any seed). */
export const withCartOrderOverlap = async (c: Console): Promise<{ customerId: number; customerName: string; orderId: string }> =>
  c.page.evaluate(() => {
    const api = (window as any).__api;
    for (let id = 1001; id < 1121; id++) {
      const cart = (api.truth('cart', id) as { sku: string }[]).map((l) => l.sku);
      if (!cart.length || cart.length > 6) continue;
      for (const o of api.truth('orders', id) as { orderId: string }[]) {
        const lines = (api.truth('order', o.orderId).lines as { sku: string }[]).map((l) => l.sku);
        if (lines.some((s) => cart.includes(s))) return { customerId: id, customerName: api.truth('customer', id).name as string, orderId: o.orderId };
      }
    }
    throw new Error('no customer with a cart and an order in common');
  });
