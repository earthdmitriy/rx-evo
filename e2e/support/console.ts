import { expect, Locator, Page, test as base, TestInfo } from '@playwright/test';
import { E2E_SEED, Target } from '../targets';

/** One key per backend call (src/app/services/contesters/backend/api-keys.ts). */
export type ApiKey =
  | 'login' | 'logout' | 'profile' | 'agents' | 'notifications' | 'markNotificationsRead'
  | 'customers' | 'customer' | 'tiers' | 'orders' | 'orderStats' | 'order' | 'updateOrder' | 'resendConfirmation'
  | 'shipment' | 'cart' | 'products' | 'searchProducts' | 'prices' | 'stock'
  | 'tickets' | 'ticketsByOrder' | 'ticketCounts' | 'ticket' | 'replyTicket'
  | 'notes' | 'addNote' | 'activity';

/** State of a `Part` (`app-part` host, `data-part-state`). */
export type PartStateAttr = 'loading' | 'ready' | 'error'; // @s2-narrow

export type ViewStateAttr = 'idle' | 'loading' | 'ready' | 'reloading' | 'error' | 'empty' | null; // @s2-narrow

type Stats = { total: number; ok: number; errors: number; cancelled: number; inFlight: number };

export type Fixtures = {
  editable: { customerId: number; customerName: string; orderId: string; ticketId: string; addSku: string; addName: string };
  shipped: { customerId: number; customerName: string; orderId: string };
  openTicket: { customerId: number; customerName: string; ticketId: string };
  twoInFlight: { customerId: number; customerName: string; orderIds: string[] };
  allDelivered: { customerId: number; customerName: string };
  bigCart: { customerId: number; customerName: string; lines: number };
  threaded: { customerId: number; customerName: string; ticketId: string };
  noted: { customerId: number; customerName: string };
};

/**
 * State of a section from its block (spec §7): the block (`state-block`)
 * inside the host that carries `data-section="<section>"`, its `loading`
 * class, and the view's own `data-content` (`shown`, `empty`, `none`).
 * Self-contained: it runs in the page.
 */
const deriveState = (host: Element, section: string): string => {
  const block = host.querySelector(':scope > [data-testid="state-block"]');
  if (!block) return 'no-block';
  if (block.querySelector(':scope > app-generic-error')) return 'error'; // @s2-line
  const content = block.querySelector(`[data-testid="${section}"]`)?.getAttribute('data-content') ?? 'none';
  const hasData = content === 'shown' || content === 'empty';
  if (block.classList.contains('loading')) return hasData ? 'reloading' : 'loading';
  return content === 'shown' ? 'ready' : content === 'empty' ? 'empty' : 'idle';
};

/** Page object over the view contract (docs/contest/spec.md §7) and `window.__api`. */
export class Console {
  constructor(
    readonly page: Page,
    readonly target: Target,
  ) {}

  // ---------- navigation ----------

  async open(options: { clock?: boolean } = {}) {
    if (options.clock) await this.page.clock.install();
    const defect = this.target.defect ? `&defect=${this.target.defect}` : '';
    await this.page.goto(`${this.target.path}?seed=${E2E_SEED}&latency=manual&push=off${defect}`);
    await expect(this.page.getByTestId('signin').or(this.page.getByTestId('agent'))).toBeVisible();
  }

  testId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  /**
   * State of a section, from the block around its view (`state-block`): its
   * `loading` class and whether the view shows data (`data-content` of the
   * view). Null when the section is absent.
   */
  async state(section: string): Promise<ViewStateAttr> {
    const host = this.page.locator(`[data-section="${section}"]`);
    if (!(await host.count())) return null;
    return (await host.first().evaluate(deriveState, section)) as ViewStateAttr;
  }

  async expectState(section: string, ...states: ViewStateAttr[]) {
    await expect
      .poll(async () => {
        const s = await this.state(section);
        return states.includes(s) ? 'ok' : `${s}`;
      }, { message: `${section} state should be ${states.join(' | ')}` })
      .toBe('ok');
  }

  /** State of a row or a box inside a section: its `Part`. */
  async partState(part: string): Promise<PartStateAttr | null> {
    return this.partOf(this.testId(part));
  }

  async expectPartState(part: string, ...states: PartStateAttr[]) {
    await expect
      .poll(async () => {
        const s = await this.partState(part);
        return states.includes(s) ? 'ok' : `${s}`;
      }, { message: `${part} state should be ${states.join(' | ')}` })
      .toBe('ok');
  }

  /** Visible elements carrying data of a customer, optionally inside a region. */
  shownForCustomer(id: number, region?: string): Locator {
    const scope = region ? this.testId(region) : this.page.locator('body');
    return scope.locator(`[data-customer-id="${id}"]:visible`);
  }

