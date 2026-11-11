import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../../../../content/spinner-block/spinner-block.component';
import { CartLineRef } from '../../../../../../../shared';
import { OracleConsoleStore } from '../../../../../../data/console.store';

/** The reference's cart total field: the skeleton (`contesters/skeleton`) with its TODO props filled: the sum over the lines, nothing while any price is missing. */
@Component({
  selector: 'app-oracle-cart-total',
  imports: [AsyncPipe, CurrencyPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @let total = total$ | async;
      @if (total !== null && total !== undefined) {
        <span data-testid="field-cart-total">{{
          total | currency: 'USD'
        }}</span>
      }
    </app-spinner-block>
  `,
})
export class OracleCartTotal {
  public readonly lines = input.required<CartLineRef[]>();

  protected readonly total$ = combineLatest([
    toObservable(this.lines),
    inject(OracleConsoleStore).productPrices$,
  ]).pipe(
    map(([lines, prices]) =>
      lines.some((l) => prices[l.sku] === undefined)
        ? undefined
        : lines.reduce((sum, l) => sum + l.qty * prices[l.sku], 0),
    ),
  );

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
