import './page-env';
import { ApplicationRef, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ConsoleApiKey } from '../../../services/contesters/backend/api-keys';
import { FakeBackend } from '../../../services/contesters/backend/fake-backend.service';
import { FakeTransport } from '../../../services/contesters/backend/fake-transport.service';
import { httpError } from '../../../services/contesters/backend/http-error';
import { pageUrl } from './page-env';

export type ViewStateAttr =
  | 'no-block'
  | 'idle'
  | 'loading'
  | 'ready'
  | 'reloading'
  | 'error'
  | 'stale-error'
  | 'empty'
  | null;
/** A field of a view: it shows its value, or it is an empty space (not arrived). */
export type FieldStateAttr = 'shown' | 'empty';

export type Fixtures = {
  editable: {
    customerId: number;
    customerName: string;
    orderId: string;
    ticketId: string;
    addSku: string;
    addName: string;
  };
  shipped: { customerId: number; customerName: string; orderId: string };
  openTicket: { customerId: number; customerName: string; ticketId: string };
  twoInFlight: { customerId: number; customerName: string; orderIds: string[] };
  allDelivered: { customerId: number; customerName: string };
  bigCart: { customerId: number; customerName: string; lines: number };
  threaded: { customerId: number; customerName: string; ticketId: string };
  noted: { customerId: number; customerName: string };
};

