import { DatePipe, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { ActivityVm, OrderStatusVm } from './view-models';
import { PRODUCT_NAME_FIELD, SHIPMENT_TRACKING_FIELD } from './fields';

/** One in-flight order in S9; its tracking is a field component by order id (`SHIPMENT_TRACKING_FIELD`, the shipment service). */
export type ShipmentRow = {
  orderId: string;
  status: OrderStatusVm;
};

/** S9: in-flight orders, each with its own tracking. */
@Component({
  selector: 'app-console-shipments',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'card block',
    'data-testid': 'shipments',
    '[attr.data-content]':
      'rows() === null ? "none" : rows()!.length ? "shown" : "empty"',
  },
  template: `
    <header class="card-header">
      <h3 class="card-title">Shipments in transit</h3>
    </header>
    <div data-part="main">
      <ul [attr.data-customer-id]="customerId()">
        @for (r of rows() ?? []; track r.orderId) {
          <li
            class="border-t border-slate-100 px-4 py-3 first:border-t-0"
            [attr.data-testid]="'shipment-' + r.orderId"
            [attr.data-order-id]="r.orderId"
          >
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="font-mono text-xs font-medium text-indigo-600 hover:text-indigo-500"
                (click)="openOrder.emit(r.orderId)"
              >
                {{ r.orderId }}
              </button>
              <span class="text-xs text-slate-500">{{ r.status }}</span>
            </div>
            <div class="mt-1 block min-h-8" data-testid="shipment-tracking">
              <ng-container
                *ngComponentOutlet="
                  trackingField;
                  inputs: { orderId: r.orderId }
                "
              />
            </div>
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
  /** Shows the tracking of an order's shipment (shipment service): supplied by the implementation (`SHIPMENT_TRACKING_FIELD`). */
  protected readonly trackingField = inject(SHIPMENT_TRACKING_FIELD);
  public readonly customerId = input<number | null>(null);
  public readonly openOrder = output<string>();
}

/** S10: the customer's recent activity (polled). Each entry is a kind and a reference; the sentence is written here, a viewed product with its name from the product name field (the sentence is empty until the name arrives). */
@Component({
  selector: 'app-console-activity',
  imports: [DatePipe, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'card block',
    'data-testid': 'activity',
    '[attr.data-content]':
      'entries() === null ? "none" : entries()!.length ? "shown" : "empty"',
  },
  template: `
    <header class="card-header">
      <h3 class="card-title">Recent activity</h3>
    </header>
    <div data-part="main">
      <ol class="space-y-3 p-4" [attr.data-customer-id]="customerId()">
        @for (a of entries() ?? []; track $index) {
          <li class="flex gap-3" data-testid="activity-entry">
            <span
              class="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300"
            ></span>
            <div>
              <div
                class="min-h-5 text-sm text-slate-700"
                data-testid="activity-text"
              >
                {{ sentence(a) }}
                @if (a.kind === 'product-viewed') {
                  <ng-container
                    *ngComponentOutlet="
                      productName;
                      inputs: { sku: a.refId, prefix: 'Viewed ' }
                    "
                  />
                }
              </div>
              <div class="text-xs text-slate-500">
                {{ a.at | date: 'MMM d, HH:mm' }}
              </div>
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
  public readonly entries = input<ActivityVm[] | null>(null);
  /** Shows the product name by sku: supplied by the implementation (`PRODUCT_NAME_FIELD`). */
  protected readonly productName = inject(PRODUCT_NAME_FIELD);
  public readonly customerId = input<number | null>(null);

  protected sentence(a: ActivityVm): string {
    switch (a.kind) {
      case 'order-placed':
        return `Placed order ${a.refId}`;
      case 'order-changed':
        return `Changed order ${a.refId}`;
      case 'order-delivered':
        return `Order ${a.refId} delivered`;
      case 'ticket-opened':
        return `Opened ticket ${a.refId}`;
      case 'product-viewed':
        return ''; // "Viewed <name>" is rendered by the product name field, with the prefix
    }
  }
}
