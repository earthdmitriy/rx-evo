import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CartLine } from '../../../../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { ConsoleCartTabComponent } from '../../../../../../shared';
import { data, error, loading } from '../../../../../data/block-state';
import { cacheEntry } from '../../../../../data/entity-store';
import { CART } from '../../../../../data/sources';
import { toVm, Vm } from '../../../../../data/vm';

/** S6: the Cart tab. */
@Component({
  selector: 'app-signal-store-cart-tab-section',
  imports: [ViewBlockComponent, ConsoleCartTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="tab-cart"
      [loading]="loading(cart().state)"
      [error]="error(cart().state)"
      (retry)="cache.reload(customerId())"
    >
      <app-console-cart-tab
        [lines]="data(cart())"
        [customerId]="customerId()"
      />
    </app-view-block>
  `,
})
export class SignalStoreCartTabSection {
  public readonly customerId = input.required<number>();

  protected readonly cache = inject(CART);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  private readonly fetched = cacheEntry(this.cache, this.customerId);
  protected readonly cart = computed(
    (): Vm<CartLine[]> => toVm('cart', this.fetched(), (l) => !l.length),
  );
}
