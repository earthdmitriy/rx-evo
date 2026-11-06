import { ApiKey, Console, expect, Fixtures, scenario } from '../support/console';
import { otherCustomer, signedIn, withCart } from '../support/flows';

/** Selects the two-in-flight customer and answers its requests, failing `key` for that customer. */
const failForCustomer = async (c: Console, fx: Fixtures, key: 'customer' | 'orders' | 'activity' | 'orderStats') => {
  const { customerId, customerName } = fx.twoInFlight;
  await c.selectCustomer(customerId, customerName);
  await c.failFor(key, (arg) => arg === customerId);
  await c.settle();
};

/** E3: two in-flight orders, the first one's tracking fails. */
const failOneShipment = async (c: Console, fx: Fixtures) => {
  const { customerId, customerName, orderIds } = fx.twoInFlight;
  await c.selectCustomer(customerId, customerName);
  // answer the customer's own requests first: stage 1 does not require shipments to start before the rest
  for (const key of ['customer', 'orders', 'activity'] as const) await c.releaseFor(key, (arg) => arg === customerId);
  await c.failFor('shipment', (arg) => arg === orderIds[0]);
  await c.settle();
};

/** E4, E13: the Cart tab of a customer with a cart;  fails whenever it is asked (the page may ask early or late). */
const failInCart = async (c: Console, key: 'products' | 'prices') => {
  const { customerId, customerName } = await withCart(c);
  await c.setThrow(key, true);
  await c.selectAndSettle(customerId, customerName);
  await c.tab('cart');
  await c.settle();
  await c.setThrow(key, false);
};

/** E5: the order panel with a failing linked ticket. */
const failLinkedTicket = async (c: Console, fx: Fixtures) => {
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.release('order');
  await c.fail('ticketsByOrder');
  await c.settle();
};

/** E7: activity loaded once, the next poll fails. */
const failActivityPoll = async (c: Console, fx: Fixtures) => {
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.page.clock.runFor(20_000);
  await c.fail('activity');
  await c.idle(100);
};

const errorShown = async (c: Console, testId: string) => expect(await c.hasError(c.testId(testId))).toBe(true);

// ---------- stage 1: an error is shown, nothing loads forever ----------

scenario('F5', 2, 'another customer recovers without Retry', async ({ c }) => {
  const fx = await signedIn(c);
  await failForCustomer(c, fx, 'customer');
  const other = otherCustomer(fx, fx.twoInFlight.customerId);
  await c.selectAndSettle(other.id, other.name);
  await c.expectState('customer-header', 'ready');
  await expect(c.testId('customer-name')).toHaveText(other.name);
});

async function expectErrorNotLoading(c: Console, region: ReturnType<Console['testId']>) {
  await expect.poll(() => c.hasError(region), { message: 'an error is shown' }).toBe(true);
  await c.expectNoLoading(region);
}

// ---------- the failures of enrichment sources (E10–E20) ----------

/**
 * One failed enrichment source: `setup` brings the page to the failure, `region` is where it shows.
 * Stage 1 asks for an error and no loading left; stage 2 for the degradation in place of R-G6.
 */
type Enrichment = {
  id: string;
  title: string;
  /** Section whose state view names the failed source (R-G6). */
  section: string;
  failed: string;
  setup: (c: Console, fx: Fixtures) => Promise<void>;
  region: (c: Console) => ReturnType<Console['testId']>;
  /** Stage 2: what shows in place of the failed part, and what keeps working. */
  inPlace: (c: Console, fx: Fixtures) => Promise<void>;
};

const openHits = async (c: Console, fx: Fixtures, failKey: 'prices' | 'stock') => {
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.testId('edit-items').click();
  await c.testId('catalog-search').locator('input').fill(fx.editable.addName.slice(0, 10));
  await c.idle(450);
  await c.release('searchProducts');
  await c.failAll(failKey);
  await c.settle();
};

const signInToList = async (c: Console, failKey: 'tiers' | 'ticketCounts') => {
  await c.open();
  await c.login();
  await c.releaseFor('customers', () => true);
  await c.failAll(failKey);
  await c.settle();
};

