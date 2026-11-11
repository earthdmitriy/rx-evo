import { Component, computed, inject, input, untracked } from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../content/resource-block/resource-block.component';
import { Bus } from '../../../../data/bus';
import { TicketCountsRegistry } from '../../../../data/ticket-counts.registry';

/** The open-tickets field: its own request, one id per call (R-L10's documented gap) — a list row, the header KPI and the tab badge of the same customer each ask separately. */
@Component({
  selector: 'app-resources-open-tickets',
  imports: [ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res()">
      @if (ticketCount(); as tc) {
        @let value = tc.open;
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
    </app-resource-block>
  `,
})
export class ResourcesOpenTickets {
  public readonly customerId = input.required<number>();
  public readonly variant = input<'row' | 'kpi' | 'badge'>('row');

  private readonly bus = inject(Bus);
  private readonly registry = inject(TicketCountsRegistry);
  /** The customer's open-ticket count at the current version: the session's shared resource. */
  protected readonly res = computed(() => {
    const id = this.customerId();
    const v = this.bus.ticketCounts();
    return untracked(() => this.registry.ticketCount(id, v));
  });
  protected readonly ticketCount = computed(() => {
    const r = this.res();
    return r.hasValue() ? r.value() : undefined;
  });
}
