import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../../../../content/stateful-block/stateful-block.component';
import { map } from 'rxjs';
import { CURRENT_PRICE } from '../../../../../../sources/lookups';

/**
 * The cart line total field: the skeleton (`contesters/skeleton`) with its
 * TODO props filled. The price is the projection of the shared price factory
 * that the price field reads too (one request per sku); the template
 * multiplies it by `qty()` once it has arrived.
 */
@Component({
  selector: 'app-line-total',
  imports: [AsyncPipe, CurrencyPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="price">
      @let value = price.value$ | async;
      @if (value !== null && value !== undefined) {
        <span data-testid="field-line-total">{{
          qty() * value | currency: 'USD'
        }}</span>
      }
    </app-stateful-block>
  `,
})
export class LineTotalComponent {
  public readonly sku = input.required<string>();
  public readonly qty = input.required<number>();

  protected readonly price = inject(CURRENT_PRICE)
    .project(toObservable(this.sku))
    .pipeValue(map((entry) => entry.price));
}