const ENRICHMENTS: Enrichment[] = [
  {
    id: 'E10',
    title: 'failed tiers',
    section: 'customers',
    failed: 'tiers',
    setup: (c) => signInToList(c, 'tiers'),
    region: (c) => c.testId('customers'),
    inPlace: async (c) => {
      await c.expectParts(c.testId('customers'), 'row-tier', 'error');
      await c.expectParts(c.testId('customers'), 'row-open-tickets', 'ready');
      await expect(c.page.locator('[data-testid^="customer-"][data-customer-id]')).toHaveCount(8);
      await expect(c.testId('page-next')).toBeEnabled();
    },
  },
  {
    id: 'E11',
    title: 'failed ticketCounts in the list',
    section: 'customers',
    failed: 'ticketCounts',
    setup: (c) => signInToList(c, 'ticketCounts'),
    region: (c) => c.testId('customers'),
    inPlace: async (c) => {
      await c.expectParts(c.testId('customers'), 'row-open-tickets', 'error');
      await c.expectParts(c.testId('customers'), 'row-tier', 'ready');
      await expect(c.page.locator('[data-testid^="customer-"][data-customer-id]')).toHaveCount(8);
    },
  },
  {
    id: 'E12',
    title: 'failed orderStats',
    section: 'customer-header',
    failed: 'orderStats',
    setup: (c, fx) => failForCustomer(c, fx, 'orderStats'),
    region: (c) => c.testId('customer-header'),
    inPlace: async (c, fx) => {
      const header = c.testId('customer-header');
      await expect(c.testId('customer-name')).toHaveText(fx.twoInFlight.customerName);
      for (const id of ['kpi-spend', 'kpi-orders', 'kpi-avg']) await c.expectParts(header, id, 'error');
      await c.expectParts(header, 'kpi-open-tickets', 'ready');
      expect(await c.partOf(c.testId('tab-orders-toggle'))).toBe('error');
      await c.expectState('tab-orders', 'ready');
      await c.expectState('shipments', 'ready');
      await c.expectState('activity', 'ready');
    },
  },
  {
    id: 'E13',
    title: 'failed prices in the cart',
    section: 'tab-cart',
    failed: 'prices',
    setup: async (c) => {
      await failInCart(c, 'prices');
    },
    region: (c) => c.testId('tab-cart'),
    inPlace: async (c) => {
      const cart = c.testId('tab-cart');
      await c.expectParts(cart, 'line-price', 'error');
      await c.expectParts(cart, 'line-name', 'ready');
      await c.expectParts(cart, 'cart-total', 'error');
    },
  },
  {
    id: 'E14',
    title: 'failed products in an order',
    section: 'order-panel',
    failed: 'products',
    setup: async (c, fx) => {
      await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
      await c.openOrder(fx.editable.orderId);
      await c.release('order');
      await c.failAll('products');
      await c.settle();
    },
    region: (c) => c.testId('order-panel'),
    inPlace: async (c) => {
      await c.expectParts(c.testId('order-panel'), 'line-name', 'error');
      await expect(c.testId('order-panel-total')).toContainText('$');
      await expect(c.testId('edit-items')).toBeVisible();
    },
  },
  {
    id: 'E15',
    title: 'failed agents in a thread',
    section: 'ticket-panel',
    failed: 'agents',
    setup: async (c, fx) => {
      await c.selectAndSettle(fx.threaded.customerId, fx.threaded.customerName);
      await c.tab('tickets');
      await c.settle();
      await c.openTicket(fx.threaded.ticketId);
      await c.release('ticket');
      await c.failAll('agents');
      await c.settle();
    },
    region: (c) => c.testId('ticket-panel'),
    inPlace: async (c) => {
      const states = await c.partStates(c.testId('ticket-panel'), 'message-author');
      expect(states).toContain('error');
      expect(states).toContain('ready');
      await expect(c.testId('ticket-message').first()).toBeVisible();
      await expect(c.testId('reply-text')).toBeVisible();
    },
  },
  {
    id: 'E16',
    title: 'failed agents in the notes',
    section: 'tab-notes',
    failed: 'agents',
    setup: async (c, fx) => {
      await c.selectAndSettle(fx.noted.customerId, fx.noted.customerName);
      await c.tab('notes');
      await c.release('notes');
      await c.failAll('agents');
      await c.settle();
    },
    region: (c) => c.testId('tab-notes'),
    inPlace: async (c) => {
      await c.expectParts(c.testId('tab-notes'), 'note-author', 'error');
      await expect(c.testId('note').first()).toBeVisible();
      await expect(c.testId('note-text')).toBeVisible();
    },
  },
  {
    id: 'E17',
    title: 'failed prices of the hits',
    section: 'order-panel',
    failed: 'prices',
    setup: (c, fx) => openHits(c, fx, 'prices'),
    region: (c) => c.testId('catalog-search'),
    inPlace: async (c, fx) => {
      await c.expectParts(c.testId('catalog-search'), 'hit-price', 'error');
      await c.expectParts(c.testId('catalog-search'), 'hit-stock', 'ready');
      await expect(c.testId('catalog-search').locator(`[data-sku="${fx.editable.addSku}"]`)).toContainText(fx.editable.addName);
      await expect(c.testId(`add-${fx.editable.addSku}`)).toBeDisabled();
    },
  },
  {
    id: 'E18',
    title: 'failed stock of the hits',
    section: 'order-panel',
    failed: 'stock',
    setup: (c, fx) => openHits(c, fx, 'stock'),
    region: (c) => c.testId('catalog-search'),
    inPlace: async (c, fx) => {
      await c.expectParts(c.testId('catalog-search'), 'hit-stock', 'error');
      await c.expectParts(c.testId('catalog-search'), 'hit-price', 'ready');
      await expect(c.testId('catalog-search').locator(`[data-sku="${fx.editable.addSku}"]`)).toContainText(fx.editable.addName);
      await expect(c.testId(`add-${fx.editable.addSku}`)).toBeDisabled();
    },
  },
  {
    id: 'E19',
    title: 'failed products of the viewed names in the activity',
    section: 'activity',
    failed: 'products',
    setup: async (c, fx) => {
      const { customerId, customerName } = fx.twoInFlight;
      await c.selectCustomer(customerId, customerName);
      await c.releaseFor('activity', (arg) => arg === customerId);
      await c.failAll('products');
      await c.settle();
    },
    region: (c) => c.testId('activity'),
    inPlace: async (c) => {
      const states = await c.partStates(c.testId('activity'));
      expect(states).toContain('error');
      expect(states).toContain('ready');
    },
  },
  {
    id: 'E20',
    title: 'failed customer look-up of a sentence',
    section: 'notifications',
    failed: 'customer',
    setup: async (c) => {
      await c.open();
      await c.login();
      await c.release('notifications');
      await c.testId('bell').click();
      await c.failAll('customer');
      await c.settle();
    },
    region: (c) => c.testId('notifications'),
    inPlace: async (c) => {
      const states = await c.partStates(c.testId('notifications-list'));
      expect(states).toContain('error');
      await expect(c.testId('notifications-list').locator('[data-notification-id]').first()).toBeVisible();
      await c.testId('bell').click();
      await expect(c.testId('notifications-list')).toHaveCount(0);
    },
  },
];

