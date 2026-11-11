import { DatePipe, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { KPI_FIELD, OPEN_TICKETS_FIELD } from './fields';
import { CustomerHeaderVm } from './view-models';

/**
 * S4: the selected customer's profile and KPIs. The KPIs are field components
 * by customer id (`KPI_FIELD`, `OPEN_TICKETS_FIELD`), each empty until its value
 * arrives (an empty space of its width). ✕ (clear) works in every state.
 */
@Component({
  selector: 'app-console-customer-header',
  imports: [DatePipe, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'card relative block',
    'data-testid': 'customer-header',
    '[attr.data-content]': 'customer() ? "shown" : "none"',
  },
  template: `
    <button
      type="button"
      class="btn btn-ghost btn-icon absolute top-3 right-3 z-20"
      data-testid="clear-customer"
      aria-label="Close customer"
      (click)="clear.emit()"
    >
      ✕
    </button>
    <div class="block" data-testid="customer-profile">
      @if (customer(); as c) {
        <div [attr.data-customer-id]="c.customerId">
          <div class="flex flex-wrap items-start gap-4 p-5 pr-14">
            <span
              class="inline-flex size-12 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold text-indigo-700"
              >{{ c.initials }}</span
            >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2
                  class="text-lg font-semibold text-slate-900"
                  data-testid="customer-name"
                >
                  {{ c.name }}
                </h2>
                <span
                  class="badge"
                  [class]="
                    c.tier === 'VIP'
                      ? 'badge-accent'
                      : c.tier === 'New'
                        ? 'badge-info'
                        : 'badge-neutral'
                  "
                  >{{ c.tier }}</span
                >
                <span class="code-chip">#{{ c.customerId }}</span>
              </div>
              <div class="mt-0.5 text-sm text-slate-500">
                {{ c.email }} · {{ c.city }} · customer since
                {{ c.since | date: 'MMM y' }}
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="h-20"></div>
      }
    </div>
    <dl
      class="grid grid-cols-2 border-t border-slate-200 @2xl:grid-cols-4"
      [attr.data-customer-id]="customer()?.customerId ?? null"
    >
      <div class="px-5 py-3">
        <dt class="section-title">Lifetime spend</dt>
        <dd
          class="mt-1 min-h-7 text-xl font-semibold text-slate-900 tabular-nums"
          data-testid="kpi-spend"
        >
          @if (customerId() !== null) {
            <ng-container
              *ngComponentOutlet="
                kpi;
                inputs: { customerId: customerId()!, kind: 'lifetimeSpend' }
              "
            />
          }
        </dd>
      </div>
      <div class="px-5 py-3">
        <dt class="section-title">Orders</dt>
        <dd
          class="mt-1 min-h-7 text-xl font-semibold text-slate-900 tabular-nums"
          data-testid="kpi-orders"
        >
          @if (customerId() !== null) {
            <ng-container
              *ngComponentOutlet="
                kpi;
                inputs: { customerId: customerId()!, kind: 'orders' }
              "
            />
          }
        </dd>
      </div>
      <div class="px-5 py-3">
        <dt class="section-title">Avg order</dt>
        <dd
          class="mt-1 min-h-7 text-xl font-semibold text-slate-900 tabular-nums"
          data-testid="kpi-avg"
        >
          @if (customerId() !== null) {
            <ng-container
              *ngComponentOutlet="
                kpi;
                inputs: { customerId: customerId()!, kind: 'avgOrder' }
              "
            />
          }
        </dd>
      </div>
      <div class="px-5 py-3">
        <dt class="section-title">Open tickets</dt>
        <dd
          class="mt-1 min-h-7 text-xl font-semibold text-slate-900 tabular-nums"
          data-testid="kpi-open-tickets"
        >
          @if (customerId() !== null) {
            <ng-container
              *ngComponentOutlet="
                openTicketsField;
                inputs: { customerId: customerId()!, variant: 'kpi' }
              "
            />
          }
        </dd>
      </div>
    </dl>
  `,
})
export class ConsoleCustomerHeaderComponent {
  /** The profile, from its own service; null before it is requested. */
  public readonly customer = input<CustomerHeaderVm | null>(null);
  /** The selected customer: the KPIs are looked up by it, whether or not the profile has arrived. */
  public readonly customerId = input<number | null>(null);
  /** Shows one KPI of the orders service: supplied by the implementation (`KPI_FIELD`). */
  protected readonly kpi = inject(KPI_FIELD);
  /** Shows the open tickets (tickets service): supplied by the implementation (`OPEN_TICKETS_FIELD`). */
  protected readonly openTicketsField = inject(OPEN_TICKETS_FIELD);
  public readonly clear = output<void>();
}