  // @s2-begin
  /** The error text of the section's block: names the failed sources. */
  async failedSources(section: string): Promise<string> {
    return (await this.page.locator(`[data-section="${section}"]`).first().evaluate((host) => host.querySelector(':scope > [data-testid="state-block"] > app-generic-error')?.textContent ?? '')).trim();
  }

  /** Clicks Retry in the section's block. */
  async retry(section: string) {
    await this.page
      .locator(`[data-section="${section}"] > [data-testid="state-block"] > app-generic-error`)
      .getByRole('button', { name: 'Retry' })
      .click();
  }

  /** Clicks Retry inside a row or a box (a `Part` in error). */
  async retryIn(testId: string) {
    await this.testId(testId).locator('[data-testid="part-retry"]').first().click();
  }

  // @s2-end

  // ---------- parts ----------

  /** State of the `Part` hosted by `locator` (an `app-part` or a parent of exactly one). */
  async partOf(locator: Locator): Promise<PartStateAttr | null> {
    if (!(await locator.count())) return null;
    return locator.first().evaluate((el) => (el.getAttribute('data-part-state') ?? el.querySelector('[data-part-state]')?.getAttribute('data-part-state') ?? null) as PartStateAttr | null);
  }

  /** States of every `Part` (optionally of one test id) inside a region, in DOM order. */
  async partStates(region: Locator, testId?: string): Promise<PartStateAttr[]> {
    const parts = testId ? region.locator(`[data-testid="${testId}"][data-part-state], [data-testid="${testId}"] [data-part-state]`) : region.locator('[data-part-state]');
    return parts.evaluateAll((els) => els.map((e) => e.getAttribute('data-part-state') as PartStateAttr));
  }

  /** Waits until every `Part` of that test id in the region has one of the states. */
  async expectParts(region: Locator, testId: string, ...states: PartStateAttr[]) {
    await expect
      .poll(async () => {
        const got = await this.partStates(region, testId);
        return got.length > 0 && got.every((s) => states.includes(s)) ? 'ok' : got.join() || 'none';
      }, { message: `${testId} parts should be ${states.join(' | ')}` })
      .toBe('ok');
  }

  /** Nothing in the region is loading: no skeleton, no `loading` part. */
  async expectNoLoading(region: Locator) {
    await expect(region.locator('.skeleton:visible, [data-part-state="loading"]')).toHaveCount(0);
    await expect.poll(() => region.first().evaluate((r) => !!r.closest('[data-testid="state-block"].loading')), { message: 'the block is not loading' }).toBe(false);
  }

  // @s2-begin
  /** The region shows an error: its block has an `app-generic-error`, or a `Part` inside is in `error`. */
  async hasError(region: Locator): Promise<boolean> {
    return region.first().evaluate((r) => !!r.closest('[data-testid="state-block"]')?.querySelector(':scope > app-generic-error') || !!r.querySelector('[data-part-state="error"]'));
  }

  // @s2-end

  // ---------- window.__api ----------

  /** What the backend holds right now (a service method called directly: no latency, no counters). */
  truth<T = any>(method: string, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(([m, a]) => (window as any).__api.truth(m, ...a), [method, args] as const);
  }

  /** Arguments of the calls of `key` started since the last `resetStats`. */
  calls<T = any>(key: ApiKey): Promise<T[]> {
    return this.page.evaluate((k) => (window as any).__api.calls(k), key);
  }

  fixtures(): Promise<Fixtures> {
    return this.page.evaluate(() => (window as any).__api.fixtures());
  }

  pending(key?: ApiKey): Promise<{ id: number; key: ApiKey; arg: unknown }[]> {
    return this.page.evaluate((k) => (window as any).__api.pending(k), key);
  }

  async pendingCount(key: ApiKey) {
    return (await this.pending(key)).length;
  }

  async waitPending(key: ApiKey, count = 1) {
    await expect.poll(() => this.pendingCount(key), { message: `${key} pending` }).toBeGreaterThanOrEqual(count);
  }

  /** Releases the oldest (or `index`-th) pending request of `key`. */
  async release(key: ApiKey, index = 0) {
    await this.waitPending(key, index + 1);
    await this.page.evaluate(([k, i]) => (window as any).__api.release(k, { index: i }), [key, index] as const);
  }

  /** Releases the pending request of `key` whose argument matches. */
  async releaseFor(key: ApiKey, match: (arg: unknown) => boolean) {
    let index = -1;
    await expect
      .poll(async () => (index = (await this.pending(key)).findIndex((c) => match(c.arg))), { message: `${key} pending for arg` })
      .toBeGreaterThanOrEqual(0);
    await this.page.evaluate(([k, i]) => (window as any).__api.release(k, { index: i }), [key, index] as const);
  }

  // @s2-begin
  async fail(key: ApiKey, index = 0) {
    await this.waitPending(key, index + 1);
    await this.page.evaluate(([k, i]) => (window as any).__api.fail(k, { index: i }), [key, index] as const);
  }

