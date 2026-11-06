import type { ConsoleApiKey } from '../../../services/contesters/backend/api-keys';
import type { ConsolePage, Fixtures } from './console-page.harness';
import { scenario, signedInScenario, withCart } from './scenario';

// Ported from e2e/specs/e-f-errors.spec.ts: the failures of enrichment sources
// (E10–E20), the rest of E at stages 1 and 2, and recovery (F).

const failForCustomer = (c: ConsolePage, fx: Fixtures, key: 'customer' | 'orders' | 'activity' | 'orderStats') => {
  const { customerId, customerName } = fx.twoInFlight;
  c.selectCustomer(customerId, customerName);
  c.failFor(key, (arg) => arg === customerId);
  c.settle();
};

const failOneShipment = (c: ConsolePage, fx: Fixtures) => {
  const { customerId, customerName, orderIds } = fx.twoInFlight;
  c.selectCustomer(customerId, customerName);
  for (const key of ['customer', 'orders', 'activity'] as const) c.releaseFor(key, (arg) => arg === customerId);
  c.failFor('shipment', (arg) => arg === orderIds[0]);
  c.settle();
};

const failInCart = (c: ConsolePage, key: 'products' | 'prices') => {
  const { customerId, customerName } = withCart(c);
  c.setThrow(key, true);
  c.selectAndSettle(customerId, customerName);
  c.tab('cart');
  c.settle();
  c.setThrow(key, false);
};

const failLinkedTicket = (c: ConsolePage, fx: Fixtures) => {
  c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  c.openOrder(fx.editable.orderId);
  c.release('order');
  c.fail('ticketsByOrder');
  c.settle();
};

const failActivityPoll = (c: ConsolePage, fx: Fixtures) => {
  c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  c.idle(20_000);
  c.fail('activity');
  c.idle(100);
};

const rows = (c: ConsolePage) => c.all('customers')[0].querySelectorAll('[data-customer-id]').length;

const bumpQty = (c: ConsolePage) => c.click(c.one('order-panel')!.querySelector<HTMLElement>('[data-testid^="qty-inc-"]')!);

// ---------- the rest of E at stages 1 and 2 ----------

describe('E · errors (rest)', () => {
    signedInScenario('E6', 2, 'a failed product search leaves the editor usable', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.openOrder(fx.editable.orderId);
    c.settle();
    c.click('edit-items');
    c.fill('catalog-search', fx.editable.addName.slice(0, 8));
    c.idle(450);
    c.fail('searchProducts');
    c.settle();
    expect(c.partState('catalog-search')).toBe('error');
    const before = c.text('order-panel-total');
    bumpQty(c);
    expect(c.text('order-panel-total')).not.toBe(before);
    expect(c.isEnabled('save')).toBe(true);
  });

  signedInScenario('E7', 2, 'a failed poll keeps the entries', (c, fx) => {
    failActivityPoll(c, fx);
    expect(c.state('activity')).toBe('ready');
    expect(c.shown('activity-entry', c.one('activity')!).length).toBeGreaterThan(0);
  });

  scenario('E8', 2, 'failed notifications break nothing else', (c) => {
    c.login();
    c.fail('notifications');
    c.settle();
    expect(c.state('customers')).toBe('ready');
    expect(c.state('agent')).toBe('ready');
    expect(c.has('bell-error')).toBe(true);
    c.click('bell');
    expect(c.partState('notifications-part')).toBe('error');
  });

  signedInScenario('E9', 2, 'a failed list leaves the selected customer working', (c, fx) => {
    c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
    c.click('filter-vip');
    c.idle();
    c.fail('customers');
    c.settle();
    expect(c.state('customers')).toBe('error');
    expect(c.state('customer-header')).toBe('ready');
    expect(c.state('tab-orders')).toBe('ready');
  });
});

// ---------- the failures of enrichment sources (E10–E20) ----------

type Enrichment = {
  id: string;
  title: string;
  /** Signs in as part of the failure (the sources of the sign-in screens). */
  fromSignedOut?: boolean;
  /** Section whose state view names the failed source (R-G6). */
  section: string;
  failed: string;
  setup: (c: ConsolePage, fx: Fixtures) => void;
  region: (c: ConsolePage) => HTMLElement;
  /** Stage 2: what shows in place of the failed part, and what keeps working. */
  inPlace: (c: ConsolePage, fx: Fixtures) => void;
};

