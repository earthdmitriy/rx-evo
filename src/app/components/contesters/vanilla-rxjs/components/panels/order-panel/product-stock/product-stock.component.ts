import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../../content/spinner-block/spinner-block.component';
import { VanillaRxjsConsoleStore } from '../../../../data/console.store';

/** The reference's product stock field: the skeleton (`contesters/skeleton`) with its TODO props filled from the stock the editor's hits looked up. */
@Component({
  selector: 'app-vanilla-rxjs-product-stock',
  imports: [AsyncPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @let stock = stock$ | async;
      @if (stock !== null && stock !== undefined) {
        @if (stock > 0) {
          <span data-testid="field-product-stock">{{ stock }} in stock</span>
        } @else {
          <span class="text-rose-600" data-testid="field-product-stock"
            >out of stock</span
          >
        }
      }
    </app-spinner-block>
  `,
})
export class VanillaRxjsProductStock {
  public readonly sku = input.required<string>();

  protected readonly stock$ = combineLatest([
    toObservable(this.sku),
    inject(VanillaRxjsConsoleStore).productStock$,
  ]).pipe(map(([sku, stock]) => stock[sku]));

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
