import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../content/spinner-block/spinner-block.component';
import { VanillaRxjsConsoleStore } from '../../../data/console.store';

/**
 * The reference's product name field: the skeleton (`contesters/skeleton`)
 * with its TODO props filled. A cached lookup under the hood: the store
 * collects the names that the cart, the activity and the open order looked up
 * from the products service; this component reads its sku there through the
 * `async` pipe.
 */
@Component({
  selector: 'app-vanilla-rxjs-product-name',
  imports: [AsyncPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (name$ | async; as name) {
        <span data-testid="product-name">{{ prefix() }}{{ name }}</span>
      }
    </app-spinner-block>
  `,
})
export class VanillaRxjsProductName {
  public readonly sku = input.required<string>();
  public readonly prefix = input('');

  protected readonly name$ = combineLatest([
    toObservable(this.sku),
    inject(VanillaRxjsConsoleStore).productNames$,
  ]).pipe(map(([sku, names]) => names[sku]));

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
