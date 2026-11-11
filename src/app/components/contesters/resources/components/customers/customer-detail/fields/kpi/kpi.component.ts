import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../../content/resource-block/resource-block.component';
import { Bus } from '../../../../../data/bus';
import { OrderStatsRegistry } from '../../../../../data/order-stats.registry';

/** The KPI field: its own `orderStats` request per customer — the strip and the Orders badge each ask separately (R-L10's documented gap); the kind picks the number out of it. */
@Component({
  selector: 'app-resources-kpi',
  imports: [CurrencyPipe, ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @if (stats(); as s) {
        @switch (kind()) {
          @case ('lifetimeSpend') {
            <span data-testid="field-kpi">{{
              s.lifetimeSpend | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('avgOrder') {
            <span data-testid="field-kpi">{{
              s.avgOrder | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('orders') {
            <span data-testid="field-kpi">{{ s.orders }}</span>
          }
          @case ('orderCount') {
            <span class="badge badge-neutral" data-testid="field-kpi">{{
              s.orders
            }}</span>
          }
        }
      }
    </app-resource-block>
  `,
})
export class ResourcesKpi {
  public readonly customerId = input.required<number>();
  public readonly kind = input.required<
    'lifetimeSpend' | 'orders' | 'avgOrder' | 'orderCount'
  >();

  private readonly bus = inject(Bus);
  private readonly registry = inject(OrderStatsRegistry);
  /** The customer's order stats at the current version: the session's shared resource. */
  protected readonly res = computed(() => {
    const id = this.customerId();
    const v = this.bus.orderStats();
    return untracked(() => this.registry.orderStats(id, v));
  });
  protected readonly stats = computed(() => {
    const r = this.res();
    return r.hasValue() ? r.value() : undefined;
  });
}
