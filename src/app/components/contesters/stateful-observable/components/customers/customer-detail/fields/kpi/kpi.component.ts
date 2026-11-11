import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { StatefulBlockComponent } from '../../../../../../../content/stateful-block/stateful-block.component';
import { ORDER_STATS_BY_CUSTOMER } from '../../../../../sources/lookups';

/**
 * The KPI field: the skeleton (`contesters/skeleton`) with its TODO props
 * filled. The customer id is the input of a projection of the shared order
 * stats factory (the strip and the Orders badge of one customer read the same
 * entry); the kind picks the number out of it.
 */
@Component({
  selector: 'app-kpi',
  imports: [AsyncPipe, CurrencyPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="value">
      @let number = value.value$ | async;
      @if (number !== null && number !== undefined) {
        @switch (kind()) {
          @case ('lifetimeSpend') {
            <span data-testid="field-kpi">{{
              number | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('avgOrder') {
            <span data-testid="field-kpi">{{
              number | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('orders') {
            <span data-testid="field-kpi">{{ number }}</span>
          }
          @case ('orderCount') {
            <span class="badge badge-neutral" data-testid="field-kpi">{{
              number
            }}</span>
          }
        }
      }
    </app-stateful-block>
  `,
})
export class KpiComponent {
  public readonly customerId = input.required<number>();
  public readonly kind = input.required<
    'lifetimeSpend' | 'orders' | 'avgOrder' | 'orderCount'
  >();

  private readonly kind$ = toObservable(this.kind);
  protected readonly value = inject(ORDER_STATS_BY_CUSTOMER)
    .project(toObservable(this.customerId))
    .pipeValue(
      switchMap((stats) =>
        this.kind$.pipe(
          map((kind) =>
            kind === 'lifetimeSpend'
              ? stats.lifetimeSpend
              : kind === 'avgOrder'
                ? stats.avgOrder
                : stats.orders,
          ),
        ),
      ),
    );
}
