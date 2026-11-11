import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../content/spinner-block/spinner-block.component';
import { OracleConsoleStore } from '../../../data/console.store';

/** The reference's product price field: the skeleton (`contesters/skeleton`) with its TODO props filled from the prices the cart and the editor's hits looked up. */
@Component({
  selector: 'app-oracle-product-price',
  imports: [AsyncPipe, CurrencyPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @let price = price$ | async;
      @if (price !== null && price !== undefined) {
        <span data-testid="field-product-price">{{
          price | currency: 'USD'
        }}</span>
      }
    </app-spinner-block>
  `,
})
export class OracleProductPrice {
  public readonly sku = input.required<string>();

  protected readonly price$ = combineLatest([
    toObservable(this.sku),
    inject(OracleConsoleStore).productPrices$,
  ]).pipe(map(([sku, prices]) => prices[sku]));

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
