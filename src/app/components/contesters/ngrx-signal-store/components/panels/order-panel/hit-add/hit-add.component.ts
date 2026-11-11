import { Component, computed, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../../content/view-block/view-block.component';
import { HitAdded } from '../../../../../shared';
import { fieldError } from '../../../../data/block-state';
import { cacheEntry } from '../../../../data/entity-store';
import { PRICE, STOCK } from '../../../../data/sources';
import { UI_STATE } from '../../../../data/ui-state';

/** The Add action of a search hit: enabled once both the price and the stock of the sku have arrived and stock is above 0. */
@Component({
  selector: 'app-signal-store-hit-add',
  imports: [ViewBlockComponent],
  template: `
    <app-view-block
      class="field-block"
      [loading]="price().state === 'loading' || stock().state === 'loading'"
      [error]="error()"
      (retry)="retry()"
    >
      @let offer = value();
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        [attr.data-testid]="'add-' + sku()"
        [disabled]="!offer || !(offer.stock > 0)"
        (click)="offer && add(offer.price)"
      >
        Add
      </button>
    </app-view-block>
  `,
})
export class SignalStoreHitAdd {
  public readonly sku = input.required<string>();
  public readonly onAdd = input.required<(added: HitAdded) => void>();

  private readonly ui = inject(UI_STATE);
  private readonly prices = inject(PRICE);
  private readonly stocks = inject(STOCK);
  protected readonly price = cacheEntry(this.prices, this.sku);
  protected readonly stock = cacheEntry(this.stocks, this.sku);
  protected readonly error = computed(
    () => fieldError(this.price()) ?? fieldError(this.stock()),
  );
  protected retry() {
    if (fieldError(this.price())) this.prices.reload(this.sku());
    if (fieldError(this.stock())) this.stocks.reload(this.sku());
  }
  protected readonly value = computed(() => {
    const price = this.price();
    const stock = this.stock();
    return price.state === 'ready' && stock.state === 'ready'
      ? { price: price.value.price, stock: stock.value.stock }
      : null;
  });

  protected add(price: number) {
    this.onAdd()({ sku: this.sku(), unitPrice: price });
    // once added, the search is done with: clears the hits so the new line and its hit don't both show the same sku
    this.ui.setSearchText('');
  }
}
