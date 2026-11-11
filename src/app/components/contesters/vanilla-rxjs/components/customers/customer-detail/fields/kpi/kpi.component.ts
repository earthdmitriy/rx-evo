import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../../../content/spinner-block/spinner-block.component';
import { GenericErrorComponent } from '../../../../../../../content/generic-error/generic-error.component';
import { VanillaRxjsConsoleStore } from '../../../../../data/console.store';

/** The reference's KPI field: the skeleton with its TODO props filled from the orders service's answer for the selected customer. */
@Component({
  selector: 'app-vanilla-rxjs-kpi',
  imports: [
    AsyncPipe,
    CurrencyPipe,
    SpinnerBlockComponent,
    GenericErrorComponent,
  ],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @let value = value$ | async;
      @if (value !== null && value !== undefined) {
        @switch (kind()) {
          @case ('lifetimeSpend') {
            <span data-testid="field-kpi">{{
              value | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('avgOrder') {
            <span data-testid="field-kpi">{{
              value | currency: 'USD' : 'symbol' : '1.0-0'
            }}</span>
          }
          @case ('orders') {
            <span data-testid="field-kpi">{{ value }}</span>
          }
          @case ('orderCount') {
            <span class="badge badge-neutral" data-testid="field-kpi">{{
              value
            }}</span>
          }
        }
      }
      @if (failure$ | async; as f) {
        <app-generic-error
          [error]="f.error"
          [showReload]="true"
          (reload)="s.retryOrderStats()"
        />
      }
    </app-spinner-block>
  `,
})
export class VanillaRxjsKpi {
  public readonly customerId = input.required<number>();
  public readonly kind = input.required<
    'lifetimeSpend' | 'orders' | 'avgOrder' | 'orderCount'
  >();

  protected readonly value$ = combineLatest([
    toObservable(this.kind),
    inject(VanillaRxjsConsoleStore).orderStats$,
  ]).pipe(
    map(([kind, stats]) =>
      stats
        ? kind === 'lifetimeSpend'
          ? stats.lifetimeSpend
          : kind === 'avgOrder'
            ? stats.avgOrder
            : stats.orders
        : undefined,
    ),
  );

  protected readonly s = inject(VanillaRxjsConsoleStore);
  /** The orders service failed: the field shows its error with a Reload button. */
  protected readonly failure$ = this.s.orderStatsError$;

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
