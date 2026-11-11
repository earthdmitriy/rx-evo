import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  untracked,
} from '@angular/core';
import { IN_FLIGHT } from '../../../../../../../../services/contesters';
import { ResourceBlockComponent } from '../../../../../../../content/resource-block/resource-block.component';
import { ConsoleShipmentsComponent } from '../../../../../../shared';
import { Bus } from '../../../../../data/bus';
import { OrdersRegistry } from '../../../../../data/orders.registry';
import { UiState } from '../../../../../data/ui-state';

/** S9: the in-flight shipments of the selected customer: each row's tracking is its own field component. */
@Component({
  selector: 'app-resources-shipments-section',
  imports: [ResourceBlockComponent, ConsoleShipmentsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="shipments" [resource]="res()">
      <app-console-shipments
        [rows]="shipmentRows()"
        [customerId]="customerId()"
        (openOrder)="ui.openOrder($event)"
      />
    </app-resource-block>
  `,
})
export class ResourcesShipmentsSection {
  public readonly customerId = input.required<number>();
  protected readonly ui = inject(UiState);

  private readonly bus = inject(Bus);
  private readonly registry = inject(OrdersRegistry);
  /** The customer's orders at the current write version: the same shared resource the Orders tab reads. */
  protected readonly res = computed(() => {
    const id = this.customerId();
    const v = this.bus.orders();
    return untracked(() => this.registry.orders(id, v));
  });
  protected readonly shipmentRows = computed(
    () =>
      (this.res().hasValue() ? this.res().value() : undefined)
        ?.filter((r) => IN_FLIGHT.includes(r.status))
        .map((r) => ({ orderId: r.orderId, status: r.status })) ?? null,
  );
}
