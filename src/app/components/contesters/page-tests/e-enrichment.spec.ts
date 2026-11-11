import type { ConsolePage, Fixtures } from './console-page.harness';
import {
  expectErrorView,
  scenario,
  signedInScenario,
  withCart,
} from './scenario';

// Ported from e2e/specs/e-f-errors.spec.ts: the failures of enrichment sources
// (E10–E20), the rest of E at stages 1 and 2, and recovery (F). A field that
// failed shows an error view naming its API call; nothing below the level of a
// section has a Retry of its own.

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

const failInCart = async (c: ConsolePage, key: 'product' | 'prices') => {
  const { customerId, customerName } = withCart(c);
  c.setThrow(key, true);
  await c.selectAndSettle(customerId, customerName);
  await c.tab('cart');
  await c.settle();
  c.setThrow(key, false);
};

const failActivityPoll = async (c: ConsolePage, fx: Fixtures) => {
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.idle(20_000);
  await c.fail('activity');
  await c.idle(100);
};

const rows = (c: ConsolePage) =>
  c.all('customers')[0].querySelectorAll('[data-customer-id]').length;

const bumpQty = async (c: ConsolePage) =>
  await c.click(
    c
      .one('order-panel')!
      .querySelector<HTMLElement>('[data-testid^="qty-inc-"]')!,
  );

// ---------- the rest of E at stages 1 and 2 ----------

describe('E · errors (rest)', () => {
  signedInScenario(
    'E6',
    2,
    'a failed product search leaves the editor usable',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.settle();
      await c.click('edit-items');
      await c.fill('catalog-search', fx.editable.addName.slice(0, 8));
      await c.idle(450);
      await c.fail('searchProducts');
      await c.settle();
      expect(c.state('order-panel')).toBe('ready');
      expect(c.all('hit-price').length).toBe(0);
      const before = c.text('order-panel-total');
      await bumpQty(c);
      expect(c.text('order-panel-total')).not.toBe(before);
      expect(c.isEnabled('save')).toBe(true);
    },
  );

  signedInScenario(
    'E7',
    2,
    'a failed poll keeps the entries',
    async (c, fx) => {
      await failActivityPoll(c, fx);
      expect(c.state('activity')).toBe('ready');
      expect(
        c.shown('activity-entry', c.one('activity')!).length,
      ).toBeGreaterThan(0);
    },
  );

  scenario('E8', 2, 'failed notifications break nothing else', async (c) => {
    await c.login();
    await c.fail('notifications');
    await c.settle();
    expect(c.state('customers')).toBe('ready');
    expect(c.state('agent')).toBe('ready');
    expect(c.has('logout')).toBe(true);
    expect(c.state('notifications')).toBe('error');
    expectErrorView(c, 'notifications');
  });

  signedInScenario(
    'E9',
    2,
    'a failed list leaves the selected customer working',
    async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.click('filter-vip');
      await c.idle();
      await c.fail('customers');
      await c.settle();
      expect(c.state('customers')).toBe('error');
      expect(c.state('customer-header')).toBe('ready');
      expect(c.state('tab-orders')).toBe('ready');
    },
  );
});

// ---------- the failures of enrichment sources (E10–E20) ----------

type Enrichment = {
  id: string;
  title: string;
  /** Signs in as part of the failure (the sources of the sign-in screens). */
  fromSignedOut?: boolean;
  /** Section that keeps working. */
  section: string;
  setup: (c: ConsolePage, fx: Fixtures) => Promise<void> | void;
  /** What shows in place of the failed field (its error view, naming its API call), and what keeps working. */
  inPlace: (
    c: ConsolePage,
    fx: Fixtures,
    check?: unknown,
  ) => Promise<void> | void;
};

const openHits = async (
  c: ConsolePage,
  fx: Fixtures,
  failKey: 'prices' | 'stock',
) => {
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.click('edit-items');
  await c.fill('catalog-search', fx.editable.addName.slice(0, 10));
  await c.idle(450);
  await c.release('searchProducts');
  await c.failAll(failKey);
  await c.settle();
};

const signInToList = async (
  c: ConsolePage,
  failKey: 'tiers' | 'ticketCounts',
) => {
  await c.login();
  await c.releaseFor('customers', () => true);
  await c.failAll(failKey);
  await c.settle();
};

const are = (c: ConsolePage, region: string, testId: string, state: 'shown') =>
  c.fieldsAre(c.one(region)!, testId, state);

