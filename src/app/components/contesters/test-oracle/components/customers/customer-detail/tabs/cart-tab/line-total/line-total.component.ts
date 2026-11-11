import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../../../../content/spinner-block/spinner-block.component';
import { OracleConsoleStore } from '../../../../../../data/console.store';

/** The reference's cart line total field: the skeleton (`contesters/skeleton`) with its TODO props filled: `qty × the cart's price of the sku`. */
@Component({
  selector: 'app-oracle-line-total',
  imports: [AsyncPipe, CurrencyPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @let total = total$ | async;
      @if (total !== null && total !== undefined) {
        <span data-testid="field-line-total">{{
          total | currency: 'USD'
        }}</span>
      }
    </app-spinner-block>
  `,
})
export class OracleLineTotal {
  public readonly sku = input.required<string>();
  public readonly qty = input.required<number>();

  protected readonly total$ = combineLatest([
    toObservable(this.sku),
    toObservable(this.qty),
    inject(OracleConsoleStore).productPrices$,
  ]).pipe(
    map(([sku, qty, prices]) =>
      prices[sku] === undefined ? undefined : qty * prices[sku],
    ),
  );

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
