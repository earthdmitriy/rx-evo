import { CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { fieldError } from '../../../../../data/block-state';
import { cacheEntry } from '../../../../../data/entity-store';
import { ORDER_STATS } from '../../../../../data/sources';

/** The KPI field: the customer id reads the shared `ORDER_STATS` cache (the strip and the Orders badge of one customer read the same entry); the kind picks the number out of it. */
@Component({
  selector: 'app-signal-store-kpi',
  imports: [CurrencyPipe, ViewBlockComponent],
  template: `
    <app-view-block
      class="field-block"
      [loading]="stats().state === 'loading'"
      [error]="fieldError(stats())"
      (retry)="cache.reload(customerId())"
    >
      @let s = stats();
      @if (s.state === 'ready') {
        @switch (kind()) {
          @case ('lifetimeSpend') {
            <span data-testid="field-kpi">{{
              s.value.lifetimeSpend | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('avgOrder') {
            <span data-testid="field-kpi">{{
              s.value.avgOrder | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('orders') {
            <span data-testid="field-kpi">{{ s.value.orders }}</span>
          }
          @case ('orderCount') {
            <span class="badge badge-neutral" data-testid="field-kpi">{{
              s.value.orders
            }}</span>
          }
        }
      }
    </app-view-block>
  `,
})
export class SignalStoreKpi {
  public readonly customerId = input.required<number>();
  public readonly kind = input.required<
    'lifetimeSpend' | 'orders' | 'avgOrder' | 'orderCount'
  >();

  protected readonly cache = inject(ORDER_STATS);
  protected readonly stats = cacheEntry(this.cache, this.customerId);
  protected readonly fieldError = fieldError;
}
