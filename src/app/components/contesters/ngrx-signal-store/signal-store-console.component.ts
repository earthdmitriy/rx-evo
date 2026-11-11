import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
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
import { SignalStoreAgentSection } from './components/agent/agent-section.component';
import { SignalStoreKpi } from './components/customers/customer-detail/fields/kpi/kpi.component';
import { SignalStoreCustomerHeaderSection } from './components/customers/customer-detail/header/customer-header-section.component';
import { SignalStoreActivitySection } from './components/customers/customer-detail/rail/activity/activity-section.component';
import { SignalStoreShipmentsSection } from './components/customers/customer-detail/rail/shipments/shipments-section.component';
import { SignalStoreShipmentTracking } from './components/customers/customer-detail/rail/shipments/shipment-tracking/shipment-tracking.component';
import { SignalStoreCartTotal } from './components/customers/customer-detail/tabs/cart-tab/cart-total/cart-total.component';
import { SignalStoreLineTotal } from './components/customers/customer-detail/tabs/cart-tab/line-total/line-total.component';
import { SignalStoreCustomerTabsSection } from './components/customers/customer-detail/tabs/customer-tabs-section.component';
import { SignalStoreOpenTickets } from './components/customers/fields/open-tickets/open-tickets.component';
import { SignalStoreCustomerListSection } from './components/customers/customer-list/customer-list-section.component';
import { SignalStoreCustomerTier } from './components/customers/customer-list/customer-tier/customer-tier.component';
import { Auth } from './data/auth';
import { UI_STATE } from './data/ui-state';
import { SignalStoreAgentName } from './components/fields/agent-name/agent-name.component';
import { SignalStoreCustomerName } from './components/fields/customer-name/customer-name.component';
import { SignalStoreProductName } from './components/fields/product-name/product-name.component';
import { SignalStoreProductPrice } from './components/fields/product-price/product-price.component';
import { SignalStoreNotificationsSection } from './components/notifications/notifications-section.component';
import { SignalStoreHitAdd } from './components/panels/order-panel/hit-add/hit-add.component';
import { SignalStoreOrderPanelSection } from './components/panels/order-panel/order-panel-section.component';
import { SignalStoreProductStock } from './components/panels/order-panel/product-stock/product-stock.component';
import { SignalStoreTicketPanelSection } from './components/panels/ticket-panel/ticket-panel-section.component';

/**
 * Contest entry: NgRx SignalStore. The shell. Sign-in or the frame with one
 * section component per region, each with its field components in
 * subfolders (README.md has the tree).
 */
@Component({
  selector: 'app-signal-store-console',
  imports: [
    ConsoleFrameComponent,
    ConsoleSignInComponent,
    SignalStoreNotificationsSection,
    SignalStoreAgentSection,
    SignalStoreCustomerListSection,
    SignalStoreCustomerHeaderSection,
    SignalStoreCustomerTabsSection,
    SignalStoreShipmentsSection,
    SignalStoreActivitySection,
    SignalStoreOrderPanelSection,
    SignalStoreTicketPanelSection,
  ],
  template: `
    @if (!ui.signedIn()) {
      <app-console-sign-in
        [state]="auth.login.state()"
        (signIn)="auth.signIn($event)"
      />
    } @else {
      <app-console-frame
        [customerSelected]="ui.selected() !== null"
        (logout)="auth.signOut()"
      >
        <app-signal-store-notifications-section consoleBell />
        <app-signal-store-agent-section consoleAgent />

        <app-signal-store-customer-list-section consoleList />

        @if (ui.selected(); as customerId) {
          <ng-container consoleMain>
            <app-signal-store-customer-header-section
              [customerId]="customerId"
            />
            <app-signal-store-customer-tabs-section [customerId]="customerId" />
          </ng-container>
        }

        @if (ui.selected(); as customerId) {
          <ng-container consoleRail>
            <app-signal-store-shipments-section [customerId]="customerId" />
            <app-signal-store-activity-section [customerId]="customerId" />
          </ng-container>
        }

        @if (ui.selected(); as customerId) {
          <ng-container consolePanel>
            <app-signal-store-order-panel-section [customerId]="customerId" />
            <app-signal-store-ticket-panel-section />
          </ng-container>
        }
      </app-console-frame>
    }
  `,
  providers: [
    { provide: PRODUCT_NAME_FIELD, useValue: SignalStoreProductName },
    { provide: CUSTOMER_TIER_FIELD, useValue: SignalStoreCustomerTier },
    { provide: OPEN_TICKETS_FIELD, useValue: SignalStoreOpenTickets },
    { provide: KPI_FIELD, useValue: SignalStoreKpi },
    { provide: AGENT_NAME_FIELD, useValue: SignalStoreAgentName },
    { provide: CUSTOMER_NAME_FIELD, useValue: SignalStoreCustomerName },
    { provide: SHIPMENT_TRACKING_FIELD, useValue: SignalStoreShipmentTracking },
    { provide: PRODUCT_PRICE_FIELD, useValue: SignalStoreProductPrice },
    { provide: LINE_TOTAL_FIELD, useValue: SignalStoreLineTotal },
    { provide: CART_TOTAL_FIELD, useValue: SignalStoreCartTotal },
    { provide: PRODUCT_STOCK_FIELD, useValue: SignalStoreProductStock },
    { provide: HIT_ADD_FIELD, useValue: SignalStoreHitAdd },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalStoreConsoleComponent {
  protected readonly ui = inject(UI_STATE);
  protected readonly auth = inject(Auth);

  constructor() {
    // the bell is rebuilt closed when the page is shown again
    inject(DestroyRef).onDestroy(() => this.ui.setNotificationsOpen(false));
  }
}