const openHits = (c: ConsolePage, fx: Fixtures, failKey: 'prices' | 'stock') => {
  c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  c.openOrder(fx.editable.orderId);
  c.settle();
  c.click('edit-items');
  c.fill('catalog-search', fx.editable.addName.slice(0, 10));
  c.idle(450);
  c.release('searchProducts');
  c.failAll(failKey);
  c.settle();
};

const signInToList = (c: ConsolePage, failKey: 'tiers' | 'ticketCounts') => {
  c.login();
  c.releaseFor('customers', () => true);
  c.failAll(failKey);
  c.settle();
};

const all = (c: ConsolePage, region: string, testId: string, ...states: ('loading' | 'ready' | 'error')[]) => c.partsAre(c.one(region)!, testId, ...states);

const ENRICHMENTS: Enrichment[] = [
  {
    id: 'E10', title: 'failed tiers', fromSignedOut: true, section: 'customers', failed: 'tiers',
    setup: (c) => signInToList(c, 'tiers'),
    region: (c) => c.one('customers')!,
    inPlace: (c) => {
      expect(all(c, 'customers', 'row-tier', 'error')).toBe(true);
      expect(all(c, 'customers', 'row-open-tickets', 'ready')).toBe(true);
      expect(rows(c)).toBe(8);
      expect(c.isEnabled('page-next')).toBe(true);
    },
  },
  {
    id: 'E11', title: 'failed ticketCounts in the list', fromSignedOut: true, section: 'customers', failed: 'ticketCounts',
    setup: (c) => signInToList(c, 'ticketCounts'),
    region: (c) => c.one('customers')!,
    inPlace: (c) => {
      expect(all(c, 'customers', 'row-open-tickets', 'error')).toBe(true);
      expect(all(c, 'customers', 'row-tier', 'ready')).toBe(true);
      expect(rows(c)).toBe(8);
    },
  },
  {
    id: 'E12', title: 'failed orderStats', section: 'customer-header', failed: 'orderStats',
    setup: (c, fx) => failForCustomer(c, fx, 'orderStats'),
    region: (c) => c.one('customer-header')!,
    inPlace: (c, fx) => {
      expect(c.text('customer-name')).toBe(fx.twoInFlight.customerName);
      for (const id of ['kpi-spend', 'kpi-orders', 'kpi-avg']) expect(all(c, 'customer-header', id, 'error')).toBe(true);
      expect(all(c, 'customer-header', 'kpi-open-tickets', 'ready')).toBe(true);
      expect(c.partOf('tab-orders-toggle')).toBe('error');
      for (const s of ['tab-orders', 'shipments', 'activity']) expect(c.state(s)).toBe('ready');
    },
  },
  {
    id: 'E13', title: 'failed prices in the cart', section: 'tab-cart', failed: 'prices',
    setup: (c) => failInCart(c, 'prices'),
    region: (c) => c.one('tab-cart')!,
    inPlace: (c) => {
      expect(all(c, 'tab-cart', 'line-price', 'error')).toBe(true);
      expect(all(c, 'tab-cart', 'line-name', 'ready')).toBe(true);
      expect(all(c, 'tab-cart', 'cart-total', 'error')).toBe(true);
    },
  },
  {
    id: 'E14', title: 'failed products in an order', section: 'order-panel', failed: 'products',
    setup: (c, fx) => {
      c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      c.openOrder(fx.editable.orderId);
      c.release('order');
      c.failAll('products');
      c.settle();
    },
    region: (c) => c.one('order-panel')!,
    inPlace: (c) => {
      expect(all(c, 'order-panel', 'line-name', 'error')).toBe(true);
      expect(c.text('order-panel-total')).toContain('$');
      expect(c.shown('edit-items').length).toBe(1);
    },
  },
  {
    id: 'E15', title: 'failed agents in a thread', section: 'ticket-panel', failed: 'agents',
    setup: (c, fx) => {
      c.selectAndSettle(fx.threaded.customerId, fx.threaded.customerName);
      c.tab('tickets');
      c.settle();
      c.openTicket(fx.threaded.ticketId);
      c.release('ticket');
      c.failAll('agents');
      c.settle();
    },
    region: (c) => c.one('ticket-panel')!,
    inPlace: (c) => {
      const states = c.partStates(c.one('ticket-panel')!, 'message-author');
      expect(states).toContain('error');
      expect(states).toContain('ready');
      expect(c.shown('ticket-message').length).toBeGreaterThan(0);
      expect(c.shown('reply-text').length).toBe(1);
    },
  },
  {
    id: 'E16', title: 'failed agents in the notes', section: 'tab-notes', failed: 'agents',
    setup: (c, fx) => {
      c.selectAndSettle(fx.noted.customerId, fx.noted.customerName);
      c.tab('notes');
      c.release('notes');
      c.failAll('agents');
      c.settle();
    },
    region: (c) => c.one('tab-notes')!,
    inPlace: (c) => {
      expect(all(c, 'tab-notes', 'note-author', 'error')).toBe(true);
      expect(c.shown('note').length).toBeGreaterThan(0);
      expect(c.shown('note-text').length).toBe(1);
    },
  },
  {
    id: 'E17', title: 'failed prices of the hits', section: 'order-panel', failed: 'prices',
    setup: (c, fx) => openHits(c, fx, 'prices'),
    region: (c) => c.one('catalog-search')!,
    inPlace: (c, fx) => {
      expect(all(c, 'catalog-search', 'hit-price', 'error')).toBe(true);
      expect(all(c, 'catalog-search', 'hit-stock', 'ready')).toBe(true);
      expect(c.one('catalog-search')!.querySelector(`[data-sku="${fx.editable.addSku}"]`)!.textContent).toContain(fx.editable.addName);
      expect((c.one(`add-${fx.editable.addSku}`) as HTMLButtonElement).disabled).toBe(true);
    },
  },
  {
    id: 'E18', title: 'failed stock of the hits', section: 'order-panel', failed: 'stock',
    setup: (c, fx) => openHits(c, fx, 'stock'),
    region: (c) => c.one('catalog-search')!,
    inPlace: (c, fx) => {
      expect(all(c, 'catalog-search', 'hit-stock', 'error')).toBe(true);
      expect(all(c, 'catalog-search', 'hit-price', 'ready')).toBe(true);
      expect(c.one('catalog-search')!.querySelector(`[data-sku="${fx.editable.addSku}"]`)!.textContent).toContain(fx.editable.addName);
      expect((c.one(`add-${fx.editable.addSku}`) as HTMLButtonElement).disabled).toBe(true);
    },
  },
  {
    id: 'E19', title: 'failed products of the viewed names in the activity', section: 'activity', failed: 'products',
    setup: (c, fx) => {
      const { customerId, customerName } = fx.twoInFlight;
      c.selectCustomer(customerId, customerName);
      c.releaseFor('activity', (arg) => arg === customerId);
      c.failAll('products');
      c.settle();
    },
    region: (c) => c.one('activity')!,
    inPlace: (c) => {
      const states = c.partStates(c.one('activity')!);
      expect(states).toContain('error');
      expect(states).toContain('ready');
    },
  },
  {
    id: 'E20', title: 'failed customer look-up of a sentence', fromSignedOut: true, section: 'notifications', failed: 'customer',
    setup: (c) => {
      c.login();
      c.release('notifications');
      c.click('bell');
      c.failAll('customer');
      c.settle();
    },
    region: (c) => c.one('notifications')!,
    inPlace: (c) => {
      expect(c.partStates(c.one('notifications-list')!)).toContain('error');
      expect(c.shown('notification-item').length + c.one('notifications-list')!.querySelectorAll('[data-notification-id]').length).toBeGreaterThan(0);
      c.click('bell');
      expect(c.has('notifications-list')).toBe(false);
    },
  },
];

