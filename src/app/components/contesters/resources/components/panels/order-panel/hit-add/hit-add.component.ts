import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../content/resource-block/resource-block.component';
import { HitAdded } from '../../../../../shared';
import { Bus } from '../../../../data/bus';
import { PricesRegistry } from '../../../../data/prices.registry';
import { StockRegistry } from '../../../../data/stock.registry';
import { UiState } from '../../../../data/ui-state';

/** The Add action of a search hit: enabled once both the price and the stock of the sku have arrived and stock is above 0. */
@Component({
  selector: 'app-resources-hit-add',
  imports: [ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="priceRes()">
      <app-resource-block [resource]="stockRes()">
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
      </app-resource-block>
    </app-resource-block>
  `,
})
export class ResourcesHitAdd {
  public readonly sku = input.required<string>();
  public readonly onAdd = input.required<(added: HitAdded) => void>();

  private readonly ui = inject(UiState);
  private readonly bus = inject(Bus);
  private readonly prices = inject(PricesRegistry);
  private readonly stocks = inject(StockRegistry);

  /** The sku's price and stock: the session's shared resources (the visible price and stock fields read the same ones). */
  protected readonly priceRes = computed(() => {
    const sku = this.sku();
    return untracked(() => this.prices.price(sku));
  });
  protected readonly stockRes = computed(() => {
    const sku = this.sku();
    const v = this.bus.stock();
    return untracked(() => this.stocks.stock(sku, v));
  });
  protected readonly value = computed(() => {
    const p = this.priceRes();
    const s = this.stockRes();
    const price = (p.hasValue() ? p.value() : undefined)?.price;
    const stock = (s.hasValue() ? s.value() : undefined)?.stock;
    return price !== undefined && stock !== undefined ? { price, stock } : null;
  });

  protected add(price: number) {
    this.onAdd()({ sku: this.sku(), unitPrice: price });
    // once added, the search is done with: clears the hits so the new line and its hit don't both show the same sku
    this.ui.setSearchText('');
  }
}
