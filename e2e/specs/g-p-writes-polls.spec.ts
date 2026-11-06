import { Console, expect, scenario } from '../support/console';
import { otherCustomer, prepareOrderEdit, signedIn, text, usd0 } from '../support/flows';

const money = (s: string) => Number(s.replace(/[^0-9.]/g, ''));

/** The open-tickets number the ticket service holds for a customer. */
const openTickets = async (c: Console, customerId: number): Promise<number> => ((await c.truth('ticketCounts', [customerId])) as { open: number }[])[0].open;

/** What the page shows for a customer's open tickets must be what `ticketCounts` says: KPI, Tickets badge, list row. */
const expectOpenTicketsShown = async (c: Console, customerId: number) => {
  const open = await openTickets(c, customerId);
  await expect(c.testId('kpi-open-tickets')).toHaveText(String(open));
  await expect(c.testId('tab-tickets-toggle')).toHaveText(new RegExp('Tickets\\s*' + open + '\\s*$'));
  await expect(c.testId(`customer-${customerId}`).getByTestId('row-open-tickets')).toHaveText(open ? String(open) : '');
};

/** The spend and orders KPIs and the Orders badge must be what `orderStats` says. */
const expectStatsShown = async (c: Console, customerId: number) => {
  const stats = (await c.truth('orderStats', customerId)) as { lifetimeSpend: number; orders: number; avgOrder: number };
  await expect(c.testId('kpi-spend')).toHaveText(usd0(stats.lifetimeSpend));
  await expect(c.testId('kpi-orders')).toHaveText(String(stats.orders));
  await expect(c.testId('kpi-avg')).toHaveText(usd0(stats.avgOrder));
};

// ---------- stage 1 ----------

scenario('G1', 1, 'an order change for a ticket shows everywhere', async ({ c }) => {
  const fx = await signedIn(c);
  const before = await prepareOrderEdit(c, fx.editable);
  await c.testId('save').click();
  await expect(c.testId('save')).toBeDisabled();
  await c.release('updateOrder');
  await c.settle();
  await expect(c.testId('edit-items')).toBeVisible();
  expect(money(await text(c, 'order-panel-total'))).toBeGreaterThan(money(before.total));
  expect(money(await text(c, 'kpi-spend'))).toBeGreaterThan(money(before.spend));
  await c.testId('close-panel').click();
  await expect(c.testId(`ticket-${fx.editable.ticketId}`).getByTestId('ticket-status')).toHaveText('Waiting');
  await c.tab('orders');
  await c.settle();
  expect(money(await c.testId(`order-${fx.editable.orderId}`).getByTestId('order-total').innerText())).toBeGreaterThan(money(before.total));
  // the counters other services keep, and the new line's name from the product service
  await expectStatsShown(c, fx.editable.customerId);
  await expectOpenTicketsShown(c, fx.editable.customerId);
  await c.testId(`order-${fx.editable.orderId}`).click();
  await c.settle();
  await expect(c.testId('order-panel').locator(`[data-sku="${fx.editable.addSku}"] [data-testid="line-name"]`)).toHaveText(fx.editable.addName);
}, { smoke: true });

scenario('G3', 1, 'no double submission', async ({ c }) => {
  const fx = await signedIn(c);
  await prepareOrderEdit(c, fx.editable);
  await c.resetStats();
  await c.testId('save').dblclick();
  await c.idle(200);
  expect(await c.total('updateOrder')).toBe(1);
});

scenario('G5', 1, 'a shipped order cannot be edited', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.shipped.customerId, fx.shipped.customerName);
  await c.openOrder(fx.shipped.orderId);
  await c.settle();
  await expect(c.testId('create-return')).toBeVisible();
  await expect(c.testId('edit-items')).toHaveCount(0);
});

scenario('G6', 1, 'a reply shows in the thread, the list and the KPI', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, ticketId } = fx.openTicket;
  await c.selectAndSettle(customerId, customerName);
  const openBefore = Number(await text(c, 'kpi-open-tickets'));
  await c.tab('tickets');
  await c.settle();
  await c.openTicket(ticketId);
  await c.settle();
  await c.testId('reply-text').fill('Solved on our side, thanks!');
  await c.testId('reply-status').selectOption('Solved');
  await c.testId('reply-send').click();
  await c.release('replyTicket');
  await c.settle();
  await expect(c.testId('ticket-message').last()).toContainText('Solved on our side');
  await expect(c.testId('reply-text')).toHaveCount(0);
  await expect(c.testId(`ticket-${ticketId}`).getByTestId('ticket-status')).toHaveText('Solved');
  expect(Number(await text(c, 'kpi-open-tickets'))).toBe(openBefore - 1);
  await expectOpenTicketsShown(c, customerId);
  // the reply is signed by the agent, by name
  await expect(c.testId('message-author').last()).toHaveText(await text(c, 'agent-name'));
}, { smoke: true });

