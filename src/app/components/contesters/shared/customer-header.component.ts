import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PartComponent } from './part.component';
import { CustomerHeaderVm, KpisVm, Part } from './view-models';

/**
 * S4: the selected customer's profile and KPIs. Each KPI is a `Part` from
 * its own service and shows whatever the profile's state.
 * ✕ (clear) works in every state.
 */
@Component({
  selector: 'app-console-customer-header',
  imports: [PartComponent, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card relative block', 'data-testid': 'customer-header', '[attr.data-content]': 'customer()?.state === "ready" ? "shown" : "none"' },
  template: `
    <button type="button" class="btn btn-ghost btn-icon absolute top-3 right-3 z-20" data-testid="clear-customer" aria-label="Close customer" (click)="clear.emit()">✕</button>
    <app-part class="block" data-testid="customer-profile" [part]="customer() ?? loading" [width]="14" errorText="Profile unavailable" [retryable]="true" (retry)="retryProfile.emit()">
    @if (customer()?.value; as c) {
      <div [attr.data-customer-id]="c.customerId">
        <div class="flex flex-wrap items-start gap-4 p-5 pr-14">
          <span class="inline-flex size-12 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold text-indigo-700">{{ c.initials }}</span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold text-slate-900" data-testid="customer-name">{{ c.name }}</h2>
              <span class="badge" [class]="c.tier === 'VIP' ? 'badge-accent' : c.tier === 'New' ? 'badge-info' : 'badge-neutral'">{{ c.tier }}</span>
              <span class="code-chip">#{{ c.customerId }}</span>
            </div>
            <div class="mt-0.5 text-sm text-slate-500">{{ c.email }} · {{ c.city }} · customer since {{ c.since | date: 'MMM y' }}</div>
          </div>
        </div>
      </div>
    }
    </app-part>
    @if (kpis(); as k) {
      <dl class="grid grid-cols-2 border-t border-slate-200 @2xl:grid-cols-4" [attr.data-customer-id]="customer()?.value?.customerId ?? null">
        <div class="px-5 py-3">
          <dt class="section-title">Lifetime spend</dt>
          <dd class="mt-1 text-xl font-semibold text-slate-900 tabular-nums" data-testid="kpi-spend">
            <app-part (retry)="retryParts.emit()" [part]="k.lifetimeSpend" [width]="5">{{ k.lifetimeSpend.value | currency: 'USD' : 'symbol' : '1.0-0' }}</app-part>
          </dd>
        </div>
        <div class="px-5 py-3">
          <dt class="section-title">Orders</dt>
          <dd class="mt-1 text-xl font-semibold text-slate-900 tabular-nums" data-testid="kpi-orders">
            <app-part (retry)="retryParts.emit()" [part]="k.orders" [width]="2">{{ k.orders.value }}</app-part>
          </dd>
        </div>
        <div class="px-5 py-3">
          <dt class="section-title">Avg order</dt>
          <dd class="mt-1 text-xl font-semibold text-slate-900 tabular-nums" data-testid="kpi-avg">
            <app-part (retry)="retryParts.emit()" [part]="k.avgOrder" [width]="4">{{ k.avgOrder.value | currency: 'USD' : 'symbol' : '1.0-0' }}</app-part>
          </dd>
        </div>
        <div class="px-5 py-3">
          <dt class="section-title">Open tickets</dt>
          <dd class="mt-1 text-xl font-semibold text-slate-900 tabular-nums" data-testid="kpi-open-tickets">
            <app-part (retry)="retryParts.emit()" [part]="k.openTickets" [width]="2">{{ k.openTickets.value }}</app-part>
          </dd>
        </div>
      </dl>
    }
  `,
})
export class ConsoleCustomerHeaderComponent {
  // @s2-begin
  /** A failed `Part` of this view asked to be tried again. */
  public readonly retryParts = output<void>();
  // @s2-end
  /** The profile, from its own service; null before it is requested. */
  public readonly customer = input<Part<CustomerHeaderVm> | null>(null);
  protected readonly loading: Part<CustomerHeaderVm> = { state: 'loading', value: null };
  /** KPIs, each from its own service; null hides the strip. */
  public readonly kpis = input<KpisVm | null>(null);
  public readonly clear = output<void>();
  // @s2-begin
  /** Retry on the profile after its failure (the KPIs work meanwhile). */
  public readonly retryProfile = output<void>();
  // @s2-end

}
