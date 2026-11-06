import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PartComponent } from './part.component';
import { ActivityVm, OrderStatusVm, Part, ShipmentVm } from './view-models';

/** One in-flight order in S9; its tracking is a `Part` from the shipment service. */
export type ShipmentRow = {
  orderId: string;
  status: OrderStatusVm;
  shipment: Part<ShipmentVm>;
};

/** S9: in-flight orders, each with its own tracking (partial failure). */
@Component({
  selector: 'app-console-shipments',
  imports: [PartComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card block', 'data-testid': 'shipments', '[attr.data-content]': 'rows() === null ? "none" : rows()!.length ? "shown" : "empty"' },
  template: `
    <header class="card-header"><h3 class="card-title">Shipments in transit</h3></header>
    <div data-part="main">
      <ul [attr.data-customer-id]="customerId()">
        @for (r of rows() ?? []; track r.orderId) {
          <li class="border-t border-slate-100 px-4 py-3 first:border-t-0" [attr.data-testid]="'shipment-' + r.orderId" [attr.data-order-id]="r.orderId">
            <div class="flex items-center gap-2">
              <button type="button" class="font-mono text-xs font-medium text-indigo-600 hover:text-indigo-500" (click)="openOrder.emit(r.orderId)">{{ r.orderId }}</button>
              <span class="text-xs text-slate-500">{{ r.status }}</span>
            </div>
            <app-part class="mt-1 block" [part]="r.shipment" [width]="12" errorText="Tracking unavailable" [retryable]="true" (retry)="retryRow.emit(r.orderId)">
              @if (r.shipment.value; as s) {
                <div class="flex items-center gap-2">
                  <span class="badge" [class]="s.state === 'Delayed' ? 'badge-warn' : s.state === 'In transit' ? 'badge-info' : 'badge-neutral'">{{ s.state }}</span>
                  <span class="ml-auto text-xs whitespace-nowrap text-slate-500">ETA {{ s.eta | date: 'MMM d' }}</span>
                </div>
                <div class="mt-1 truncate text-xs text-slate-500">{{ s.carrier }} · {{ s.lastScan }}</div>
              }
            </app-part>
          </li>
        }
      </ul>
      @if (rows() && !rows()!.length) {
        <div class="empty-state">Nothing on the way.</div>
      }
    </div>
  `,
})
export class ConsoleShipmentsComponent {
  public readonly rows = input<ShipmentRow[] | null>(null);
  public readonly customerId = input<number | null>(null);
  public readonly openOrder = output<string>();
  // @s2-begin
  /** Retry on a row whose tracking failed. */
  public readonly retryRow = output<string>();
  // @s2-end
}

/** S10: the customer's recent activity (polled). Each entry's text is a `Part`: it may need the product, order or ticket it refers to. */
@Component({
  selector: 'app-console-activity',
  imports: [PartComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card block', 'data-testid': 'activity', '[attr.data-content]': 'entries() === null ? "none" : entries()!.length ? "shown" : "empty"' },
  template: `
    <header class="card-header"><h3 class="card-title">Recent activity</h3></header>
    <div data-part="main">
      <ol class="space-y-3 p-4" [attr.data-customer-id]="customerId()">
        @for (a of entries() ?? []; track $index) {
          <li class="flex gap-3" data-testid="activity-entry">
            <span class="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300"></span>
            <div>
              <div class="text-sm text-slate-700"><app-part (retry)="retryParts.emit()" [part]="a.text" [width]="10">{{ a.text.value }}</app-part></div>
              <div class="text-xs text-slate-500">{{ a.at | date: 'MMM d, HH:mm' }}</div>
            </div>
          </li>
        }
      </ol>
      @if (entries() && !entries()!.length) {
        <div class="empty-state">No recent activity.</div>
      }
    </div>
  `,
})
export class ConsoleActivityComponent {
  // @s2-begin
  /** A failed `Part` of this view asked to be tried again. */
  public readonly retryParts = output<void>();
  // @s2-end
  public readonly entries = input<ActivityVm[] | null>(null);
  public readonly customerId = input<number | null>(null);
}