scenario('G8', 1, 'a new note shows on top', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.tab('notes');
  await c.settle();
  await c.testId('note-text').fill('Called the customer about the belt.');
  await c.testId('note-add').click();
  await c.release('addNote');
  await c.settle();
  await expect(c.testId('note').first()).toContainText('Called the customer about the belt.');
  await expect(c.testId('note-author').first()).toHaveText(await text(c, 'agent-name'));
});

scenario('G9', 1, 'mark all read clears the badge', async ({ c }) => {
  await signedIn(c);
  await expect(c.testId('unread-badge')).toBeVisible();
  await c.testId('bell').click();
  await c.testId('mark-all-read').click();
  await c.release('markNotificationsRead');
  await c.settle();
  await expect(c.testId('unread-badge')).toHaveCount(0);
});

scenario('G10', 1, 'a write finishing after logout never shows in the next session', async ({ c }) => {
  const fx = await signedIn(c);
  await prepareOrderEdit(c, fx.editable);
  await c.testId('save').click();
  await c.waitPending('updateOrder');
  await c.testId('close-panel').click();
  await c.logout();
  await c.login();
  await c.settle();
  await expect(c.testId('order-panel')).toHaveCount(0);
  await expect(c.testId('customer-header')).toHaveCount(0);
  await expect(c.testId('save-error')).toHaveCount(0);
});

scenario('P1', 1, 'notifications refresh by themselves', async ({ c, page }) => {
  await signedIn(c, { clock: true });
  await c.resetStats();
  await page.clock.runFor(30_000);
  await c.release('notifications');
  expect(await c.total('notifications')).toBeGreaterThanOrEqual(1);
  await expect(c.testId('bell')).toBeVisible();
});

scenario('P2', 1, 'activity refreshes by itself', async ({ c, page }) => {
  const fx = await signedIn(c, { clock: true });
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  const entries = c.testId('activity').locator('[data-testid="activity-entry"]:visible');
  const before = await entries.count();
  await page.clock.runFor(20_000);
  await c.release('activity');
  await expect(entries).toHaveCount(before + 1);
  // the new entry is a viewed product: its sentence is resolved
  await c.settle();
  await c.expectNoLoading(c.testId('activity'));
  await expect(entries.first()).toContainText(/Viewed [A-Za-z]/);
});

// ---------- stage 2 ----------

scenario('G1', 2, 'an order change refreshes exactly what it changed', async ({ c }) => {
  const fx = await signedIn(c);
  await prepareOrderEdit(c, fx.editable);
  await c.resetStats();
  await c.testId('save').click();
  await c.release('updateOrder');
  await c.settle();
  const t = await c.totals('orders', 'orderStats', 'ticketCounts', 'tickets', 'ticketsByOrder', 'customer', 'customers', 'tiers', 'cart', 'notes', 'activity', 'agents');
  // asked now: the keys whose sections are shown (S5/S9, S4 and S3 row, S7, the ticket box)
  expect({ orders: t.orders > 0, orderStats: t.orderStats > 0, tickets: t.tickets > 0, ticketsByOrder: t.ticketsByOrder > 0 }).toEqual({
    orders: true, orderStats: true, tickets: true, ticketsByOrder: true,
  });
  expect(t.ticketCounts).toBeGreaterThan(0);
  expect({ customer: t.customer, customers: t.customers, tiers: t.tiers, cart: t.cart, notes: t.notes, activity: t.activity, agents: t.agents }).toEqual({
    customer: 0, customers: 0, tiers: 0, cart: 0, notes: 0, activity: 0, agents: 0,
  });
}, { smoke: true });

scenario('G11', 2, 'an order change without a reply leaves the tickets alone', async ({ c }) => {
  const fx = await signedIn(c);
  await prepareOrderEdit(c, fx.editable);
  await c.testId('order-reply-text').fill('');
  await c.resetStats();
  await c.testId('save').click();
  await c.release('updateOrder');
  await c.settle();
  const t = await c.totals('orders', 'orderStats', 'ticketCounts', 'tickets', 'ticketsByOrder', 'ticket', 'customer');
  expect(t.orders).toBeGreaterThan(0);
  expect(t.orderStats).toBeGreaterThan(0);
  expect({ ticketCounts: t.ticketCounts, tickets: t.tickets, ticketsByOrder: t.ticketsByOrder, ticket: t.ticket, customer: t.customer }).toEqual({
    ticketCounts: 0, tickets: 0, ticketsByOrder: 0, ticket: 0, customer: 0,
  });
});

