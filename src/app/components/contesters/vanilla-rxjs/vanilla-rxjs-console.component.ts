import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AGENT_NAME_FIELD,
  CART_TOTAL_FIELD,
  ConsoleFrameComponent,
  ConsoleSignInComponent,
  CUSTOMER_NAME_FIELD,
  CUSTOMER_TIER_FIELD,
  HIT_ADD_FIELD,
  KPI_FIELD,
  LINE_TOTAL_FIELD,
  OPEN_TICKETS_FIELD,
  PRODUCT_NAME_FIELD,
  PRODUCT_PRICE_FIELD,
  PRODUCT_STOCK_FIELD,
  SHIPMENT_TRACKING_FIELD,
} from '../shared';
import { VanillaRxjsAgentSection } from './components/agent/agent-section.component';
import { VanillaRxjsKpi } from './components/customers/customer-detail/fields/kpi/kpi.component';
import { VanillaRxjsCustomerHeaderSection } from './components/customers/customer-detail/header/customer-header-section.component';
import { VanillaRxjsActivitySection } from './components/customers/customer-detail/rail/activity/activity-section.component';
import { VanillaRxjsShipmentsSection } from './components/customers/customer-detail/rail/shipments/shipments-section.component';
import { VanillaRxjsShipmentTracking } from './components/customers/customer-detail/rail/shipments/shipment-tracking/shipment-tracking.component';
import { VanillaRxjsCartTotal } from './components/customers/customer-detail/tabs/cart-tab/cart-total/cart-total.component';
import { VanillaRxjsLineTotal } from './components/customers/customer-detail/tabs/cart-tab/line-total/line-total.component';
import { VanillaRxjsCustomerTabsSection } from './components/customers/customer-detail/tabs/customer-tabs-section.component';
import { VanillaRxjsOpenTickets } from './components/customers/fields/open-tickets/open-tickets.component';
import { VanillaRxjsCustomerListSection } from './components/customers/customer-list/customer-list-section.component';
import { VanillaRxjsCustomerTier } from './components/customers/customer-list/customer-tier/customer-tier.component';
import { VanillaRxjsConsoleStore } from './data/console.store';
import { VanillaRxjsAgentName } from './components/fields/agent-name/agent-name.component';
import { VanillaRxjsCustomerName } from './components/fields/customer-name/customer-name.component';
import { VanillaRxjsProductName } from './components/fields/product-name/product-name.component';
import { VanillaRxjsProductPrice } from './components/fields/product-price/product-price.component';
import { VanillaRxjsNotificationsSection } from './components/notifications/notifications-section.component';
import { VanillaRxjsHitAdd } from './components/panels/order-panel/hit-add/hit-add.component';
import { VanillaRxjsOrderPanelSection } from './components/panels/order-panel/order-panel-section.component';
import { VanillaRxjsProductStock } from './components/panels/order-panel/product-stock/product-stock.component';
import { VanillaRxjsTicketPanelSection } from './components/panels/ticket-panel/ticket-panel-section.component';

/**
 * Reference implementation of the support console (test vanilla-rxjs, not a contest
 * entry): the shell. Sign-in or the frame with one section component per
 * region, each with its field components in subfolders (README.md has the tree).
 */
@Component({
  selector: 'app-vanilla-rxjs-console',
  imports: [
    ConsoleFrameComponent,
    ConsoleSignInComponent,
    VanillaRxjsNotificationsSection,
    VanillaRxjsAgentSection,
    VanillaRxjsCustomerListSection,
    VanillaRxjsCustomerHeaderSection,
    VanillaRxjsCustomerTabsSection,
    VanillaRxjsShipmentsSection,
    VanillaRxjsActivitySection,
    VanillaRxjsOrderPanelSection,
    VanillaRxjsTicketPanelSection,
  ],
  template: `
    @if (!signedIn()) {
      <app-console-sign-in
        [state]="login()"
        (signIn)="s.login($event.email, $event.password)"
      />
    } @else {
      <app-console-frame
        [customerSelected]="selected() !== null"
        (logout)="s.logout()"
      >
        <app-vanilla-rxjs-notifications-section consoleBell />
        <app-vanilla-rxjs-agent-section consoleAgent />

        <app-vanilla-rxjs-customer-list-section consoleList />

        @if (selected(); as customerId) {
          <ng-container consoleMain>
            <app-vanilla-rxjs-customer-header-section
              [customerId]="customerId"
            />
            <app-vanilla-rxjs-customer-tabs-section [customerId]="customerId" />
          </ng-container>
        }

        @if (selected(); as customerId) {
          <ng-container consoleRail>
            <app-vanilla-rxjs-shipments-section [customerId]="customerId" />
            <app-vanilla-rxjs-activity-section [customerId]="customerId" />
          </ng-container>
        }

        @if (selected(); as customerId) {
          <ng-container consolePanel>
            <app-vanilla-rxjs-order-panel-section [customerId]="customerId" />
            <app-vanilla-rxjs-ticket-panel-section />
          </ng-container>
        }
      </app-console-frame>
    }
  `,
  providers: [
    { provide: PRODUCT_NAME_FIELD, useValue: VanillaRxjsProductName },
    { provide: CUSTOMER_TIER_FIELD, useValue: VanillaRxjsCustomerTier },
    { provide: OPEN_TICKETS_FIELD, useValue: VanillaRxjsOpenTickets },
    { provide: KPI_FIELD, useValue: VanillaRxjsKpi },
    { provide: AGENT_NAME_FIELD, useValue: VanillaRxjsAgentName },
    { provide: CUSTOMER_NAME_FIELD, useValue: VanillaRxjsCustomerName },
    { provide: SHIPMENT_TRACKING_FIELD, useValue: VanillaRxjsShipmentTracking },
    { provide: PRODUCT_PRICE_FIELD, useValue: VanillaRxjsProductPrice },
    { provide: LINE_TOTAL_FIELD, useValue: VanillaRxjsLineTotal },
    { provide: CART_TOTAL_FIELD, useValue: VanillaRxjsCartTotal },
    { provide: PRODUCT_STOCK_FIELD, useValue: VanillaRxjsProductStock },
    { provide: HIT_ADD_FIELD, useValue: VanillaRxjsHitAdd },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VanillaRxjsConsoleComponent {
  protected readonly s = inject(VanillaRxjsConsoleStore);

  constructor() {
    // the bell is rebuilt closed when the page is shown again
    inject(DestroyRef).onDestroy(() => this.s.notificationsOpen$.next(false));
  }

  protected readonly signedIn = toSignal(this.s.signedIn$, {
    requireSync: true,
  });
  protected readonly login = toSignal(this.s.login$, { requireSync: true });
  protected readonly selected = toSignal(this.s.selected$, {
    requireSync: true,
  });
}
