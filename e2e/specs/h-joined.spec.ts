import { Console, expect, scenario } from '../support/console';
import { searchProducts, signedIn, usd, usd0, withCart } from '../support/flows';

// ---------- stage 1: joined data (R-J1 … R-J7) ----------
// Everything on the page is compared with what the backend holds (`c.truth`).

type Product = { sku: string; name: string };

const productNames = async (c: Console, skus: string[]) =>
  new Map(await Promise.all(skus.map(async (sku): Promise<[string, string]> => [sku, ((await c.truth('product', sku)) as Product).name])));

/** The sentence R-J6 prescribes for an activity entry. */
const activitySentence = (e: { kind: string; refId: string }, names: Map<string, string>) =>
  ({
    'order-placed': `Placed order ${e.refId}`,
    'order-changed': `Changed order ${e.refId}`,
    'order-delivered': `Order ${e.refId} delivered`,
    'ticket-opened': `Opened ticket ${e.refId}`,
    'product-viewed': `Viewed ${names.get(e.refId)}`,
  })[e.kind];

/** An order of a customer that has no ticket (any seed). */
const orderWithoutTicket = (c: Console) =>
  c.page.evaluate(() => {
    const api = (window as any).__api;
    for (let id = 1001; id < 1121; id++) {
      for (const o of api.truth('orders', id) as { orderId: string }[]) {
        if (!(api.truth('ticketsByOrder', o.orderId) as unknown[]).length) return { customerId: id, customerName: api.truth('customer', id).name as string, orderId: o.orderId };
      }
    }
    throw new Error('every order has a ticket');
  });

scenario('H1', 1, 'list rows show the tier and the open tickets of their own customer', async ({ c }) => {
  await signedIn(c);
  const rows = c.page.locator('[data-testid^="customer-"][data-customer-id]');
  await expect(rows).toHaveCount(8);
  const ids = await rows.evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-customer-id'))));
  const tiers = new Map(((await c.truth('tiers', ids)) as { customerId: number; tier: string }[]).map((t) => [t.customerId, t.tier]));
  const counts = new Map(((await c.truth('ticketCounts', ids)) as { customerId: number; open: number }[]).map((t) => [t.customerId, t.open]));
  for (const id of ids) {
    const row = c.testId(`customer-${id}`);
    const profile = await c.truth('customer', id);
    await expect(row).toContainText(profile.name);
    await expect(row).toContainText(profile.email);
    await expect(row.getByTestId('row-tier')).toHaveText(tiers.get(id)!);
    await expect(row.getByTestId('row-open-tickets')).toHaveText(String(counts.get(id)));
  }
  await c.expectFields(c.testId('customers'), 'row-tier', 'shown');
  await c.expectFields(c.testId('customers'), 'row-open-tickets', 'shown');
}, { smoke: true });

scenario('H2', 1, 'the header and KPIs show their own services', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName } = fx.editable;
  await c.selectAndSettle(customerId, customerName);
  const profile = await c.truth('customer', customerId);
  const stats = await c.truth('orderStats', customerId);
  const open = ((await c.truth('ticketCounts', [customerId])) as { open: number }[])[0].open;
  const header = c.testId('customer-header');
  await expect(c.testId('customer-name')).toHaveText(profile.name);
  await expect(header).toContainText(profile.tier);
  await expect(header).toContainText(profile.city);
  await expect(c.testId('kpi-spend')).toHaveText(usd0(stats.lifetimeSpend));
  await expect(c.testId('kpi-orders')).toHaveText(String(stats.orders));
  await expect(c.testId('kpi-avg')).toHaveText(usd0(stats.avgOrder));
  await expect(c.testId('kpi-open-tickets')).toHaveText(String(open));
  await expect(c.testId('tab-orders-toggle')).toHaveText(new RegExp('Orders\\s*' + stats.orders + '\\s*$'));
  await expect(c.testId('tab-tickets-toggle')).toHaveText(new RegExp('Tickets\\s*' + open + '\\s*$'));
  await c.expectFields(header, 'kpi-spend', 'shown');
});

