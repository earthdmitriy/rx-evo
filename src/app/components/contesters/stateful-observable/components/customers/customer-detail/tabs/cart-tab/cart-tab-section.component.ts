import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../../../content/stateful-block/stateful-block.component';
import { ConsoleCartTabComponent } from '../../../../../../shared';
import { CART_BY_CUSTOMER } from '../../../../../sources/lookups';

/**
 * S6: the cart lines are the own data of the view; the names, the prices,
 * the line totals and the cart total are field components of the page.
 */
@Component({
  selector: 'app-cart-tab-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleCartTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="tab-cart" [stream]="cart">
      <app-console-cart-tab
        [lines]="cart.value$ | async"
        [customerId]="customerId()"
      />
    </app-stateful-block>
  `,
})
export class CartTabSectionComponent {
  public readonly customerId = input.required<number>();

  private readonly cartOf = inject(CART_BY_CUSTOMER);

  /** The cart of the customer: the customer is the input, the results are cached in the factory. */
  protected readonly cart = this.cartOf.project(toObservable(this.customerId));
}
