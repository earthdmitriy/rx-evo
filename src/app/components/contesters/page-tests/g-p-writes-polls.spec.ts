import type { ConsolePage } from './console-page.harness';
import { otherCustomer, prepareOrderEdit } from './flows';
import { signedInScenario, usd0 } from './scenario';

// Ported from e2e/specs/g-p-writes-polls.spec.ts.

const money = (s: string) => Number(s.replace(/[^0-9.]/g, ''));

/** The open-tickets number the ticket service holds for a customer. */
const openTickets = (c: ConsolePage, customerId: number): number =>
  c.truth<{ open: number }[]>('ticketCounts', [customerId])[0].open;

/** What the page shows for a customer's open tickets must be what `ticketCounts` says: KPI, Tickets badge, list row. */
const expectOpenTicketsShown = (c: ConsolePage, customerId: number) => {
  const open = openTickets(c, customerId);
  expect(c.text('kpi-open-tickets')).toBe(String(open));
  expect(c.text('tab-tickets-toggle')).toMatch(
    new RegExp('Tickets\\s*' + open + '\\s*$'),
  );
  expect(c.text('row-open-tickets', c.one(`customer-${customerId}`)!)).toBe(
    String(open),
  );
};

/** The spend and orders KPIs must be what `orderStats` says. */
const expectStatsShown = (c: ConsolePage, customerId: number) => {
  const stats = c.truth<{
    lifetimeSpend: number;
    orders: number;
    avgOrder: number;
  }>('orderStats', customerId);
  expect(c.text('kpi-spend')).toBe(usd0(stats.lifetimeSpend));
  expect(c.text('kpi-orders')).toBe(String(stats.orders));
  expect(c.text('kpi-avg')).toBe(usd0(stats.avgOrder));
};

const orderTotal = (c: ConsolePage, orderId: string) =>
  money(c.text('order-total', c.one(`order-${orderId}`)!));

describe('G · writes and P · polls (stage 1)', () => {
  signedInScenario(
    'G1',
    1,
    'an order change for a ticket shows everywhere',
    async (c, fx) => {
      const before = await prepareOrderEdit(c, fx.editable);
      await c.click('save');
      expect(c.isEnabled('save')).toBe(false);
      await c.release('updateOrder');
      await c.settle();
      expect(c.shown('edit-items').length).toBe(1);
      expect(money(c.text('order-panel-total'))).toBeGreaterThan(
        money(before.total),
      );
      expect(money(c.text('kpi-spend'))).toBeGreaterThan(money(before.spend));
      await c.click('close-panel');
      expect(
        c.text('ticket-status', c.one(`ticket-${fx.editable.ticketId}`)!),
      ).toBe('Waiting');
      await c.tab('orders');
      await c.settle();
      expect(orderTotal(c, fx.editable.orderId)).toBeGreaterThan(
        money(before.total),
      );
      // the counters other services keep, and the new line's name from the product service
      expectStatsShown(c, fx.editable.customerId);
      expectOpenTicketsShown(c, fx.editable.customerId);
      await c.click(`order-${fx.editable.orderId}`);
      await c.settle();
      const line = c
        .one('order-panel')!
        .querySelector<HTMLElement>(`[data-sku="${fx.editable.addSku}"]`)!;
      expect(c.text('line-name', line)).toBe(fx.editable.addName);
    },
  );

  signedInScenario('G3', 1, 'no double submission', async (c, fx) => {
    await prepareOrderEdit(c, fx.editable);
    c.resetStats();
    await c.dblclick('save');
    await c.idle(200);
    expect(c.total('updateOrder')).toBe(1);
  });

  signedInScenario(
    'G5',
    1,
    'a shipped order cannot be edited',
    async (c, fx) => {
      await c.selectAndSettle(fx.shipped.customerId, fx.shipped.customerName);
      await c.openOrder(fx.shipped.orderId);
      await c.settle();
      expect(c.shown('create-return').length).toBe(1);
      expect(c.has('edit-items')).toBe(false);
    },
  );

  signedInScenario(
    'G6',
    1,
    'a reply shows in the thread, the list and the KPI',
    async (c, fx) => {
      const { customerId, customerName, ticketId } = fx.openTicket;
      await c.selectAndSettle(customerId, customerName);
      const openBefore = Number(c.text('kpi-open-tickets'));
      await c.tab('tickets');
      await c.settle();
      await c.openTicket(ticketId);
      await c.settle();
      await c.fill('reply-text', 'Solved on our side, thanks!');
      await c.select('reply-status', 'Solved');
      await c.click('reply-send');
      await c.release('replyTicket');
      await c.settle();
      expect(c.texts('ticket-message').at(-1)).toContain('Solved on our side');
      expect(c.has('reply-text')).toBe(false);
      expect(c.text('ticket-status', c.one(`ticket-${ticketId}`)!)).toBe(
        'Solved',
      );
      expect(Number(c.text('kpi-open-tickets'))).toBe(openBefore - 1);
      expectOpenTicketsShown(c, customerId);
      // the reply is signed by the agent, by name
      expect(c.texts('message-author').at(-1)).toBe(c.text('agent-name'));
    },
  );

  signedInScenario('G8', 1, 'a new note shows on top', async (c, fx) => {
    await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    await c.tab('notes');
    await c.settle();
    await c.fill('note-text', 'Called the customer about the belt.');
    await c.click('note-add');
    await c.release('addNote');
    await c.settle();
    expect(c.texts('note')[0]).toContain('Called the customer about the belt.');
    expect(c.texts('note-author')[0]).toBe(c.text('agent-name'));
  });

  signedInScenario('G9', 1, 'mark all read clears the badge', async (c) => {
    expect(c.shown('unread-badge').length).toBe(1);
    await c.click('bell');
    await c.click('mark-all-read');
    await c.release('markNotificationsRead');
    await c.settle();
    expect(c.has('unread-badge')).toBe(false);
  });

  signedInScenario(
    'G10',
    1,
    'a write finishing after logout never shows in the next session',
    async (c, fx) => {
      await prepareOrderEdit(c, fx.editable);
      await c.click('save');
      await c.waitPending('updateOrder');
      await c.click('close-panel');
      await c.logout();
      await c.login();
      await c.settle();
      expect(c.has('order-panel')).toBe(false);
      expect(c.has('customer-header')).toBe(false);
      expect(c.has('save-error')).toBe(false);
    },
  );

  signedInScenario(
    'P1',
    1,
    'notifications refresh by themselves',
    async (c) => {
      c.resetStats();
      await c.idle(30_000);
      await c.release('notifications');
      expect(c.total('notifications')).toBeGreaterThanOrEqual(1);
      expect(c.has('bell')).toBe(true);
    },
  );

  signedInScenario('P2', 1, 'activity refreshes by itself', async (c, fx) => {
    await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    const entries = () => c.shown('activity-entry', c.one('activity')!);
    const before = entries().length;
    await c.idle(20_000);
    await c.release('activity');
    expect(entries().length).toBe(before + 1);
    // the new entry is a viewed product: its sentence is resolved
    await c.settle();
    expect(c.isLoading(c.one('activity')!)).toBe(false);
    expect(entries()[0].textContent).toMatch(/Viewed [A-Za-z]/);
  });
});