/** Brings the page to the failure of an enrichment (E10, E11 and E20 fail while signing in). */
const begin = async (c: Console, e: Enrichment): Promise<Fixtures> => {
  if (e.id === 'E10' || e.id === 'E11' || e.id === 'E20') {
    await e.setup(c, undefined as never);
    return c.fixtures();
  }
  const fx = await signedIn(c);
  await e.setup(c, fx);
  return fx;
};

// ---------- stage 2: isolated, named, partial, stale on poll errors ----------

scenario('E1', 2, 'a failed header breaks nothing else', async ({ c }) => {
  const fx = await signedIn(c);
  await failForCustomer(c, fx, 'customer');
  await c.expectPartState('customer-profile', 'error');
  await c.expectParts(c.testId('customer-header'), 'kpi-spend', 'ready');
  await c.expectState('tab-orders', 'ready');
  await c.expectState('shipments', 'ready');
  await c.expectState('activity', 'ready', 'empty');
}, { smoke: true });

scenario('E2', 2, 'failed orders break only orders and shipments', async ({ c }) => {
  const fx = await signedIn(c);
  await failForCustomer(c, fx, 'orders');
  await c.expectState('customer-header', 'ready');
  await c.expectState('activity', 'ready', 'empty');
  expect(await c.failedSources('tab-orders')).toContain('orders');
});

