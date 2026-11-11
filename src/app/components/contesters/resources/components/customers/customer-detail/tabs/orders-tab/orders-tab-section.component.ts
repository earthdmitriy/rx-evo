import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../../content/resource-block/resource-block.component';
import { ConsoleOrdersTabComponent } from '../../../../../../shared';
import { Bus } from '../../../../../data/bus';
import { OrdersRegistry } from '../../../../../data/orders.registry';
import { UiState } from '../../../../../data/ui-state';

/** S5: the Orders tab. */
@Component({
  selector: 'app-resources-orders-tab-section',
  imports: [ResourceBlockComponent, ConsoleOrdersTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="tab-orders" [resource]="res()">
      <app-console-orders-tab
        [orders]="(res().hasValue() ? res().value() : undefined) ?? null"
        [customerId]="customerId()"
        (openOrder)="ui.openOrder($event)"
      />
    </app-resource-block>
  `,
})
export class ResourcesOrdersTabSection {
  public readonly customerId = input.required<number>();
  protected readonly ui = inject(UiState);

  private readonly bus = inject(Bus);
  private readonly registry = inject(OrdersRegistry);
  /** The customer's orders at the current write version: the session's shared resource. */
  protected readonly res = computed(() => {
    const id = this.customerId();
    const v = this.bus.orders();
    return untracked(() => this.registry.orders(id, v));
  });
}