describe('G · writes (stage 2)', () => {
  signedInScenario(
    'G1',
    2,
    'an order change refreshes exactly what it changed',
    async (c, fx) => {
      await prepareOrderEdit(c, fx.editable);
      c.resetStats();
      await c.click('save');
      await c.release('updateOrder');
      await c.settle();
      const t = c.totals(
        'orders',
        'orderStats',
        'ticketCounts',
        'tickets',
        'ticketsByOrder',
        'customer',
        'customers',
        'tiers',
        'cart',
        'notes',
        'activity',
        'agent',
      );
      // asked now: the keys whose sections are shown (S5/S9, S4 and S3 row, S7, the ticket box)
      expect({
        orders: t['orders'] > 0,
        orderStats: t['orderStats'] > 0,
        tickets: t['tickets'] > 0,
        ticketsByOrder: t['ticketsByOrder'] > 0,
      }).toEqual({
        orders: true,
        orderStats: true,
        tickets: true,
        ticketsByOrder: true,
      });
      expect(t['ticketCounts']).toBeGreaterThan(0);
      expect({
        customer: t['customer'],
        customers: t['customers'],
        tiers: t['tiers'],
        cart: t['cart'],
        notes: t['notes'],
        activity: t['activity'],
        agents: t['agent'],
      }).toEqual({
        customer: 0,
        customers: 0,
        tiers: 0,
        cart: 0,
        notes: 0,
        activity: 0,
        agents: 0,
      });
    },
  );

  signedInScenario(
    'G11',
    2,
    'an order change without a reply leaves the tickets alone',
    async (c, fx) => {
      await prepareOrderEdit(c, fx.editable);
      await c.fill('order-reply-text', '');
      c.resetStats();
      await c.click('save');
      await c.release('updateOrder');
      await c.settle();
      const t = c.totals(
        'orders',
        'orderStats',
        'ticketCounts',
        'tickets',
        'ticketsByOrder',
        'ticket',
        'customer',
      );
      expect(t['orders']).toBeGreaterThan(0);
      expect(t['orderStats']).toBeGreaterThan(0);
      expect({
        ticketCounts: t['ticketCounts'],
        tickets: t['tickets'],
        ticketsByOrder: t['ticketsByOrder'],
        ticket: t['ticket'],
        customer: t['customer'],
      }).toEqual({
        ticketCounts: 0,
        tickets: 0,
        ticketsByOrder: 0,
        ticket: 0,
        customer: 0,
      });
    },
  );

  signedInScenario(
    'G2',
    2,
    'a failed order change shows its error, changes nothing else and keeps the edited lines',
    async (c, fx) => {
      const before = await prepareOrderEdit(c, fx.editable);
      await c.click('save');
      await c.fail('updateOrder');
      await c.settle();
      expect(c.has('save-error')).toBe(true);
      expect(c.text('kpi-spend')).toBe(before.spend);
      expect(
        c
          .one('order-panel')!
          .querySelector(`[data-sku="${fx.editable.addSku}"]`),
      ).not.toBeNull();
    },
  );

  signedInScenario(
    'G4',
    2,
    'a write survives switching customer',
    async (c, fx) => {
      const before = await prepareOrderEdit(c, fx.editable);
      c.resetStats();
      await c.click('save');
      await c.waitPending('updateOrder');
      await c.click('close-panel');
      const other = otherCustomer(fx, fx.editable.customerId);
      await c.selectCustomer(other.id, other.name);
      await c.release('updateOrder');
      await c.settle();
      expect(
        c.shownForCustomer(fx.editable.customerId, 'console-main'),
      ).toHaveLength(0);
      const s = c.stats('updateOrder');
      expect({ ok: s.ok, cancelled: s.cancelled }).toEqual({
        ok: 1,
        cancelled: 0,
      });
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.tab('orders');
      await c.settle();
      expect(orderTotal(c, fx.editable.orderId)).toBeGreaterThan(
        money(before.total),
      );
    },
  );

  signedInScenario(
    'G6',
    2,
    'a reply refreshes only the ticket side',
    async (c, fx) => {
      const { customerId, customerName, ticketId } = fx.openTicket;
      await c.selectAndSettle(customerId, customerName);
      await c.tab('tickets');
      await c.settle();
      await c.openTicket(ticketId);
      await c.settle();
      c.resetStats();
      await c.fill('reply-text', 'On it.');
      await c.click('reply-send');
      await c.release('replyTicket');
      await c.settle();
      const t = c.totals(
        'orders',
        'order',
        'orderStats',
        'cart',
        'notes',
        'ticketCounts',
        'tickets',
      );
      expect({
        orders: t['orders'],
        order: t['order'],
        orderStats: t['orderStats'],
        cart: t['cart'],
        notes: t['notes'],
      }).toEqual({
        orders: 0,
        order: 0,
        orderStats: 0,
        cart: 0,
        notes: 0,
      });
      expect(t['ticketCounts']).toBeGreaterThan(0);
      expect(t['tickets']).toBeGreaterThan(0);
    },
  );

  signedInScenario(
    'G7',
    2,
    'a failed reply shows its error, leaves the thread unchanged and keeps the text',
    async (c, fx) => {
      const { customerId, customerName, ticketId } = fx.openTicket;
      await c.selectAndSettle(customerId, customerName);
      await c.tab('tickets');
      await c.settle();
      await c.openTicket(ticketId);
      await c.settle();
      const count = c.all('ticket-message').length;
      await c.fill('reply-text', 'Keep me');
      await c.click('reply-send');
      await c.fail('replyTicket');
      await c.settle();
      expect(c.has('reply-error')).toBe(true);
      expect(c.all('ticket-message').length).toBe(count);
      expect(c.value('reply-text')).toBe('Keep me');
    },
  );

  signedInScenario(
    'G8',
    2,
    'a note refreshes only the notes',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.tab('notes');
      await c.settle();
      c.resetStats();
      await c.fill('note-text', 'Only notes change.');
      await c.click('note-add');
      await c.release('addNote');
      await c.settle();
      expect(
        c.totals(
          'customer',
          'orders',
          'orderStats',
          'ticketCounts',
          'activity',
          'tickets',
          'cart',
          'customers',
        ),
      ).toEqual({
        customer: 0,
        orders: 0,
        orderStats: 0,
        ticketCounts: 0,
        activity: 0,
        tickets: 0,
        cart: 0,
        customers: 0,
      });
    },
  );

  signedInScenario(
    'G9',
    2,
    'mark all read refreshes only the notifications',
    async (c) => {
      c.resetStats();
      await c.click('bell');
      await c.click('mark-all-read');
      await c.release('markNotificationsRead');
      await c.settle();
      expect(c.totals('profile', 'customers')).toEqual({
        profile: 0,
        customers: 0,
      });
    },
  );
});