scenario('E3', 2, 'a failed tracking breaks only its row', async ({ c }) => {
  const fx = await signedIn(c);
  const [o1, o2] = fx.twoInFlight.orderIds;
  await failOneShipment(c, fx);
  await c.expectState('shipments', 'ready');
  await c.expectPartState(`shipment-${o1}`, 'error');
  await c.expectPartState(`shipment-${o2}`, 'ready');
});

scenario('E4', 2, 'the cart names the failed source and keeps the rest', async ({ c }) => {
  await signedIn(c);
  await failInCart(c, 'products');
  await c.expectState('tab-cart', 'ready');
  await c.expectParts(c.testId('tab-cart'), 'line-name', 'error');
  await c.expectParts(c.testId('tab-cart'), 'line-price', 'ready');
  await c.expectParts(c.testId('tab-cart'), 'cart-total', 'ready');
  await c.expectState('customer-header', 'ready');
}, { smoke: true });

scenario('E5', 2, 'a failed linked ticket breaks only the ticket box', async ({ c }) => {
  const fx = await signedIn(c);
  await failLinkedTicket(c, fx);
  await c.expectState('order-panel', 'ready');
  await c.expectPartState('order-ticket', 'error');
  await expect(c.testId('edit-items')).toBeVisible();
});

scenario('E6', 2, 'a failed product search leaves the editor usable', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.openOrder(fx.editable.orderId);
  await c.settle();
  await c.testId('edit-items').click();
  await c.testId('catalog-search').locator('input').fill(fx.editable.addName.slice(0, 8));
  await c.idle(450);
  await c.fail('searchProducts');
  await c.settle();
  await c.expectPartState('catalog-search', 'error');
  const before = await c.testId('order-panel-total').textContent();
  await c.testId('order-panel').locator('[data-testid^="qty-inc-"]').first().click();
  await expect(c.testId('order-panel-total')).not.toHaveText(before ?? '');
  await expect(c.testId('save')).toBeEnabled();
});

scenario('E7', 2, 'a failed poll keeps the entries', async ({ c }) => {
  const fx = await signedIn(c, { clock: true });
  await failActivityPoll(c, fx);
  await c.expectState('activity', 'ready');
  await expect(c.testId('activity').locator('[data-testid="activity-entry"]:visible').first()).toBeVisible();
});

scenario('E8', 2, 'failed notifications break nothing else', async ({ c }) => {
  await c.open();
  await c.login();
  await c.fail('notifications');
  await c.settle();
  await c.expectState('customers', 'ready');
  await c.expectState('agent', 'ready');
  await expect(c.testId('bell-error')).toBeVisible();
  await c.testId('bell').click();
  await c.expectPartState('notifications-part', 'error');
});

scenario('E9', 2, 'a failed list leaves the selected customer working', async ({ c }) => {
  const fx = await signedIn(c);
  await c.selectAndSettle(fx.editable.customerId, fx.editable.customerName);
  await c.testId('filter-vip').click();
  await c.idle();
  await c.fail('customers');
  await c.settle();
  await c.expectState('customers', 'error');
  await c.expectState('customer-header', 'ready');
  await c.expectState('tab-orders', 'ready');
});

for (const e of ENRICHMENTS) {
  scenario(e.id, 2, `${e.title} degrades in place`, async ({ c }) => {
    const fx = await begin(c, e);
    await expectFlagged(c, e);
    await e.inPlace(c, fx);
  }, { smoke: e.id === 'E12' });
}

/** The section shows the failed source's name and Retry next to its content. */
async function expectFlagged(c: Console, e: Enrichment) {
  // the section itself works; only its fields fail (checked in `inPlace`)
  if (e.section !== 'catalog-search') await c.expectState(e.section, 'ready');
}

// ---------- recovery ----------

scenario('F1', 2, 'Retry in the header refetches only the header', async ({ c }) => {
  const fx = await signedIn(c);
  await failForCustomer(c, fx, 'customer');
  await c.resetStats();
  await c.retryIn('customer-profile');
  await c.settle();
  await c.expectState('customer-header', 'ready');
  expect(await c.totals('customer', 'orders', 'activity', 'shipment', 'orderStats', 'ticketCounts')).toEqual({
    customer: 1, orders: 0, activity: 0, shipment: 0, orderStats: 0, ticketCounts: 0,
  });
}, { smoke: true });

