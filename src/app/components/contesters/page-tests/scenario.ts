import './page-env'; // first: sets the URL the implementation reads at load
import { fakeAsync } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ReferenceConsoleComponent } from '../reference/reference-console.component';
import { ConsolePage } from './console-page.harness';

/** What the suite mounts. An implementation's stage registers its root `*Page` here. */
export const PAGE = ReferenceConsoleComponent;

/** Whole dollars as the currency pipe shows them. */
export const usd0 = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/** Dollars and cents as the currency pipe shows them. */
export const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A customer with a non-empty cart of at most 6 lines (any seed); `skip` picks the next one. */
export const withCart = (c: ConsolePage, skip = 0) => {
  const found: { customerId: number; customerName: string; skus: string[] }[] = [];
  for (let id = 1001; id < 1121 && found.length <= skip; id++) {
    const cart = c.truth<{ sku: string }[]>('cart', id);
    if (cart.length && cart.length <= 6) found.push({ customerId: id, customerName: c.truth('customer', id).name, skus: cart.map((l) => l.sku) });
  }
  return found[skip];
};

/** The same ids as the e2e suite: `H1 · stage 1 · …`; the stage is what the reporter groups by. */
export const scenario = (id: string, stage: 1 | 2 | 3, title: string, body: (c: ConsolePage) => void) =>
  it(
    `${id} · stage ${stage} · ${title}`,
    fakeAsync(() => {
      const c = ConsolePage.open(PAGE);
      try {
        body(c);
      } finally {
        c.close();
        TestBed.resetTestingModule();
      }
    }),
  );

/** A scenario that starts signed in, everything loaded. */
export const signedInScenario = (id: string, stage: 1 | 2 | 3, title: string, body: (c: ConsolePage, fx: ReturnType<ConsolePage['fixtures']>) => void) =>
  scenario(id, stage, title, (c) => {
    c.loginAndSettle();
    body(c, c.fixtures());
  });