scenario('G2', 2, 'a failed order change shows its error, changes nothing else and keeps the edited lines', async ({ c }) => {
  const fx = await signedIn(c);
  const before = await prepareOrderEdit(c, fx.editable);
  await c.testId('save').click();
  await c.fail('updateOrder');
  await c.settle();
  await expect(c.testId('save-error')).toBeVisible();
  expect(await text(c, 'kpi-spend')).toBe(before.spend);
  await expect(c.testId('order-panel').locator(`[data-sku="${fx.editable.addSku}"]`)).toBeVisible();
});

scenario('G4', 2, 'a write survives switching customer', async ({ c }) => {
  const fx = await signedIn(c);
  const before = await prepareOrderEdit(c, fx.editable);
  await c.resetStats();
  await c.testId('save').click();
  await c.waitPending('updateOrder');
  await c.testId('close-panel').click();
  const other = otherCustomer(fx, fx.editable.customerId);
  await c.selectCustomer(other.id, other.name);
  await c.release('updateOrder');
  await c.settle();
  await expect(c.shownForCustomer(fx.editable.customerId, 'console-main')).toHaveCount(0);
  const s = await c.stats('updateOrder');
  expect({ ok: s.ok, cancelled: s.cancelled }).toEqual({ ok: 1, cancelled: 0 });
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.tab('orders');
  await c.settle();
  expect(money(await c.testId(`order-${fx.editable.orderId}`).getByTestId('order-total').innerText())).toBeGreaterThan(money(before.total));
});

scenario('G6', 2, 'a reply refreshes only the ticket side', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, ticketId } = fx.openTicket;
  await c.selectAndSettle(customerId, customerName);
  await c.tab('tickets');
  await c.settle();
  await c.openTicket(ticketId);
  await c.settle();
  await c.resetStats();
  await c.testId('reply-text').fill('On it.');
  await c.testId('reply-send').click();
  await c.release('replyTicket');
  await c.settle();
  const t = await c.totals('orders', 'order', 'orderStats', 'cart', 'notes', 'ticketCounts', 'tickets');
  expect({ orders: t.orders, order: t.order, orderStats: t.orderStats, cart: t.cart, notes: t.notes }).toEqual({
    orders: 0, order: 0, orderStats: 0, cart: 0, notes: 0,
  });
  expect(t.ticketCounts).toBeGreaterThan(0);
  expect(t.tickets).toBeGreaterThan(0);
});

scenario('G7', 2, 'a failed reply shows its error, leaves the thread unchanged and keeps the text', async ({ c }) => {
  const fx = await signedIn(c);
  const { customerId, customerName, ticketId } = fx.openTicket;
  await c.selectAndSettle(customerId, customerName);
  await c.tab('tickets');
  await c.settle();
  await c.openTicket(ticketId);
  await c.settle();
  const count = await c.testId('ticket-message').count();
  await c.testId('reply-text').fill('Keep me');
  await c.testId('reply-send').click();
  await c.fail('replyTicket');
  await c.settle();
  await expect(c.testId('reply-error')).toBeVisible();
  await expect(c.testId('ticket-message')).toHaveCount(count);
  await expect(c.testId('reply-text')).toHaveValue('Keep me');
});

scenario('G8', 2, 'a note refreshes only the notes', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.tab('notes');
  await c.settle();
  await c.resetStats();
  await c.testId('note-text').fill('Only notes change.');
  await c.testId('note-add').click();
  await c.release('addNote');
  await c.settle();
  expect(await c.totals('customer', 'orders', 'orderStats', 'ticketCounts', 'activity', 'tickets', 'cart', 'customers')).toEqual({
    customer: 0, orders: 0, orderStats: 0, ticketCounts: 0, activity: 0, tickets: 0, cart: 0, customers: 0,
  });
});

scenario('G9', 2, 'mark all read refreshes only the notifications', async ({ c }) => {
  await signedIn(c);
  await c.resetStats();
  await c.testId('bell').click();
  await c.testId('mark-all-read').click();
  await c.release('markNotificationsRead');
  await c.settle();
  expect(await c.totals('profile', 'customers')).toEqual({ profile: 0, customers: 0 });
});
