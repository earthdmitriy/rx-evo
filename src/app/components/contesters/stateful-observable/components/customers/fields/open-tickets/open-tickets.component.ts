import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../../content/stateful-block/stateful-block.component';
import { map } from 'rxjs';
import { OPEN_TICKETS_BY_CUSTOMER } from '../../../../sources/lookups';

/**
 * The open-tickets field: the skeleton (`contesters/skeleton`) with its TODO
 * props filled. The customer id is the input of a projection of the shared
 * factory, so a list row, the header KPI and the tab badge of one customer read
 * the same entry, and a write that reloads it refreshes all of them.
 */
@Component({
  selector: 'app-open-tickets',
  imports: [AsyncPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="tickets">
      @let value = tickets.value$ | async;
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
    </app-stateful-block>
  `,
})
export class OpenTicketsComponent {
  public readonly customerId = input.required<number>();
  public readonly variant = input<'row' | 'kpi' | 'badge'>('row');

  protected readonly tickets = inject(OPEN_TICKETS_BY_CUSTOMER)
    .project(toObservable(this.customerId))
    .pipeValue(map((entry) => entry.open));
}
