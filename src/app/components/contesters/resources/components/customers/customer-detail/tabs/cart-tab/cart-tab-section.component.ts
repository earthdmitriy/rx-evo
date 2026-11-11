import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../../content/resource-block/resource-block.component';
import { ConsoleCartTabComponent } from '../../../../../../shared';
import { CartRegistry } from '../../../../../data/cart.registry';

/** S6: the Cart tab. */
@Component({
  selector: 'app-resources-cart-tab-section',
  imports: [ResourceBlockComponent, ConsoleCartTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="tab-cart" [resource]="res()">
      <app-console-cart-tab
        [lines]="(res().hasValue() ? res().value() : undefined) ?? null"
        [customerId]="customerId()"
      />
    </app-resource-block>
  `,
})
export class ResourcesCartTabSection {
  public readonly customerId = input.required<number>();

  private readonly registry = inject(CartRegistry);
  /** The customer's cart: the session's shared resource. */
  protected readonly res = computed(() => {
    const id = this.customerId();
    return untracked(() => this.registry.cart(id));
  });
}
