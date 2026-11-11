import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../../content/spinner-block/spinner-block.component';
import { HitAdded } from '../../../../../shared';
import { OracleConsoleStore } from '../../../../data/console.store';

/**
 * The reference's Add action of a search hit: the skeleton
 * (`contesters/skeleton`) with its TODO props filled from the prices and the
 * stock the editor's hits looked up. Enabled when both are known and the stock
 * is above 0; a click hands the view the sku and the current price.
 */
@Component({
  selector: 'app-oracle-hit-add',
  imports: [AsyncPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @let offer = offer$ | async;
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        [attr.data-testid]="'add-' + sku()"
        [disabled]="!offer || !canAdd(offer)"
        (click)="offer && add(offer)"
      >
        Add
      </button>
    </app-spinner-block>
  `,
})
export class OracleHitAdd {
  public readonly sku = input.required<string>();
  public readonly onAdd = input.required<(added: HitAdded) => void>();

  private readonly store = inject(OracleConsoleStore);

  /** The current price and stock of the sku. */
  protected readonly offer$ = combineLatest([
    toObservable(this.sku),
    this.store.productPrices$,
    this.store.productStock$,
  ]).pipe(
    map(([sku, prices, stock]) => ({
      price: prices[sku] as number | undefined,
      stock: stock[sku] as number | undefined,
    })),
  );

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;

  protected canAdd(offer: {
    price: number | undefined;
    stock: number | undefined;
  }) {
    return (
      offer.price !== undefined && offer.stock !== undefined && offer.stock > 0
    );
  }

  protected add(offer: { price: number | undefined }) {
    if (offer.price !== undefined)
      this.onAdd()({ sku: this.sku(), unitPrice: offer.price });
  }
}