/** The editor's hit row of the sku to add. */
const hitRow = (c: ConsolePage, fx: Fixtures) =>
  c
    .one('catalog-search')!
    .querySelector<HTMLElement>(`[data-sku="${fx.editable.addSku}"]`)!;

/** Answers the reload of a hit's price and stock, whichever the Reload asked again. */
const answerHitReload = async (c: ConsolePage) => {
  for (const key of ['prices', 'stock'] as const)
    if (c.pending(key).length) await c.release(key);
  await c.settle();
};

const ENRICHMENTS: Enrichment[] = [
  {
    id: 'E10',
    title: 'failed tiers',
    fromSignedOut: true,
    section: 'customers',
    setup: async (c) => await signInToList(c, 'tiers'),
    inPlace: async (c, _fx) => {
      expectErrorView(c, 'customers');
      expect(are(c, 'customers', 'row-open-tickets', 'shown')).toBe(true);
      expect(rows(c)).toBe(8);
      expect(c.isEnabled('page-next')).toBe(true);
    },
  },
  {
    id: 'E11',
    title: 'failed ticketCounts in the list',
    fromSignedOut: true,
    section: 'customers',
    setup: async (c) => await signInToList(c, 'ticketCounts'),
    inPlace: async (c, _fx) => {
      expectErrorView(c, 'customers');
      expect(are(c, 'customers', 'row-tier', 'shown')).toBe(true);
      expect(rows(c)).toBe(8);
    },
  },
  {
    id: 'E12',
    title: 'failed orderStats',
    section: 'customer-header',
    setup: async (c, fx) => await failForCustomer(c, fx, 'orderStats'),
    inPlace: async (c, fx) => {
      expect(c.text('customer-name')).toBe(fx.twoInFlight.customerName);
      expectErrorView(c, 'customer-header');
      expect(are(c, 'customer-header', 'kpi-open-tickets', 'shown')).toBe(true);
      // the Orders badge shows an error with a Reload button; Reload asks orderStats again and the badge recovers
      expect(
        c.one('tab-orders-count')!.querySelector('app-generic-error'),
      ).not.toBeNull();
      await c.retryIn(c.one('tab-orders-count')!);
      if (c.pending('orderStats').length) await c.release('orderStats');
      await c.settle();
      expect(c.fieldState('tab-orders-count')).toBe('shown');
      for (const s of ['tab-orders', 'shipments', 'activity'])
        expect(c.state(s)).toBe('ready');
    },
  },
  {
    id: 'E13',
    title: 'failed prices in the cart',
    section: 'tab-cart',
    setup: async (c) => await failInCart(c, 'prices'),
    inPlace: async (c, _fx) => {
      expectErrorView(c, 'tab-cart');
      expect(are(c, 'tab-cart', 'line-name', 'shown')).toBe(true);
    },
  },
  {
    id: 'E14',
    title: 'failed products in an order',
    section: 'order-panel',
    setup: async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.release('order');
      await c.failAll('product');
      await c.settle();
    },
    inPlace: async (c, _fx) => {
      expectErrorView(c, 'order-panel');
      expect(c.text('order-panel-total')).toContain('$');
      expect(c.shown('edit-items').length).toBe(1);
    },
  },
  {
    id: 'E15',
    title: 'failed agents in a thread',
    section: 'ticket-panel',
    setup: async (c, fx) => {
      await c.selectAndSettle(fx.threaded.customerId, fx.threaded.customerName);
      await c.tab('tickets');
      await c.settle();
      await c.openTicket(fx.threaded.ticketId);
      await c.release('ticket');
      await c.failAll('agent');
      await c.settle();
    },
    inPlace: async (c, _fx) => {
      expectErrorView(c, 'ticket-panel');
      expect(c.shown('ticket-message').length).toBeGreaterThan(0);
      expect(c.shown('reply-text').length).toBe(1);
    },
  },
  {
    id: 'E16',
    title: 'failed agents in the notes',
    section: 'tab-notes',
    setup: async (c, fx) => {
      await c.selectAndSettle(fx.noted.customerId, fx.noted.customerName);
      await c.tab('notes');
      await c.release('notes');
      await c.failAll('agent');
      await c.settle();
    },
    inPlace: async (c, _fx) => {
      expectErrorView(c, 'tab-notes');
      expect(c.shown('note').length).toBeGreaterThan(0);
      expect(c.shown('note-text').length).toBe(1);
    },
  },
  {
    id: 'E17',
    title: 'failed prices of the hits',
    section: 'order-panel',
    setup: async (c, fx) => await openHits(c, fx, 'prices'),
    inPlace: async (c, fx) => {
      // the hit keeps its row; its price shows an error with a Reload button
      expectErrorView(c, 'order-panel');
      const hit = hitRow(c, fx);
      expect(hit.textContent).toContain(fx.editable.addName);
      await c.retryIn(hit);
      await answerHitReload(c);
      expect(c.fieldsAre(hitRow(c, fx), 'hit-price', 'shown')).toBe(true);
      expect(c.isEnabled(`add-${fx.editable.addSku}`)).toBe(true);
    },
  },
  {
    id: 'E18',
    title: 'failed stock of the hits',
    section: 'order-panel',
    setup: async (c, fx) => await openHits(c, fx, 'stock'),
    inPlace: async (c, fx) => {
      expectErrorView(c, 'order-panel');
      const hit = hitRow(c, fx);
      expect(hit.textContent).toContain(fx.editable.addName);
      await c.retryIn(hit);
      await answerHitReload(c);
      expect(c.fieldsAre(hitRow(c, fx), 'hit-stock', 'shown')).toBe(true);
      expect(c.isEnabled(`add-${fx.editable.addSku}`)).toBe(true);
    },
  },
  {
    id: 'E19',
    title: 'failed products of the viewed names in the activity',
    section: 'activity',
    setup: async (c, fx) => {
      const { customerId, customerName } = fx.twoInFlight;
      await c.selectCustomer(customerId, customerName);
      await c.releaseFor('activity', (arg) => arg === customerId);
      await c.failAll('product');
      await c.settle();
    },
    inPlace: async (c, _fx) => {
      expectErrorView(c, 'activity');
      expect(c.fieldStates(c.one('activity')!, 'activity-text')).toContain(
        'shown',
      );
    },
  },
  {
    id: 'E20',
    title: 'failed customer look-up of a sentence',
    fromSignedOut: true,
    section: 'notifications',
    setup: async (c) => {
      await c.login();
      await c.release('notifications');
      await c.click('bell');
      await c.failAll('customer');
      await c.settle();
    },
    inPlace: async (c, _fx) => {
      expectErrorView(c, 'notifications');
      expect(
        c.one('notifications-list')!.querySelectorAll('[data-notification-id]')
          .length,
      ).toBeGreaterThan(0);
      await c.click('bell');
      expect(c.has('notifications-list')).toBe(false);
    },
  },
];

