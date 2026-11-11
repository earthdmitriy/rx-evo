import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../../content/stateful-block/stateful-block.component';
import { HitAdded } from '../../../../../shared';
import { combineStatefulObservables } from '../../../../lib';
import { CURRENT_PRICE, STOCK_BY_SKU } from '../../../../sources/lookups';

/**
 * The Add action of a search hit: the skeleton (`contesters/skeleton`) with
 * its TODO props filled. The offer is the price and the stock of the sku,
 * combined with `combineStatefulObservables` (it has a value only once both
 * have); Add is enabled for stock above 0, and a click hands the view the sku
 * and the current price.
 */
@Component({
  selector: 'app-hit-add',
  imports: [AsyncPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="offer">
      @let value = offer.value$ | async;
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        [attr.data-testid]="'add-' + sku()"
        [disabled]="!value || !(value.stock > 0)"
        (click)="value && add(value.price)"
      >
        Add
      </button>
    </app-stateful-block>
  `,
})
export class HitAddComponent {
  public readonly sku = input.required<string>();
  public readonly onAdd = input.required<(added: HitAdded) => void>();

  private readonly sku$ = toObservable(this.sku);

  protected readonly offer = combineStatefulObservables(
    [
      inject(CURRENT_PRICE).project(this.sku$),
      inject(STOCK_BY_SKU).project(this.sku$),
    ],
    ([entry, stock]) => ({ price: entry.price, stock }),
  );

  protected add(price: number) {
    this.onAdd()({ sku: this.sku(), unitPrice: price });
  }
}