scenario('H3', 1, 'cart lines show the product name and the current price', async ({ c }) => {
  await signedIn(c);
  const { customerId, customerName, skus } = await withCart(c);
  await c.selectAndSettle(customerId, customerName);
  await c.tab('cart');
  await c.settle();
  const names = await productNames(c, skus);
  const prices = new Map(((await c.truth('prices', skus)) as { sku: string; price: number }[]).map((p) => [p.sku, p.price]));
  const cart = (await c.truth('cart', customerId)) as { sku: string; qty: number }[];
  let total = 0;
  for (const l of cart) {
    const row = c.testId('tab-cart').locator(`tr[data-sku="${l.sku}"]`);
    await expect(row.getByTestId('line-name')).toHaveText(names.get(l.sku)!);
    await expect(row.getByTestId('line-price')).toHaveText(usd(prices.get(l.sku)!));
    await expect(row).toContainText(usd(l.qty * prices.get(l.sku)!));
    total += l.qty * prices.get(l.sku)!;
  }
  await expect(c.testId('cart-total')).toHaveText(usd(total));
}, { smoke: true });

scenario('H4', 1, 'order lines show the product name and the price they were sold at', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, orderIds } = fx.twoInFlight;
  await c.selectAndSettle(customerId, customerName);
  await c.openOrder(orderIds[0]);
  await c.settle();
  const order = await c.truth('order', orderIds[0]);
  const names = await productNames(c, order.lines.map((l: { sku: string }) => l.sku));
  for (const l of order.lines as { sku: string; qty: number; unitPrice: number }[]) {
    const row = c.testId('order-panel').locator(`tr[data-sku="${l.sku}"]`);
    await expect(row.getByTestId('line-name')).toHaveText(names.get(l.sku)!);
    await expect(row).toContainText(usd(l.unitPrice));
  }
  await c.expectFields(c.testId('order-panel'), 'line-name', 'shown');
});

scenario('H5', 1, 'thread messages show the names of their authors', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, ticketId } = fx.threaded;
  await c.selectAndSettle(customerId, customerName);
  await c.tab('tickets');
  await c.settle();
  await c.openTicket(ticketId);
  await c.settle();
  const ticket = await c.truth('ticket', ticketId);
  const expected: string[] = [];
  for (const m of ticket.messages as { from: string; authorId: number }[]) {
    expected.push(
      m.from === 'agent'
        ? ((await c.truth('agent', m.authorId)) as { name: string }).name
        : (await c.truth('customer', m.authorId)).name,
    );
  }
  expect(expected.length).toBeGreaterThan(1);
  await expect(c.testId('message-author')).toHaveText(expected);
});

scenario('H6', 1, 'notes show the names of their authors', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName } = fx.noted;
  await c.selectAndSettle(customerId, customerName);
  await c.tab('notes');
  await c.settle();
  const notes = (await c.truth('notes', customerId)) as { authorId: number; text: string }[];
  const names = new Map(await Promise.all([...new Set(notes.map((n) => n.authorId))].map(async (id): Promise<[number, string]> => [id, ((await c.truth('agent', id)) as { name: string }).name])));
  await expect(c.testId('note-author')).toHaveText(notes.map((n) => names.get(n.authorId)!));
  await expect(c.testId('note')).toHaveCount(notes.length);
  for (const [i, n] of notes.entries()) await expect(c.testId('note').nth(i)).toContainText(n.text);
});

scenario('H7', 1, 'activity shows a sentence per event, with product names', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName } = fx.twoInFlight;
  await c.selectAndSettle(customerId, customerName);
  const entries = (await c.truth('peekActivity', customerId)) as { kind: string; refId: string }[];
  const names = await productNames(c, entries.filter((e) => e.kind === 'product-viewed').map((e) => e.refId));
  const shown = c.testId('activity').locator('[data-testid="activity-entry"]');
  await expect(shown).toHaveCount(entries.length);
  for (const [i, e] of entries.entries()) await expect(shown.nth(i)).toContainText(activitySentence(e, names)!);
  expect(entries.some((e) => e.kind === 'product-viewed')).toBe(true);
});

scenario('H8', 1, 'notification sentences name the customer', async ({ c }) => {
  await signedIn(c);
  await c.testId('bell').click();
  await c.settle();
  const list = (await c.truth('notifications')) as { id: number; kind: string; ticketId?: string; orderId?: string; customerId: number }[];
  expect(list.length).toBeGreaterThan(0);
  const shown = c.testId('notifications-list').locator('[data-notification-id]');
  await expect(shown).toHaveCount(list.length);
  for (const [i, n] of list.entries()) {
    const sentence =
      n.kind === 'ticket-reply'
        ? `${n.ticketId}: new message from ${(await c.truth('customer', n.customerId)).name}`
        : n.kind === 'ticket-escalated'
          ? `${n.ticketId} escalated to you`
          : `${n.orderId} delivered`;
    await expect(shown.nth(i)).toContainText(sentence);
  }
});