  /** Fails every pending request of `key` (after letting the page start them all): batch granularity is the page's business. */
  async failAll(key: ApiKey) {
    await this.waitPending(key);
    await this.idle(120);
    while (await this.pendingCount(key)) await this.fail(key);
  }

  async failFor(key: ApiKey, match: (arg: unknown) => boolean) {
    let index = -1;
    await expect
      .poll(async () => (index = (await this.pending(key)).findIndex((c) => match(c.arg))), { message: `${key} pending for arg` })
      .toBeGreaterThanOrEqual(0);
    await this.page.evaluate(([k, i]) => (window as any).__api.fail(k, { index: i }), [key, index] as const);
  }

  // @s2-end

  /** Releases every pending request until nothing is pending (follow-up requests included). */
  async settle(rounds = 12) {
    for (let i = 0; i < rounds; i++) {
      await this.page.waitForTimeout(60);
      const released = await this.page.evaluate(() => (window as any).__api.releaseAll());
      if (!released) {
        await this.page.waitForTimeout(80);
        if (!(await this.page.evaluate(() => (window as any).__api.pending().length))) return;
      }
    }
    throw new Error('requests kept coming while settling');
  }

  // @s2-begin
  setThrow(key: ApiKey, on: boolean) {
    return this.page.evaluate(([k, v]) => (window as any).__api.setThrow(k, v), [key, on] as const);
  }
  // @s2-end

  async stats(key: ApiKey): Promise<Stats> {
    return this.page.evaluate((k) => (window as any).__api.stats()[k], key);
  }

  async total(key: ApiKey) {
    return (await this.stats(key)).total;
  }

  async totals(...keys: ApiKey[]): Promise<Record<string, number>> {
    const all = await this.page.evaluate(() => (window as any).__api.stats());
    return Object.fromEntries(keys.map((k) => [k, all[k].total]));
  }

  resetStats() {
    return this.page.evaluate(() => (window as any).__api.resetStats());
  }

  /** Runs debounce timers and lets requests start. */
  async idle(ms = 400) {
    await this.page.waitForTimeout(ms);
  }

  // ---------- user actions ----------

  async login() {
    await this.testId('login').click();
    await this.release('login');
    await expect(this.testId('agent')).toBeVisible();
  }

  async loginAndSettle() {
    await this.login();
    await this.settle();
  }

  /** Logs out and lets the server answer the logout request, if the page sent one. */
  async logout() {
    await this.testId('logout').click();
    await expect(this.testId('signin')).toBeVisible();
    await this.idle(100);
    while (await this.pendingCount('logout')) await this.release('logout');
  }

  /** Makes the customer's row visible, searching by name if needed (settles the list). */
  async findCustomer(id: number, name: string) {
    const row = this.testId(`customer-${id}`);
    if (!(await row.isVisible())) {
      await this.testId('customer-search').fill(name);
      await this.idle();
      // answer only the list's requests: other pending requests belong to the test
      await expect
        .poll(async () => {
          while (await this.pendingCount('customers')) await this.release('customers');
          return row.isVisible();
        }, { message: `customer-${id} row` })
        .toBe(true);
    }
    return row;
  }

  /** Finds the customer and selects it (does not settle the customer's requests). */
  async selectCustomer(id: number, name: string) {
    await (await this.findCustomer(id, name)).click();
  }

  async selectAndSettle(id: number, name: string) {
    await this.selectCustomer(id, name);
    await this.settle();
  }

  async tab(name: 'orders' | 'cart' | 'tickets' | 'notes') {
    await this.testId(`tab-${name}-toggle`).click();
  }

  async openOrder(orderId: string) {
    await this.testId(`order-${orderId}`).click();
  }

  async openTicket(ticketId: string) {
    await this.testId(`ticket-${ticketId}`).click();
  }
}

/**
 * One scenario of one stage (docs/contest/stage-<n>.md). The title starts
 * with the scenario id and the stage; the `@s<n>` tag is what the reporter
 * uses to sort results into met / missing / free / not yet.
 */
export const test = base.extend<{ c: Console }, { target: Target }>({
  target: [undefined as unknown as Target, { option: true, scope: 'worker' }],
  c: async ({ page, target }, use) => {
    await use(new Console(page, target));
  },
});

export const scenario = (
  id: string,
  stage: 1 | 2 | 3,
  title: string,
  body: (args: { c: Console; page: Page }, info: TestInfo) => Promise<void>,
  options: { smoke?: boolean } = {},
) =>
  test(`${id} · stage ${stage} · ${title}`, { tag: [`@s${stage}`, ...(options.smoke ? ['@smoke'] : [])] }, async ({ c, page }, info) => {
    await body({ c, page }, info);
  });

export { expect };
