import { scenario, signedInScenario, usd, usd0, withCart } from './scenario';
import { orderWithoutTicket, searchProducts } from './flows';
import type { ConsolePage } from './console-page.harness';

/** The sentence R-J6 prescribes for an activity entry. */
const activitySentence = (
  e: { kind: string; refId: string },
  names: Map<string, string>,
) =>
  ({
    'order-placed': `Placed order ${e.refId}`,
    'order-changed': `Changed order ${e.refId}`,
    'order-delivered': `Order ${e.refId} delivered`,
    'ticket-opened': `Opened ticket ${e.refId}`,
    'product-viewed': `Viewed ${names.get(e.refId)}`,
  })[e.kind];

// ---------- stage 1: joined data (R-J1 … R-J7), ported from e2e/specs/h-joined.spec.ts ----------
// Everything on the page is compared with what the backend holds (`c.truth`).

type Product = { sku: string; name: string };

const productNames = (c: ConsolePage, skus: string[]) =>
  new Map(
    skus.map((sku): [string, string] => [
      sku,
      c.truth<Product>('product', sku).name,
    ]),
  );

describe('H · joined data', () => {
  signedInScenario(
    'H1',
    1,
    'list rows show the tier and the open tickets of their own customer',
    async (c) => {
      const rows = c
        .all('customers')[0]
        .querySelectorAll<HTMLElement>('[data-customer-id]');
      expect(rows.length).toBe(8);
      const ids = [...rows].map((r) => Number(r.dataset['customerId']));
      const tiers = new Map(
        c
          .truth<{ customerId: number; tier: string }[]>('tiers', ids)
          .map((t) => [t.customerId, t.tier]),
      );
      const counts = new Map(
        c
          .truth<{ customerId: number; open: number }[]>('ticketCounts', ids)
          .map((t) => [t.customerId, t.open]),
      );
      for (const id of ids) {
        const row = c.one(`customer-${id}`)!;
        const profile = c.truth('customer', id);
        expect(row.textContent).toContain(profile.name);
        expect(row.textContent).toContain(profile.email);
        expect(c.text('row-tier', row)).toBe(tiers.get(id));
        expect(c.text('row-open-tickets', row)).toBe(String(counts.get(id)));
      }
      expect(new Set(c.fieldStates(c.one('customers')!, 'row-tier'))).toEqual(
        new Set(['shown']),
      );
      expect(
        new Set(c.fieldStates(c.one('customers')!, 'row-open-tickets')),
      ).toEqual(new Set(['shown']));
    },
  );

  signedInScenario(
    'H2',
    1,
    'the header and KPIs show their own services',
    async (c, fx) => {
      const { customerId, customerName } = fx.editable;
      await c.selectAndSettle(customerId, customerName);
      const profile = c.truth('customer', customerId);
      const stats = c.truth('orderStats', customerId);
      const open = c.truth<{ open: number }[]>('ticketCounts', [customerId])[0]
        .open;
      expect(c.text('customer-name')).toBe(profile.name);
      expect(c.text('customer-header')).toContain(profile.tier);
      expect(c.text('customer-header')).toContain(profile.city);
      expect(c.text('kpi-spend')).toBe(usd0(stats.lifetimeSpend));
      expect(c.text('kpi-orders')).toBe(String(stats.orders));
      expect(c.text('kpi-avg')).toBe(usd0(stats.avgOrder));
      expect(c.text('kpi-open-tickets')).toBe(String(open));
      expect(c.text('tab-orders-toggle')).toMatch(
        new RegExp('Orders\\s*' + stats.orders + '\\s*$'),
      );
      expect(c.text('tab-tickets-toggle')).toMatch(
        new RegExp('Tickets\\s*' + open + '\\s*$'),
      );
      expect(
        new Set(c.fieldStates(c.one('customer-header')!, 'kpi-spend')),
      ).toEqual(new Set(['shown']));
    },
  );

  signedInScenario(
    'H3',
    1,
    'cart lines show the product name and the current price',
    async (c) => {
      const { customerId, customerName, skus } = withCart(c);
      await c.selectAndSettle(customerId, customerName);
      await c.tab('cart');
      await c.settle();
      const names = productNames(c, skus);
      const prices = new Map(
        c
          .truth<{ sku: string; price: number }[]>('prices', skus)
          .map((p) => [p.sku, p.price]),
      );
      const cart = c.truth<{ sku: string; qty: number }[]>('cart', customerId);
      const tab = c.one('tab-cart')!;
      let total = 0;
      for (const l of cart) {
        const row = tab.querySelector<HTMLElement>(`tr[data-sku="${l.sku}"]`)!;
        expect(c.text('line-name', row)).toBe(names.get(l.sku));
        expect(c.text('line-price', row)).toBe(usd(prices.get(l.sku)!));
        expect(row.textContent).toContain(usd(l.qty * prices.get(l.sku)!));
        total += l.qty * prices.get(l.sku)!;
      }
      expect(c.text('cart-total')).toBe(usd(total));
    },
  );

  signedInScenario(
    'H4',
    1,
    'order lines show the product name and the price they were sold at',
    async (c, fx) => {
      const { customerId, customerName, orderIds } = fx.twoInFlight;
      await c.selectAndSettle(customerId, customerName);
      await c.openOrder(orderIds[0]);
      await c.settle();
      const order = c.truth('order', orderIds[0]);
      const names = productNames(
        c,
        order.lines.map((l: { sku: string }) => l.sku),
      );
      const panel = c.one('order-panel')!;
      for (const l of order.lines as {
        sku: string;
        qty: number;
        unitPrice: number;
      }[]) {
        const row = panel.querySelector<HTMLElement>(
          `tr[data-sku="${l.sku}"]`,
        )!;
        expect(c.text('line-name', row)).toBe(names.get(l.sku));
        expect(row.textContent).toContain(usd(l.unitPrice));
      }
      expect(c.fieldsAre(panel, 'line-name', 'shown')).toBe(true);
    },
  );

  signedInScenario(
    'H5',
    1,
    'thread messages show the names of their authors',
    async (c, fx) => {
      const { customerId, customerName, ticketId } = fx.threaded;
      await c.selectAndSettle(customerId, customerName);
      await c.tab('tickets');
      await c.settle();
      await c.openTicket(ticketId);
      await c.settle();
      const ticket = c.truth('ticket', ticketId);
      const expected = (
        ticket.messages as { from: string; authorId: number }[]
      ).map((m) =>
        m.from === 'agent'
          ? c.truth<{ name: string }>('agent', m.authorId).name
          : c.truth('customer', m.authorId).name,
      );
      expect(expected.length).toBeGreaterThan(1);
      expect(c.texts('message-author')).toEqual(expected);
    },
  );

  signedInScenario(
    'H6',
    1,
    'notes show the names of their authors',
    async (c, fx) => {
      const { customerId, customerName } = fx.noted;
      await c.selectAndSettle(customerId, customerName);
      await c.tab('notes');
      await c.settle();
      const notes = c.truth<{ authorId: number; text: string }[]>(
        'notes',
        customerId,
      );
      const names = new Map(
        [...new Set(notes.map((n) => n.authorId))].map(
          (id): [number, string] => [
            id,
            c.truth<{ name: string }>('agent', id).name,
          ],
        ),
      );
      expect(c.texts('note-author')).toEqual(
        notes.map((n) => names.get(n.authorId)!),
      );
      const shown = c.all('note');
      expect(shown.length).toBe(notes.length);
      for (const [i, n] of notes.entries())
        expect(shown[i].textContent).toContain(n.text);
    },
  );

  signedInScenario(
    'H7',
    1,
    'activity shows a sentence per event, with product names',
    async (c, fx) => {
      const { customerId, customerName } = fx.twoInFlight;
      await c.selectAndSettle(customerId, customerName);
      const entries = c.truth<{ kind: string; refId: string }[]>(
        'peekActivity',
        customerId,
      );
      const names = productNames(
        c,
        entries.filter((e) => e.kind === 'product-viewed').map((e) => e.refId),
      );
      const shown = c.all('activity-entry', c.one('activity')!);
      expect(shown.length).toBe(entries.length);
      for (const [i, e] of entries.entries())
        expect(shown[i].textContent).toContain(activitySentence(e, names)!);
      expect(entries.some((e) => e.kind === 'product-viewed')).toBe(true);
    },
  );

  signedInScenario(
    'H8',
    1,
    'notification sentences name the customer',
    async (c) => {
      await c.click('bell');
      await c.settle();
      const list =
        c.truth<
          {
            id: number;
            kind: string;
            ticketId?: string;
            orderId?: string;
            customerId: number;
          }[]
        >('notifications');
      expect(list.length).toBeGreaterThan(0);
      const shown = [
        ...c
          .one('notifications-list')!
          .querySelectorAll('[data-notification-id]'),
      ];
      expect(shown.length).toBe(list.length);
      for (const [i, n] of list.entries()) {
        const sentence =
          n.kind === 'ticket-reply'
            ? `${n.ticketId}: new message from ${c.truth('customer', n.customerId).name}`
            : n.kind === 'ticket-escalated'
              ? `${n.ticketId} escalated to you`
              : `${n.orderId} delivered`;
        expect(shown[i].textContent).toContain(sentence);
      }
    },
  );

  signedInScenario(
    'H9',
    1,
    'editor hits show name, current price and stock',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.settle();
      await c.click('edit-items');
      const query = fx.editable.addName.slice(0, 3);
      await searchProducts(c, query);
      const hits = c.truth<Product[]>('searchProducts', query);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.length).toBeLessThanOrEqual(10);
      const skus = hits.map((h) => h.sku);
      const prices = new Map(
        c
          .truth<{ sku: string; price: number }[]>('prices', skus)
          .map((p) => [p.sku, p.price]),
      );
      const stock = new Map(
        skus.map((sku): [string, number] => [
          sku,
          c.truth<{ stock: number }>('stock', sku).stock,
        ]),
      );
      const search = c.one('catalog-search')!;
      for (const h of hits) {
        const row = search.querySelector<HTMLElement>(
          `li[data-sku="${h.sku}"]`,
        )!;
        expect(row.textContent).toContain(h.name);
        expect(c.text('hit-price', row)).toBe(usd(prices.get(h.sku)!));
        expect(c.text('hit-stock', row)).toBe(
          stock.get(h.sku) ? `${stock.get(h.sku)} in stock` : 'out of stock',
        );
        expect(c.isEnabled(`add-${h.sku}`)).toBe(!!stock.get(h.sku));
      }
    },
  );

  signedInScenario(
    'H10',
    1,
    "the ticket box shows the order's open ticket, none when there is none",
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.settle();
      const rows = c.truth<
        { ticketId: string; subject: string; status: string; updated: string }[]
      >('ticketsByOrder', fx.editable.orderId);
      const byRecent = [...rows].sort((a, b) =>
        b.updated.localeCompare(a.updated),
      );
      const expected =
        byRecent.find((t) => t.status !== 'Solved') ?? byRecent[0];
      expect(
        c
          .one('order-ticket')!
          .querySelector('[data-ticket-id]')!
          .getAttribute('data-ticket-id'),
      ).toBe(expected.ticketId);
      expect(c.text('order-ticket')).toContain(expected.subject);
      await c.click('close-panel');
      const bare = orderWithoutTicket(c);
      await c.selectAndSettle(bare.customerId, bare.customerName);
      await c.openOrder(bare.orderId);
      await c.settle();
      expect(c.state('order-panel')).toBe('ready');
      expect(c.has('order-ticket')).toBe(false);
    },
  );

  signedInScenario(
    'H11',
    1,
    'a block that is not loading leaves no name, price or counter of the previous customer',
    async (c) => {
      const a = withCart(c, 0);
      const b = withCart(c, 1);
      await c.selectAndSettle(a.customerId, a.customerName);
      await c.tab('cart');
      await c.settle();
      await c.selectCustomer(b.customerId, b.customerName);
      await c.idle(200);
      // old data may stay under a block's spinner; outside a loading block nothing of the previous customer shows
      expect(c.settledContentOf('console-main')).not.toContain(a.customerName);
      await c.settle();
      const rows = [
        ...c.one('tab-cart')!.querySelectorAll<HTMLElement>('tr[data-sku]'),
      ];
      expect(rows.map((r) => r.dataset['sku']).sort()).toEqual(
        [...b.skus].sort(),
      );
      expect(c.text('kpi-spend')).toBe(
        usd0(c.truth('orderStats', b.customerId).lifetimeSpend),
      );
      expect(c.contentOf('console-main')).not.toContain(a.customerName);
    },
  );

  signedInScenario(
    'H12',
    1,
    'a cart with more than 20 skus shows every name and price',
    async (c, fx) => {
      const { customerId, customerName, lines } = fx.bigCart;
      await c.selectAndSettle(customerId, customerName);
      await c.tab('cart');
      await c.settle();
      const tab = c.one('tab-cart')!;
      expect(tab.querySelectorAll('tr[data-sku]').length).toBe(lines);
      expect(new Set(c.fieldStates(tab, 'line-name'))).toEqual(
        new Set(['shown']),
      );
      expect(new Set(c.fieldStates(tab, 'line-price'))).toEqual(
        new Set(['shown']),
      );
      expect(c.stats('product').errors).toBe(0);
      expect(c.stats('prices').errors).toBe(0);
      const first = c.truth<{ sku: string }[]>('cart', customerId)[0].sku;
      const name = c.truth<Product>('product', first).name;
      expect(
        c.text('line-name', tab.querySelector(`tr[data-sku="${first}"]`)!),
      ).toBe(name);
    },
  );
});

// re-exported so unused-import linting stays quiet when scenarios are added
void scenario;
