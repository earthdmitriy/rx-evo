import './page-env';
import { ApplicationRef, Type } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, flush, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ConsoleApiKey } from '../../../services/contesters/backend/api-keys';
import { FakeBackend } from '../../../services/contesters/backend/fake-backend.service';
import { FakeTransport } from '../../../services/contesters/backend/fake-transport.service';
import { httpError } from '../../../services/contesters/backend/http-error';
import { pageUrl } from './page-env';

export type ViewStateAttr = 'no-block' | 'idle' | 'loading' | 'ready' | 'reloading' | 'error' | 'stale-error' | 'empty' | null;
export type PartStateAttr = 'loading' | 'ready' | 'error';

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

const squash =(s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * A page under test: the implementation's root `*Page` component mounted in
 * TestBed, the fake backend underneath. Everything is synchronous: run the
 * test body in `fakeAsync` (see `pageTest`), time moves only with `idle()`.
 *
 * It queries the DOM by the contract's test ids and attributes, like the e2e
 * suite, so a scenario reads the same in both.
 */
export class ConsolePage {
  readonly transport = TestBed.inject(FakeTransport);
  readonly backend = TestBed.inject(FakeBackend);
  private readonly app = TestBed.inject(ApplicationRef);

  private constructor(readonly fixture: ComponentFixture<unknown>) {}

  static open(page: Type<unknown>): ConsolePage {
    window.history.replaceState(null, '', pageUrl());
    const harness = new ConsolePage(TestBed.createComponent(page));
    harness.transport.latency.set('manual');
    harness.refresh();
    return harness;
  }

  // ---------- time ----------

  /** Re-renders. */
  refresh() {
    flushMicrotasks();
    this.fixture.detectChanges();
    this.app.tick();
  }

  /** Lets timers run (debounce, poll) and the page start its requests. */
  idle(ms = 400) {
    tick(ms);
    this.refresh();
  }

  /** Answers every pending request until nothing is pending (follow-up requests included). */
  settle(rounds = 12) {
    for (let i = 0; i < rounds; i++) {
      tick(60);
      const calls = [...this.transport.pendingCalls()];
      if (!calls.length) {
        this.refresh();
        return;
      }
      calls.forEach((c) => c.release());
      this.refresh();
    }
    throw new Error('requests kept coming while settling');
  }

  // ---------- the network ----------

  pending(key?: ConsoleApiKey) {
    return this.transport.pendingCalls(key);
  }

  release(key: ConsoleApiKey, index = 0) {
    const call = this.pending(key)[index];
    if (!call) throw new Error(`no pending ${key} #${index}`);
    call.release();
    this.refresh();
  }

  releaseFor(key: ConsoleApiKey, match: (arg: unknown) => boolean) {
    const call = this.pending(key).find((c) => match(c.arg));
    if (!call) throw new Error(`no pending ${key} for the argument`);
    call.release();
    this.refresh();
  }

  fail(key: ConsoleApiKey, index = 0) {
    const call = this.pending(key)[index];
    if (!call) throw new Error(`no pending ${key} #${index}`);
    call.fail(httpError(500, 'Internal server error', key));
    this.refresh();
  }

  failFor(key: ConsoleApiKey, match: (arg: unknown) => boolean) {
    const call = this.pending(key).find((c) => match(c.arg));
    if (!call) throw new Error(`no pending ${key} for the argument`);
    call.fail(httpError(500, 'Internal server error', key));
    this.refresh();
  }

  failAll(key: ConsoleApiKey) {
    this.idle(120);
    while (this.pending(key).length) this.fail(key);
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
    return JSON.parse(JSON.stringify((this.backend[method] as (...a: unknown[]) => unknown).apply(this.backend, args) ?? null));
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
    return [...scope.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`)];
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

  /** The block (`state-block`) around a view, found from an element inside it. */
  private blockOf(root: Element | null): Element | null {
    return root?.closest('[data-testid="state-block"]') ?? null;
  }

  /** The block of a section: inside the host that carries `data-section="<section>"` (the view is gone while it shows an error). */
  private sectionBlock(section: string): Element | null {
    return this.root.querySelector(`[data-section="${section}"] > [data-testid="state-block"]`);
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
    const content = block.querySelector(`[data-testid="${section}"]`)?.getAttribute('data-content') ?? 'none';
    const hasData = content === 'shown' || content === 'empty';
    if (block.classList.contains('loading')) return hasData ? 'reloading' : 'loading';
    return content === 'shown' ? 'ready' : content === 'empty' ? 'empty' : 'idle';
  }

  /** State of a row or a box inside a section: its `Part`. */
  partState(testId: string): PartStateAttr | null {
    const el = this.one(testId);
    return ((el?.getAttribute('data-part-state') ?? el?.querySelector('[data-part-state]')?.getAttribute('data-part-state')) as PartStateAttr | null) ?? null;
  }

  /** Every Part of that test id in the region is in one of the states (and there is at least one). */
  partsAre(region: ParentNode, testId: string, ...states: PartStateAttr[]): boolean {
    const got = this.partStates(region, testId);
    return got.length > 0 && got.every((s) => states.includes(s));
  }

  /** Lets the page start its requests, then checks that at least `count` of `key` are waiting. */
  waitPending(key: ConsoleApiKey, count = 1) {
    for (let i = 0; i < 20 && this.pending(key).length < count; i++) this.idle(50);
    expect(this.pending(key).length, `${key} pending`).toBeGreaterThanOrEqual(count);
  }

  /** The error text of the section's block: names the failed sources. */
  failedSources(section: string): string {
    return squash(this.sectionBlock(section)?.querySelector(':scope > app-generic-error')?.textContent);
  }

  partStates(region: ParentNode, testId?: string): PartStateAttr[] {
    const sel = testId ? `[data-testid="${testId}"][data-part-state], [data-testid="${testId}"] [data-part-state]` : '[data-part-state]';
    return [...region.querySelectorAll(sel)].map((e) => e.getAttribute('data-part-state') as PartStateAttr);
  }

  /** The region's block shows an error, or a `Part` inside is in `error`. */
  hasError(region: Element): boolean {
    return !!this.blockOf(region)?.querySelector(':scope > app-generic-error') || region.querySelector('[data-part-state="error"]') !== null;
  }

  /** The region's block is loading, or a skeleton or a `Part` inside is. */
  isLoading(region: Element): boolean {
    return !!this.blockOf(region)?.classList.contains('loading') || region.querySelector('.skeleton, [data-part-state="loading"]') !== null;
  }

  // ---------- user actions ----------

  click(target: string | HTMLElement) {
    const el = typeof target === 'string' ? this.one(target) : target;
    if (!el) throw new Error(`nothing to click: ${String(target)}`);
    el.click();
    this.refresh();
  }

  /** Types into an input (the element, or the input inside a test id). */
  fill(target: string | HTMLElement, value: string) {
    const host = typeof target === 'string' ? this.one(target) : target;
    const input = (host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement ? host : host?.querySelector('input, textarea')) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null
      | undefined;
    if (!input) throw new Error(`no input: ${String(target)}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    this.refresh();
  }

  /** Types a text key by key, `delayMs` apart (a typing user: debounce sees every keystroke). */
  type(target: string | HTMLElement, text: string, delayMs = 30) {
    for (let i = 1; i <= text.length; i++) {
      this.fill(target, text.slice(0, i));
      tick(delayMs);
    }
    this.refresh();
  }

  /** Picks an option of a `<select>`. */
  select(target: string, value: string) {
    const el = this.one(target) as HTMLSelectElement | null;
    if (!el) throw new Error(`no select: ${target}`);
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    this.refresh();
  }

  /** The element and its ancestors are not `hidden` (layout does not exist in jsdom). */
  isShown(el: HTMLElement | null): boolean {
    for (let e: HTMLElement | null = el; e; e = e.parentElement) if (e.hidden) return false;
    return el !== null;
  }

  /** Shown elements of a test id. */
  shown(testId: string, scope: ParentNode = this.root): HTMLElement[] {
    return this.all(testId, scope).filter((e) => this.isShown(e));
  }

  /** Shown elements carrying data of a customer, optionally inside a region (test id). */
  shownForCustomer(id: number, region?: string): HTMLElement[] {
    const scope: ParentNode | null = region ? this.one(region) : this.root;
    return [...(scope?.querySelectorAll<HTMLElement>(`[data-customer-id="${id}"]`) ?? [])].filter((e) => this.isShown(e));
  }

  /** Shown elements matching a CSS selector. */
  shownBy(selector: string): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(selector)].filter((e) => this.isShown(e));
  }

  /** The Retry button of a section's block. */
  retry(section: string) {
    const button = [...(this.sectionBlock(section)?.querySelectorAll<HTMLElement>(':scope > app-generic-error button') ?? [])].find((b) => /retry/i.test(b.textContent ?? ''));
    if (!button) throw new Error(`no Retry in ${section}`);
    this.click(button);
  }

  /** The Retry button inside any element (a row, a box, a hits list). */
  retryIn(testId: string) {
    const button = [...(this.one(testId)?.querySelectorAll<HTMLElement>('button') ?? [])].find((b) => /retry/i.test(`${b.textContent} ${b.getAttribute('aria-label') ?? ''}`));
    if (!button) throw new Error(`no Retry in ${testId}`);
    this.click(button);
  }

  /** A double click: two clicks in a row, before the page can answer. */
  dblclick(target: string) {
    this.click(target);
    this.click(target);
  }

  /** The value of an input or textarea. */
  value(testId: string): string {
    const host = this.one(testId);
    const el = (host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement ? host : host?.querySelector('input, textarea')) as HTMLInputElement | null;
    return el?.value ?? '';
  }

  isEnabled(testId: string): boolean {
    return !(this.one(testId) as HTMLButtonElement | null)?.disabled;
  }

  /** The state of the `Part` hosted by an element (itself or a descendant). */
  partOf(testId: string): PartStateAttr | null {
    const el = this.one(testId);
    return ((el?.getAttribute('data-part-state') ?? el?.querySelector('[data-part-state]')?.getAttribute('data-part-state')) as PartStateAttr | null) ?? null;
  }

  /** Logs out and lets the server answer the logout request, if the page sent one. */
  logout() {
    this.click('logout');
    this.idle(100);
    while (this.pending('logout').length) this.release('logout');
  }

  total(key: ConsoleApiKey) {
    return this.stats(key).total;
  }

  totals(...keys: ConsoleApiKey[]): Record<string, number> {
    return Object.fromEntries(keys.map((k) => [k, this.total(k)]));
  }

  login() {
    this.click('login');
    this.release('login');
  }

  loginAndSettle() {
    this.login();
    this.settle();
  }

  /** Makes the customer's row visible, searching by name if needed (answers the list's requests only). */
  findCustomer(id: number, name: string): HTMLElement {
    if (!this.has(`customer-${id}`)) {
      this.fill('customer-search', name);
      this.idle();
      while (this.pending('customers').length) this.release('customers');
    }
    const row = this.one(`customer-${id}`);
    if (!row) throw new Error(`customer-${id} row`);
    return row;
  }

  selectCustomer(id: number, name: string) {
    this.click(this.findCustomer(id, name));
  }

  selectAndSettle(id: number, name: string) {
    this.selectCustomer(id, name);
    this.settle();
  }

  tab(name: 'orders' | 'cart' | 'tickets' | 'notes') {
    this.click(`tab-${name}-toggle`);
  }

  openOrder(orderId: string) {
    this.click(`order-${orderId}`);
  }

  openTicket(ticketId: string) {
    this.click(`ticket-${ticketId}`);
  }

  /** Ends the test: nothing may keep running. */
  close() {
    this.fixture.destroy();
    discardPeriodicTasks();
    flush();
  }
}

/** A signed-in page with everything loaded, and the seeded fixtures. */
export const signedIn = (page: Type<unknown>) => {
  const c = ConsolePage.open(page);
  c.loginAndSettle();
  return { c, fx: c.fixtures() };
};
