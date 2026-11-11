import './page-env'; // first: sets the URL the implementation reads at load
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ConsolePage } from './console-page.harness';
import { PAGE_TARGET } from './page-env';
import { PAGES } from './pages';

/** What the suite mounts: `PAGE_TARGET` from the registry in pages.ts. */
export const PAGE =
  PAGES[PAGE_TARGET] ??
  (() => {
    throw new Error(`unknown PAGE_TARGET ${PAGE_TARGET}: see pages.ts`);
  })();

/** Whole dollars as the currency pipe shows them. */
export const usd0 = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/** Dollars and cents as the currency pipe shows them. */
export const usd = (n: number) =>
  '$' +
  n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** A customer with a non-empty cart of at most 6 lines (any seed); `skip` picks the next one. */
export const withCart = (c: ConsolePage, skip = 0) => {
  const found: { customerId: number; customerName: string; skus: string[] }[] =
    [];
  for (let id = 1001; id < 1121 && found.length <= skip; id++) {
    const cart = c.truth<{ sku: string }[]>('cart', id);
    if (cart.length && cart.length <= 6)
      found.push({
        customerId: id,
        customerName: c.truth('customer', id).name,
        skus: cart.map((l) => l.sku),
      });
  }
  return found[skip];
};

/**
 * One page test: a fresh page, the page's own clock faked (`idle` moves it),
 * the body awaited. Requests are answered in real microtasks (see the harness).
 * The same ids as the e2e suite: `H1 · stage 1 · …`; the stage is what the reporter groups by.
 */
export const scenario = (
  id: string,
  stage: 1 | 2 | 3,
  title: string,
  body: (c: ConsolePage) => Promise<void> | void,
) =>
  it(`${id} · stage ${stage} · ${title}`, async () => {
    vi.useFakeTimers();
    const c = await ConsolePage.open(PAGE);
    try {
      await body(c);
    } finally {
      c.close();
      TestBed.resetTestingModule();
      vi.useRealTimers();
    }
  });

/** A scenario that starts signed in, everything loaded. */
export const signedInScenario = (
  id: string,
  stage: 1 | 2 | 3,
  title: string,
  body: (
    c: ConsolePage,
    fx: ReturnType<ConsolePage['fixtures']>,
  ) => Promise<void> | void,
) =>
  scenario(id, stage, title, async (c) => {
    await c.loginAndSettle();
    await body(c, c.fixtures());
  });

/** A failed source shows its error view: an error view is inside `section` (the section's block, or one of its fields). */
export const expectErrorView = (c: ConsolePage, section: string) => {
  expect(
    c.errorsIn(section).length,
    `an error view in ${section}`,
  ).toBeGreaterThan(0);
};
