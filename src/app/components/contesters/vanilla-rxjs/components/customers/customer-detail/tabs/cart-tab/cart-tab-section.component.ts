import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../../../content/generic-error/generic-error.component';
import { ConsoleCartTabComponent } from '../../../../../../shared';
import {
  data,
  error,
  idle,
  loading,
  notices,
} from '../../../../../data/block-state';
import { VanillaRxjsConsoleStore } from '../../../../../data/console.store';

/** S6: the Cart tab. */
@Component({
  selector: 'app-vanilla-rxjs-cart-tab-section',
  imports: [ViewBlockComponent, GenericErrorComponent, ConsoleCartTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="tab-cart"
      [loading]="loading(cart().state)"
      [error]="error(cart().state)"
      (retry)="s.retryCart()"
    >
      <app-console-cart-tab
        [lines]="data(cart())"
        [customerId]="customerId()"
      />
      <div class="contents">
        @for (n of notices(cart().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class VanillaRxjsCartTabSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly cart = toSignal(this.s.cart$, { initialValue: idle });
}
