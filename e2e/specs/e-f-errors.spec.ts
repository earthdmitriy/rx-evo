import { Console, expect, expectErrorView, Fixtures, scenario } from '../support/console';
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
const failInCart = async (c: Console, key: 'product' | 'prices') => {
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
 * One failed enrichment source: `setup` brings the page to the failure, and
 * `inPlace` says what shows in place of the failed field (its error view,
 * naming its API call) and what keeps working. Nothing below the level of a
 * section has a Retry.
 */
type Enrichment = {
  id: string;
  title: string;
  /** Section that keeps working. */
  section: string;
  setup: (c: Console, fx: Fixtures) => Promise<void>;
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

/** The editor's hit row of the sku to add. */
const hitRow = (c: Console, fx: Fixtures) => c.testId('catalog-search').locator(`[data-sku="${fx.editable.addSku}"]`);

/** Answers the reload of a hit's price and stock, whichever the Reload asked again. */
const answerHitReload = async (c: Console) => {
  for (const key of ['prices', 'stock'] as const) if ((await c.pendingCount(key)) > 0) await c.release(key);
  await c.settle();
};

const ENRICHMENTS: Enrichment[] = [
  {
    id: 'E10',
    title: 'failed tiers',
    section: 'customers',
    setup: (c) => signInToList(c, 'tiers'),
    inPlace: async (c, _fx) => {
      await expectErrorView(c, 'customers');
      await c.expectFields(c.testId('customers'), 'row-open-tickets', 'shown');
      await expect(c.page.locator('[data-testid^="customer-"][data-customer-id]')).toHaveCount(8);
      await expect(c.testId('page-next')).toBeEnabled();
    },
  },
  {
    id: 'E11',
    title: 'failed ticketCounts in the list',
    section: 'customers',
    setup: (c) => signInToList(c, 'ticketCounts'),
    inPlace: async (c, _fx) => {
      await expectErrorView(c, 'customers');
      await c.expectFields(c.testId('customers'), 'row-tier', 'shown');
      await expect(c.page.locator('[data-testid^="customer-"][data-customer-id]')).toHaveCount(8);
    },
  },
  {
    id: 'E12',
    title: 'failed orderStats',
    section: 'customer-header',
    setup: (c, fx) => failForCustomer(c, fx, 'orderStats'),
    inPlace: async (c, fx) => {
      const header = c.testId('customer-header');
      await expect(c.testId('customer-name')).toHaveText(fx.twoInFlight.customerName);
      await expectErrorView(c, 'customer-header');
      await c.expectFields(header, 'kpi-open-tickets', 'shown');
      // the Orders badge shows an error with a Reload button; Reload asks orderStats again and the badge recovers
      await expect(c.testId('tab-orders-count').locator('app-generic-error')).toHaveCount(1);
      await c.testId('tab-orders-count').getByRole('button', { name: 'Retry' }).click();
      if ((await c.pendingCount('orderStats')) > 0) await c.release('orderStats');
      await c.settle();
      await c.expectFieldState('tab-orders-count', 'shown');
      await c.expectState('tab-orders', 'ready');
      await c.expectState('shipments', 'ready');
      await c.expectState('activity', 'ready');
    },
  },
  {
    id: 'E13',
    title: 'failed prices in the cart',
    section: 'tab-cart',
    setup: async (c) => {
      await failInCart(c, 'prices');
    },
    inPlace: async (c, _fx) => {
      const cart = c.testId('tab-cart');
      await expectErrorView(c, 'tab-cart');
      await c.expectFields(cart, 'line-name', 'shown');
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
      await expectErrorView(c, 'order-panel');
      await expect(c.testId('order-panel-total')).toContainText('$');
      await expect(c.testId('edit-items')).toBeVisible();
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
      await expectErrorView(c, 'ticket-panel');
      await expect(c.testId('ticket-message').first()).toBeVisible();
      await expect(c.testId('reply-text')).toBeVisible();
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
      await expectErrorView(c, 'tab-notes');
      await expect(c.testId('note').first()).toBeVisible();
      await expect(c.testId('note-text')).toBeVisible();
    },
  },
  {
    id: 'E17',
    title: 'failed prices of the hits',
    section: 'order-panel',
    setup: (c, fx) => openHits(c, fx, 'prices'),
    inPlace: async (c, fx) => {
      // the hit keeps its row; its price shows an error with a Reload button
      await expectErrorView(c, 'order-panel');
      await expect(hitRow(c, fx)).toContainText(fx.editable.addName);
      await hitRow(c, fx).getByRole('button', { name: 'Retry' }).first().click();
      await answerHitReload(c);
      await c.expectFields(hitRow(c, fx), 'hit-price', 'shown');
      await expect(c.testId(`add-${fx.editable.addSku}`)).toBeEnabled();
    },
  },
  {
    id: 'E18',
    title: 'failed stock of the hits',
    section: 'order-panel',
    setup: (c, fx) => openHits(c, fx, 'stock'),
    inPlace: async (c, fx) => {
      await expectErrorView(c, 'order-panel');
      await expect(hitRow(c, fx)).toContainText(fx.editable.addName);
      await hitRow(c, fx).getByRole('button', { name: 'Retry' }).first().click();
      await answerHitReload(c);
      await c.expectFields(hitRow(c, fx), 'hit-stock', 'shown');
      await expect(c.testId(`add-${fx.editable.addSku}`)).toBeEnabled();
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
      await expectErrorView(c, 'activity');
      expect(await c.fieldStates(c.testId('activity'), 'activity-text')).toContain('shown');
    },
  },
  {
    id: 'E20',
    title: 'failed customer look-up of a sentence',
    section: 'notifications',
    setup: async (c) => {
      await c.open();
      await c.login();
      await c.release('notifications');
      await c.testId('bell').click();
      await c.failAll('customer');
      await c.settle();
    },
    inPlace: async (c, _fx) => {
      await expectErrorView(c, 'notifications');
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
  await c.expectState('customer-header', 'error');
  await expectErrorView(c, 'customer-header');
  await c.expectState('tab-orders', 'ready');
  await c.expectState('shipments', 'ready');
  await c.expectState('activity', 'ready', 'empty');
}, { smoke: true });

scenario('E2', 2, 'failed orders break only orders and shipments', async ({ c }) => {
  const fx = await signedIn(c);
  await failForCustomer(c, fx, 'orders');
  await c.expectState('customer-header', 'ready');
  await c.expectState('activity', 'ready', 'empty');
  await expectErrorView(c, 'tab-orders');
});

scenario('E3', 2, 'a failed tracking breaks only its row', async ({ c }) => {
  const fx = await signedIn(c);
  const o2 = fx.twoInFlight.orderIds[1];
  await failOneShipment(c, fx);
  await c.expectState('shipments', 'ready');
  await expectErrorView(c, 'shipments');
  await c.expectTracking(o2, 'shown');
});

scenario('E4', 2, 'the cart names the failed source and keeps the rest', async ({ c }) => {
  await signedIn(c);
  await failInCart(c, 'product');
  await c.expectState('tab-cart', 'ready');
  await expectErrorView(c, 'tab-cart');
  await c.expectFields(c.testId('tab-cart'), 'line-price', 'shown');
  await c.expectFields(c.testId('tab-cart'), 'cart-total', 'shown');
  await c.expectState('customer-header', 'ready');
}, { smoke: true });

scenario('E5', 2, 'a failed linked ticket breaks only the ticket box', async ({ c }) => {
  const fx = await signedIn(c);
  await failLinkedTicket(c, fx);
  await c.expectState('order-panel', 'ready');
  await expectErrorView(c, 'order-panel');
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
  await c.expectState('order-panel', 'ready');
  await expect(c.testId('hit-price')).toHaveCount(0);
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
  await expect(c.testId('logout')).toBeVisible();
  await c.expectState('notifications', 'error');
  await expectErrorView(c, 'notifications');
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
    // the section itself works; only the failed field shows its error view
    await c.expectState(e.section, 'ready');
    await e.inPlace(c, fx);
  }, { smoke: e.id === 'E12' });
}

// ---------- recovery ----------

scenario('F1', 2, 'Retry in the header refetches only the header', async ({ c }) => {
  const fx = await signedIn(c);
  await failForCustomer(c, fx, 'customer');
  await c.resetStats();
  await c.retry('customer-header');
  await c.settle();
  await c.expectState('customer-header', 'ready');
  expect(await c.totals('customer', 'orders', 'activity', 'shipment', 'orderStats', 'ticketCounts')).toEqual({
    customer: 1, orders: 0, activity: 0, shipment: 0, orderStats: 0, ticketCounts: 0,
  });
}, { smoke: true });

scenario('F6', 2, 'the next poll clears a poll error', async ({ c }) => {
  const fx = await signedIn(c, { clock: true });
  await failActivityPoll(c, fx);
  await c.page.clock.runFor(20_000);
  await c.release('activity');
  await c.expectState('activity', 'ready');
});
