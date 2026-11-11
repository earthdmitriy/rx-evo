import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../../content/spinner-block/spinner-block.component';
import { OracleConsoleStore } from '../../../../data/console.store';

/**
 * The reference's open tickets field: the skeleton with its TODO props filled.
 * A row reads the tickets service's answer for the shown page, the KPI and the
 * tab badge the one for the selected customer (both from the store).
 */
@Component({
  selector: 'app-oracle-open-tickets',
  imports: [AsyncPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @let value = value$ | async;
      @if (value !== null && value !== undefined) {
        @switch (variant()) {
          @case ('row') {
            @if (value > 0) {
              <span
                class="badge badge-bad"
                data-testid="field-open-tickets"
                [title]="value + ' open tickets'"
                >{{ value }}</span
              >
            } @else {
              <span
                class="text-xs text-slate-300"
                data-testid="field-open-tickets"
                >0</span
              >
            }
          }
          @case ('kpi') {
            <span data-testid="field-open-tickets">{{ value }}</span>
          }
          @case ('badge') {
            <span
              class="badge badge-neutral"
              data-testid="field-open-tickets"
              >{{ value }}</span
            >
          }
        }
      }
    </app-spinner-block>
  `,
})
export class OracleOpenTickets {
  public readonly customerId = input.required<number>();
  public readonly variant = input<'row' | 'kpi' | 'badge'>('row');

  private readonly store = inject(OracleConsoleStore);
  protected readonly value$ = combineLatest([
    toObservable(this.customerId),
    toObservable(this.variant),
    this.store.openTicketsOfPage$,
    this.store.openTickets$,
  ]).pipe(
    map(([id, variant, page, selected]) =>
      variant === 'row' ? page[id] : (selected ?? undefined),
    ),
  );

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