/** Brings the page to the failure of an enrichment (E10, E11 and E20 fail while signing in). */
const begin = async (c: ConsolePage, e: Enrichment): Promise<Fixtures> => {
  if (e.fromSignedOut) {
    await e.setup(c, undefined as never);
    return c.fixtures();
  }
  await c.loginAndSettle();
  const fx = c.fixtures();
  await e.setup(c, fx);
  return fx;
};

describe('E · enrichment failures (stage 2)', () => {
  for (const e of ENRICHMENTS) {
    scenario(e.id, 2, `${e.title} degrades in place`, async (c) => {
      const fx = await begin(c, e);
      // the section itself works; only the failed field shows its error view
      expect(c.state(e.section)).toBe('ready');
      await e.inPlace(c, fx);
    });
  }
});

// ---------- recovery ----------

describe('F · recovery (stage 2)', () => {
  signedInScenario(
    'F1',
    2,
    'Retry in the header refetches only the header',
    async (c, fx) => {
      await failForCustomer(c, fx, 'customer');
      c.resetStats();
      await c.retry('customer-header');
      await c.settle();
      expect(c.state('customer-header')).toBe('ready');
      expect(
        c.totals(
          'customer',
          'orders',
          'activity',
          'shipment',
          'orderStats',
          'ticketCounts',
        ),
      ).toEqual({
        customer: 1,
        orders: 0,
        activity: 0,
        shipment: 0,
        orderStats: 0,
        ticketCounts: 0,
      });
    },
  );

  signedInScenario(
    'F6',
    2,
    'the next poll clears a poll error',
    async (c, fx) => {
      await failActivityPoll(c, fx);
      await c.idle(20_000);
      await c.release('activity');
      expect(c.state('activity')).toBe('ready');
    },
  );
});