/** Brings the page to the failure of an enrichment (E10, E11 and E20 fail while signing in). */
const begin = (c: ConsolePage, e: Enrichment): Fixtures => {
  if (e.fromSignedOut) {
    e.setup(c, undefined as never);
    return c.fixtures();
  }
  c.loginAndSettle();
  const fx = c.fixtures();
  e.setup(c, fx);
  return fx;
};

/** The section shows the failed source's name and Retry next to its content. */
const expectFlagged = (c: ConsolePage, e: Enrichment) => {
  // the section itself works; only its fields fail (checked in `inPlace`)
  expect(c.state(e.section)).toBe('ready');
};

describe('E · enrichment failures (stage 2)', () => {
  for (const e of ENRICHMENTS) {
    scenario(e.id, 2, `${e.title} degrades in place`, (c) => {
      const fx = begin(c, e);
      expectFlagged(c, e);
      e.inPlace(c, fx);
    });
  }
});

// ---------- recovery ----------

describe('F · recovery (stage 2)', () => {
  signedInScenario('F1', 2, 'Retry in the header refetches only the header', (c, fx) => {
    failForCustomer(c, fx, 'customer');
    c.resetStats();
    c.retryIn('customer-profile');
    c.settle();
    expect(c.state('customer-header')).toBe('ready');
    expect(c.totals('customer', 'orders', 'activity', 'shipment', 'orderStats', 'ticketCounts')).toEqual({
      customer: 1, orders: 0, activity: 0, shipment: 0, orderStats: 0, ticketCounts: 0,
    });
  });

  signedInScenario('F2', 2, 'Retry on a row refetches only its tracking', (c, fx) => {
    const [o1] = fx.twoInFlight.orderIds;
    failOneShipment(c, fx);
    c.resetStats();
    c.retryIn(`shipment-${o1}`);
    c.settle();
    expect(c.partState(`shipment-${o1}`)).toBe('ready');
    expect(c.totals('shipment', 'orders')).toEqual({ shipment: 1, orders: 0 });
  });

  signedInScenario('F3', 2, 'Retry in the cart refetches only the failed names', (c) => {
    failInCart(c, 'products');
    c.resetStats();
    c.retryIn('tab-cart');
    c.settle();
    expect(['ready', 'empty']).toContain(c.state('tab-cart'));
    expect(c.partsAre(c.one('tab-cart')!, 'line-name', 'ready')).toBe(true);
    // the failed names are asked again (in one batch or several), nothing else
    expect(c.total('products')).toBeGreaterThan(0);
    expect(c.totals('prices', 'cart')).toEqual({ prices: 0, cart: 0 });
  });

  signedInScenario('F4', 2, 'Retry in the ticket box refetches only the linked ticket', (c, fx) => {
    failLinkedTicket(c, fx);
    c.resetStats();
    c.retryIn('order-ticket');
    c.settle();
    expect(c.partState('order-ticket')).toBe('ready');
    expect(c.totals('ticketsByOrder', 'order')).toEqual({ ticketsByOrder: 1, order: 0 });
  });

  signedInScenario('F6', 2, 'the next poll clears a poll error', (c, fx) => {
    failActivityPoll(c, fx);
    c.idle(20_000);
    c.release('activity');
    expect(c.state('activity')).toBe('ready');
  });

  const retryScenario = (
    id: string,
    after: string,
    title: string,
    asked: ConsoleApiKey[],
    notAsked: ConsoleApiKey[],
    retry: (c: ConsolePage) => void,
    done: (c: ConsolePage) => void,
  ) => {
    const e = ENRICHMENTS.find((x) => x.id === after)!;
    scenario(id, 2, title, (c) => {
      begin(c, e);
      c.resetStats();
      retry(c);
      c.settle();
      done(c);
      // the failed ids are asked again (in one batch or several), nothing else
      for (const key of asked) expect(c.total(key), key).toBeGreaterThan(0);
      expect(c.totals(...notAsked)).toEqual(Object.fromEntries(notAsked.map((k) => [k, 0])));
    });
  };

  retryScenario('F7', 'E10', 'Retry in the list refetches only the failed tiers', ['tiers'], ['customers', 'ticketCounts'], (c) => c.retryIn('customers'),
    (c) => expect(all(c, 'customers', 'row-tier', 'ready')).toBe(true));
  retryScenario('F8', 'E11', 'Retry in the list refetches only the failed counters', ['ticketCounts'], ['customers', 'tiers'], (c) => c.retryIn('customers'),
    (c) => expect(all(c, 'customers', 'row-open-tickets', 'ready')).toBe(true));
  retryScenario('F9', 'E12', 'Retry in the header refetches only the failed KPIs', ['orderStats'], ['customer', 'ticketCounts'], (c) => c.retryIn('customer-header'),
    (c) => expect(all(c, 'customer-header', 'kpi-spend', 'ready')).toBe(true));
  retryScenario('F10', 'E15', 'Retry in the thread refetches only the failed authors', ['agents'], ['ticket'], (c) => c.retryIn('ticket-panel'),
    (c) => expect(all(c, 'ticket-panel', 'message-author', 'ready')).toBe(true));
  retryScenario('F11', 'E17', 'Retry in the hits refetches only the failed prices', ['prices'], ['searchProducts', 'stock'], (c) => c.retryIn('catalog-search'),
    (c) => expect(all(c, 'catalog-search', 'hit-price', 'ready')).toBe(true));
});