scenario('H9', 1, 'editor hits show name, current price and stock', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.testId('edit-items').click();
  const query = fx.editable.addName.slice(0, 3);
  await searchProducts(c, query);
  const hits = (await c.truth('searchProducts', query)) as Product[];
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.length).toBeLessThanOrEqual(10);
  const skus = hits.map((h) => h.sku);
  const prices = new Map(((await c.truth('prices', skus)) as { sku: string; price: number }[]).map((p) => [p.sku, p.price]));
  const stock = new Map(await Promise.all(skus.map(async (sku): Promise<[string, number]> => [sku, ((await c.truth('stock', sku)) as { stock: number }).stock])));
  for (const h of hits) {
    const row = c.testId('catalog-search').locator(`li[data-sku="${h.sku}"]`);
    await expect(row).toContainText(h.name);
    await expect(row.getByTestId('hit-price')).toHaveText(usd(prices.get(h.sku)!));
    await expect(row.getByTestId('hit-stock')).toHaveText(stock.get(h.sku) ? `${stock.get(h.sku)} in stock` : 'out of stock');
    if (stock.get(h.sku)) await expect(c.testId(`add-${h.sku}`)).toBeEnabled();
    else await expect(c.testId(`add-${h.sku}`)).toBeDisabled();
  }
});

scenario('H10', 1, 'the ticket box shows the order\'s open ticket, none when there is none', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  const rows = (await c.truth('ticketsByOrder', fx.editable.orderId)) as { ticketId: string; subject: string; status: string; updated: string }[];
  const byRecent = [...rows].sort((a, b) => b.updated.localeCompare(a.updated));
  const expected = byRecent.find((t) => t.status !== 'Solved') ?? byRecent[0];
  await expect(c.testId('order-ticket').locator('[data-ticket-id]')).toHaveAttribute('data-ticket-id', expected.ticketId);
  await expect(c.testId('order-ticket')).toContainText(expected.subject);
  await c.testId('close-panel').click();
  const bare = await orderWithoutTicket(c);
  await c.selectAndSettle(bare.customerId, bare.customerName);
  await c.openOrder(bare.orderId);
  await c.settle();
  await c.expectState('order-panel', 'ready');
  await expect(c.testId('order-ticket')).toHaveCount(0);
});

scenario('H11', 1, 'a block that is not loading leaves no name, price or counter of the previous customer', async ({ c }) => {
  await signedIn(c);
  const a = await withCart(c, 0);
  const b = await withCart(c, 1);
  await c.selectAndSettle(a.customerId, a.customerName);
  await c.tab('cart');
  await c.settle();
  await c.selectCustomer(b.customerId, b.customerName);
  await c.idle(200);
  // old data may stay under a block's spinner; outside a loading block nothing of the previous customer shows
  expect(await c.settledContentOf('console-main')).not.toContain(a.customerName);
  await c.settle();
  const rows = c.testId('tab-cart').locator('tr[data-sku]');
  await expect(rows).toHaveCount(b.skus.length);
  const shown = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-sku')));
  expect(shown.sort()).toEqual([...b.skus].sort());
  const stats = await c.truth('orderStats', b.customerId);
  await expect(c.testId('kpi-spend')).toHaveText(usd0(stats.lifetimeSpend));
  await expect(c.testId('console-main')).not.toContainText(a.customerName);
});

scenario('H12', 1, 'a cart with more than 20 skus shows every name and price', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, lines } = fx.bigCart;
  await c.selectAndSettle(customerId, customerName);
  await c.tab('cart');
  await c.settle();
  await expect(c.testId('tab-cart').locator('tr[data-sku]')).toHaveCount(lines);
  await c.expectFields(c.testId('tab-cart'), 'line-name', 'shown');
  await c.expectFields(c.testId('tab-cart'), 'line-price', 'shown');
  expect((await c.stats('product')).errors).toBe(0);
  expect((await c.stats('prices')).errors).toBe(0);
  const first = ((await c.truth('cart', customerId)) as { sku: string }[])[0].sku;
  const name = ((await c.truth('product', first)) as Product).name;
  await expect(c.testId('tab-cart').locator(`tr[data-sku="${first}"]`).getByTestId('line-name')).toHaveText(name);
});