const squash = (s: string | null | undefined) =>
  (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * One turn of the event loop's microtasks, native ones included: the page's
 * `await`s (a resource's load, a stream's first value) continue in them, and
 * the fake clock's `advanceTimersByTimeAsync` drains them between timers too.
 */
const turn = async () => {
  await vi.advanceTimersByTimeAsync(0);
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

/**
 * A page under test: the implementation's root `*Page` component mounted in
 * TestBed, the fake backend underneath. The test body is async and runs with
 * fake timers (see `scenario`): time moves only with `idle()`.
 *
 * It queries the DOM by the contract's test ids and attributes, like the e2e
 * suite, so a scenario reads the same in both.
 */
export class ConsolePage {
  readonly transport = TestBed.inject(FakeTransport);
  readonly backend = TestBed.inject(FakeBackend);
  private readonly app = TestBed.inject(ApplicationRef);

  private constructor(readonly fixture: ComponentFixture<unknown>) {}

  static async open(page: Type<unknown>): Promise<ConsolePage> {
    window.history.replaceState(null, '', pageUrl());
    const harness = new ConsolePage(TestBed.createComponent(page));
    harness.transport.latency.set('manual');
    await harness.refresh();
    return harness;
  }

  // ---------- time ----------

  /**
   * Re-renders until the page is quiet: a result settles in a microtask, the
   * change detection that follows can start effects (signals, resources),
   * which settle in the next microtask, and so on.
   */
  async refresh() {
    for (let round = 0; round < 6; round++) {
      await turn();
      TestBed.flushEffects();
      this.fixture.detectChanges();
      this.app.tick();
    }
    await turn();
  }

  /** Lets timers run (debounce, poll) and the page start its requests. */
  async idle(ms = 400) {
    await vi.advanceTimersByTimeAsync(ms);
    await this.refresh();
  }

  /** Answers every pending request until nothing is pending (follow-up requests included). */
  async settle(rounds = 12) {
    for (let i = 0; i < rounds; i++) {
      await vi.advanceTimersByTimeAsync(60);
      await this.refresh(); // effects of the last answers start the next requests
      const calls = [...this.transport.pendingCalls()];
      if (!calls.length) return;
      calls.forEach((c) => c.release());
      await this.refresh();
    }
    throw new Error('requests kept coming while settling');
  }

  // ---------- the network ----------

  pending(key?: ConsoleApiKey) {
    return this.transport.pendingCalls(key);
  }

  /**
   * The oldest pending request of `key` that matches, waiting a little for the
   * page to start it (as the browser suite polls): a page may start a request
   * after a microtask or a short timer.
   */
  private async awaitCall(
    key: ConsoleApiKey,
    match: (c: { arg: unknown }, index: number) => boolean = () => true,
  ) {
    for (let i = 0; i < 20; i++) {
      const call = this.pending(key).find((c, index) => match(c, index));
      if (call) return call;
      await this.idle(50);
    }
    throw new Error(`no pending ${key} for the argument`);
  }

  async release(key: ConsoleApiKey, index = 0) {
    (await this.awaitCall(key, (_, i) => i === index)).release();
    await this.refresh();
  }

  async releaseFor(key: ConsoleApiKey, match: (arg: unknown) => boolean) {
    (await this.awaitCall(key, (c) => match(c.arg))).release();
    await this.refresh();
  }

  async fail(key: ConsoleApiKey, index = 0) {
    (await this.awaitCall(key, (_, i) => i === index)).fail(
      httpError(500, 'Internal server error', key),
    );
    await this.refresh();
  }

  async failFor(key: ConsoleApiKey, match: (arg: unknown) => boolean) {
    (await this.awaitCall(key, (c) => match(c.arg))).fail(
      httpError(500, 'Internal server error', key),
    );
    await this.refresh();
  }

  async failAll(key: ConsoleApiKey) {
    await this.idle(120);
    while (this.pending(key).length) await this.fail(key);
  }

  setThrow(key: ConsoleApiKey, on: boolean) {
    this.transport.setFault(key, on);
  }

  stats(key: ConsoleApiKey) {
    return this.transport.stats()[key];
  }

  calls<T = unknown>(key: ConsoleApiKey): T[] {
    return this.transport.calls(key).map((c) => c.arg as T);
  }

  resetStats() {
    this.transport.resetStats();
  }

  /** What the backend holds right now (no latency, counters or session check). */
  truth<T = any>(method: keyof FakeBackend, ...args: unknown[]): T {
    return JSON.parse(
      JSON.stringify(
        (this.backend[method] as (...a: unknown[]) => unknown).apply(
          this.backend,
          args,
        ) ?? null,
      ),
    );
  }

  /** Seeded cases (see `FakeBackend.testFixtures`; all present for the default seed). */
  fixtures(): Fixtures {
    return this.backend.testFixtures() as unknown as Fixtures;
  }

  // ---------- the DOM ----------

  private get root(): HTMLElement {
    return this.fixture.nativeElement;
  }

  /** Every element with the test id (inside `scope` when given). */
  all(testId: string, scope: ParentNode = this.root): HTMLElement[] {
    return [
      ...scope.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`),
    ];
  }

  one(testId: string, scope: ParentNode = this.root): HTMLElement | null {
    return this.all(testId, scope)[0] ?? null;
  }

  has(testId: string) {
    return this.one(testId) !== null;
  }

  text(testId: string, scope: ParentNode = this.root): string {
    return squash(this.one(testId, scope)?.textContent);
  }

  texts(testId: string, scope: ParentNode = this.root): string[] {
    return this.all(testId, scope).map((e) => squash(e.textContent));
  }

  /** Text of a region (a test id) or of the whole page. */
  contentOf(testId?: string): string {
    return squash((testId ? this.one(testId) : this.root)?.textContent);
  }

  /**
   * Text of a region without what sits in a block that is loading: while a
   * block loads, the previous key's data may stay under its spinner (R-C2).
   */
  settledContentOf(testId: string): string {
    const region = this.one(testId);
    if (!region) return '';
    const copy = region.cloneNode(true) as HTMLElement;
    copy
      .querySelectorAll('[data-testid="state-block"].loading')
      .forEach((b) => b.remove());
    return squash(copy.textContent);
  }

  /** The block (`state-block`) around a view, found from an element inside it. */
  private blockOf(root: Element | null): Element | null {
    return root?.closest('[data-testid="state-block"]') ?? null;
  }

  /** The block of a section: inside the host that carries `data-section="<section>"` (the view is gone while it shows an error). */
  private sectionBlock(section: string): Element | null {
    return this.root.querySelector(
      `[data-section="${section}"] > [data-testid="state-block"]`,
    );
  }

  /**
   * State of a section, from the block around its view: the block's
   * `loading` class, an `app-generic-error` in it, and whether the view
   * shows data (`data-content`: shown, empty, none). Null when absent.
   */
  state(section: string): ViewStateAttr {
    const host = this.root.querySelector(`[data-section="${section}"]`);
    if (!host) return null;
    const block = this.sectionBlock(section);
    if (!block) return 'no-block' as ViewStateAttr;
    if (block.querySelector(':scope > app-generic-error')) return 'error';
    const content =
      block
        .querySelector(`[data-testid="${section}"]`)
        ?.getAttribute('data-content') ?? 'none';
    const hasData = content === 'shown' || content === 'empty';
    if (block.classList.contains('loading'))
      return hasData ? 'reloading' : 'loading';
    return content === 'shown'
      ? 'ready'
      : content === 'empty'
        ? 'empty'
        : 'idle';
  }

  /** A field of a view, by its test id: `shown` when it has content, `empty` while it is a blank space, null when absent. */
  fieldState(testId: string): FieldStateAttr | null {
    const el = this.one(testId);
    return el ? (squash(el.textContent) ? 'shown' : 'empty') : null;
  }

  /** States of every field of that test id in the region, in DOM order. */
  fieldStates(region: ParentNode, testId: string): FieldStateAttr[] {
    return this.all(testId, region).map((e) =>
      squash(e.textContent) ? 'shown' : 'empty',
    );
  }

  /** Every field of that test id in the region is in the state (and there is at least one). */
  fieldsAre(
    region: ParentNode,
    testId: string,
    state: FieldStateAttr,
  ): boolean {
    const got = this.fieldStates(region, testId);
    return got.length > 0 && got.every((s) => s === state);
  }

  /** The tracking box of an in-flight order in S9: shown when its content is. */
  trackingOf(orderId: string): FieldStateAttr | null {
    const row = this.one(`shipment-${orderId}`);
    const box = row?.querySelector('[data-testid="shipment-tracking"]');
    return box ? (squash(box.textContent) ? 'shown' : 'empty') : null;
  }

  /** Lets the page start its requests, then checks that at least `count` of `key` are waiting. */
  async waitPending(key: ConsoleApiKey, count = 1) {
    for (let i = 0; i < 20 && this.pending(key).length < count; i++)
      await this.idle(50);
    expect(this.pending(key).length, `${key} pending`).toBeGreaterThanOrEqual(
      count,
    );
  }

  /** The error text of the section's block: names the failed sources. */
  failedSources(section: string): string {
    return squash(
      this.sectionBlock(section)?.querySelector(':scope > app-generic-error')
        ?.textContent,
    );
  }

  /** The texts of the error views inside a section (its own block, or the blocks of its fields). */
  errorsIn(section: string): string[] {
    const host = this.root.querySelector(`[data-section="${section}"]`);
    return [...(host?.querySelectorAll('app-generic-error') ?? [])].map((e) =>
      squash(e.textContent),
    );
  }

  /** The region's block shows an error. */
  hasError(region: Element): boolean {
    return !!this.blockOf(region)?.querySelector(':scope > app-generic-error');
  }

  /** The region's block is loading. */
  isLoading(region: Element): boolean {
    return !!this.blockOf(region)?.classList.contains('loading');
  }

  // ---------- user actions ----------

  async click(target: string | HTMLElement) {
    const el = typeof target === 'string' ? this.one(target) : target;
    if (!el) throw new Error(`nothing to click: ${String(target)}`);
    el.click();
    await this.refresh();
  }

  /** Types into an input (the element, or the input inside a test id). */
  async fill(target: string | HTMLElement, value: string) {
    const host = typeof target === 'string' ? this.one(target) : target;
    const input = (
      host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement
        ? host
        : host?.querySelector('input, textarea')
    ) as HTMLInputElement | HTMLTextAreaElement | null | undefined;
    if (!input) throw new Error(`no input: ${String(target)}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await this.refresh();
  }

  /** Types a text key by key, `delayMs` apart (a typing user: debounce sees every keystroke). */
  async type(target: string | HTMLElement, text: string, delayMs = 30) {
    for (let i = 1; i <= text.length; i++) {
      await this.fill(target, text.slice(0, i));
      await vi.advanceTimersByTimeAsync(delayMs);
    }
    await this.refresh();
  }

  /** Picks an option of a `<select>`. */
  async select(target: string, value: string) {
    const el = this.one(target) as HTMLSelectElement | null;
    if (!el) throw new Error(`no select: ${target}`);
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await this.refresh();
  }

  /** The element and its ancestors are not `hidden` (layout does not exist in jsdom). */
  isShown(el: HTMLElement | null): boolean {
    for (let e: HTMLElement | null = el; e; e = e.parentElement)
      if (e.hidden) return false;
    return el !== null;
  }

  /** Shown elements of a test id. */
  shown(testId: string, scope: ParentNode = this.root): HTMLElement[] {
    return this.all(testId, scope).filter((e) => this.isShown(e));
  }

  /** Shown elements carrying data of a customer, optionally inside a region (test id). */
  shownForCustomer(id: number, region?: string): HTMLElement[] {
    const scope: ParentNode | null = region ? this.one(region) : this.root;
    return [
      ...(scope?.querySelectorAll<HTMLElement>(`[data-customer-id="${id}"]`) ??
        []),
    ].filter((e) => this.isShown(e));
  }

  /** Like `shownForCustomer`, without the elements in a block that is loading (old data may stay under a spinner, R-C2). */
  shownForCustomerSettled(id: number, region?: string): HTMLElement[] {
    return this.shownForCustomer(id, region).filter(
      (e) => !e.closest('[data-testid="state-block"].loading'),
    );
  }

  /** Shown elements matching a CSS selector. */
  shownBy(selector: string): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(selector)].filter((e) =>
      this.isShown(e),
    );
  }

  /** The Retry button of a section's block. */
  async retry(section: string) {
    const button = [
      ...(this.sectionBlock(section)?.querySelectorAll<HTMLElement>(
        ':scope > app-generic-error button',
      ) ?? []),
    ].find((b) => /retry/i.test(b.textContent ?? ''));
    if (!button) throw new Error(`no Retry in ${section}`);
    await this.click(button);
  }

  /** The Retry button of the error view inside an element (a field, a row). */
  async retryIn(root: Element) {
    const button = [
      ...root.querySelectorAll<HTMLElement>('app-generic-error button'),
    ].find((b) => /retry/i.test(b.textContent ?? ''));
    if (!button) throw new Error('no Retry in the element');
    await this.click(button);
  }

  /** A double click: two clicks in a row, before the page can answer. */
  async dblclick(target: string) {
    await this.click(target);
    await this.click(target);
  }

  /** The value of an input or textarea. */
  value(testId: string): string {
    const host = this.one(testId);
    const el = (
      host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement
        ? host
        : host?.querySelector('input, textarea')
    ) as HTMLInputElement | null;
    return el?.value ?? '';
  }

  isEnabled(testId: string): boolean {
    return !(this.one(testId) as HTMLButtonElement | null)?.disabled;
  }

  /** Logs out and lets the server answer the logout request, if the page sent one. */
  async logout() {
    await this.click('logout');
    await this.idle(100);
    while (this.pending('logout').length) await this.release('logout');
  }

  total(key: ConsoleApiKey) {
    return this.stats(key).total;
  }

  totals(...keys: ConsoleApiKey[]): Record<string, number> {
    return Object.fromEntries(keys.map((k) => [k, this.total(k)]));
  }

  async login() {
    await this.click('login');
    await this.release('login');
  }

  async loginAndSettle() {
    await this.login();
    await this.settle();
  }

  /** Makes the customer's row visible, searching by name if needed (answers the list's requests only). */
  async findCustomer(id: number, name: string): Promise<HTMLElement> {
    if (!this.has(`customer-${id}`)) {
      await this.fill('customer-search', name);
      await this.idle();
      while (this.pending('customers').length) await this.release('customers');
      // the new rows' own calls (tiers, counters) leave in a later task than the search result
      await this.idle();
      for (const key of ['tiers', 'ticketCounts'] as const) {
        while (this.pending(key).length) await this.release(key);
      }
    }
    const row = this.one(`customer-${id}`);
    if (!row) throw new Error(`customer-${id} row`);
    return row;
  }

  async selectCustomer(id: number, name: string) {
    await this.click(await this.findCustomer(id, name));
  }

  async selectAndSettle(id: number, name: string) {
    await this.selectCustomer(id, name);
    await this.settle();
  }

  async tab(name: 'orders' | 'cart' | 'tickets' | 'notes') {
    await this.click(`tab-${name}-toggle`);
  }

  async openOrder(orderId: string) {
    await this.click(`order-${orderId}`);
  }

  async openTicket(ticketId: string) {
    await this.click(`ticket-${ticketId}`);
  }

  /** Ends the test: nothing may keep running. */
  close() {
    this.fixture.destroy();
    vi.clearAllTimers();
  }
}

/** A signed-in page with everything loaded, and the seeded fixtures. */
export const signedIn = async (page: Type<unknown>) => {
  const c = await ConsolePage.open(page);
  await c.loginAndSettle();
  return { c, fx: c.fixtures() };
};
