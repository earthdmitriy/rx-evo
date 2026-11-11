import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../../content/view-block/view-block.component';
import { fieldError } from '../../../../data/block-state';
import { cacheEntry } from '../../../../data/entity-store';
import { TICKET_COUNT } from '../../../../data/sources';

/** The open-tickets field: a list row, the header KPI and the tab badge of one customer read the same cache entry. */
@Component({
  selector: 'app-signal-store-open-tickets',
  imports: [ViewBlockComponent],
  template: `
    <app-view-block
      class="field-block"
      [loading]="entry().state === 'loading'"
      [error]="fieldError(entry())"
      (retry)="cache.reload(customerId())"
    >
      @let e = entry();
      @if (e.state === 'ready') {
        @let value = e.value.open;
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
    </app-view-block>
  `,
})
export class SignalStoreOpenTickets {
  public readonly customerId = input.required<number>();
  public readonly variant = input<'row' | 'kpi' | 'badge'>('row');

  protected readonly cache = inject(TICKET_COUNT);
  protected readonly entry = cacheEntry(this.cache, this.customerId);
  protected readonly fieldError = fieldError;
}