scenario('F2', 2, 'Retry on a row refetches only its tracking', async ({ c }) => {
  const fx = await signedIn(c);
  const [o1] = fx.twoInFlight.orderIds;
  await failOneShipment(c, fx);
  await c.resetStats();
  await c.testId(`shipment-${o1}`).getByRole('button', { name: 'Retry' }).click();
  await c.settle();
  await c.expectPartState(`shipment-${o1}`, 'ready');
  expect(await c.totals('shipment', 'orders')).toEqual({ shipment: 1, orders: 0 });
});

scenario('F3', 2, 'Retry in the cart refetches only the failed names', async ({ c }) => {
  await signedIn(c);
  await failInCart(c, 'products');
  await c.resetStats();
  await c.retryIn('tab-cart');
  await c.settle();
  await c.expectState('tab-cart', 'ready', 'empty');
  await c.expectParts(c.testId('tab-cart'), 'line-name', 'ready');
  // the failed names are asked again (in one batch or several), nothing else
  expect((await c.total('products'))).toBeGreaterThan(0);
  expect(await c.totals('prices', 'cart')).toEqual({ prices: 0, cart: 0 });
});

scenario('F4', 2, 'Retry in the ticket box refetches only the linked ticket', async ({ c }) => {
  const fx = await signedIn(c);
  await failLinkedTicket(c, fx);
  await c.resetStats();
  await c.testId('order-ticket').getByRole('button', { name: 'Retry' }).click();
  await c.settle();
  await c.expectPartState('order-ticket', 'ready');
  expect(await c.totals('ticketsByOrder', 'order')).toEqual({ ticketsByOrder: 1, order: 0 });
});

scenario('F6', 2, 'the next poll clears a poll error', async ({ c }) => {
  const fx = await signedIn(c, { clock: true });
  await failActivityPoll(c, fx);
  await c.page.clock.runFor(20_000);
  await c.release('activity');
  await c.expectState('activity', 'ready');
});

const retryScenario = (
  id: string,
  after: string,
  title: string,
  asked: ApiKey[],
  notAsked: ApiKey[],
  retry: (c: Console) => Promise<void>,
  done: (c: Console) => Promise<void>,
) => {
  const e = ENRICHMENTS.find((x) => x.id === after)!;
  scenario(id, 2, title, async ({ c }) => {
    await begin(c, e);
    await c.resetStats();
    await retry(c);
    await c.settle();
    await done(c);
    // the failed ids are asked again (in one batch or several), nothing else
    for (const key of asked) expect(await c.total(key), key).toBeGreaterThan(0);
    expect(await c.totals(...notAsked)).toEqual(Object.fromEntries(notAsked.map((k) => [k, 0])));
  });
};

retryScenario(
  'F7', 'E10', 'Retry in the list refetches only the failed tiers',
  ['tiers'], ['customers', 'ticketCounts'],
  (c) => c.retryIn('customers'),
  (c) => c.expectParts(c.testId('customers'), 'row-tier', 'ready'),
);
retryScenario(
  'F8', 'E11', 'Retry in the list refetches only the failed counters',
  ['ticketCounts'], ['customers', 'tiers'],
  (c) => c.retryIn('customers'),
  (c) => c.expectParts(c.testId('customers'), 'row-open-tickets', 'ready'),
);
retryScenario(
  'F9', 'E12', 'Retry in the header refetches only the failed KPIs',
  ['orderStats'], ['customer', 'ticketCounts'],
  (c) => c.retryIn('customer-header'),
  (c) => c.expectParts(c.testId('customer-header'), 'kpi-spend', 'ready'),
);
retryScenario(
  'F10', 'E15', 'Retry in the thread refetches only the failed authors',
  ['agents'], ['ticket'],
  (c) => c.retryIn('ticket-panel'),
  (c) => c.expectParts(c.testId('ticket-panel'), 'message-author', 'ready'),
);
retryScenario(
  'F11', 'E17', 'Retry in the hits refetches only the failed prices',
  ['prices'], ['searchProducts', 'stock'],
  async (c) => {
    await c.retryIn('catalog-search');
  },
  async (c) => {
    await c.expectParts(c.testId('catalog-search'), 'hit-price', 'ready');
  },
);
