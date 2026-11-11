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
import { OracleAgentSection } from './components/agent/agent-section.component';
import { OracleKpi } from './components/customers/customer-detail/fields/kpi/kpi.component';
import { OracleCustomerHeaderSection } from './components/customers/customer-detail/header/customer-header-section.component';
import { OracleActivitySection } from './components/customers/customer-detail/rail/activity/activity-section.component';
import { OracleShipmentsSection } from './components/customers/customer-detail/rail/shipments/shipments-section.component';
import { OracleShipmentTracking } from './components/customers/customer-detail/rail/shipments/shipment-tracking/shipment-tracking.component';
import { OracleCartTotal } from './components/customers/customer-detail/tabs/cart-tab/cart-total/cart-total.component';
import { OracleLineTotal } from './components/customers/customer-detail/tabs/cart-tab/line-total/line-total.component';
import { OracleCustomerTabsSection } from './components/customers/customer-detail/tabs/customer-tabs-section.component';
import { OracleOpenTickets } from './components/customers/fields/open-tickets/open-tickets.component';
import { OracleCustomerListSection } from './components/customers/customer-list/customer-list-section.component';
import { OracleCustomerTier } from './components/customers/customer-list/customer-tier/customer-tier.component';
import { OracleConsoleStore } from './data/console.store';
import { OracleAgentName } from './components/fields/agent-name/agent-name.component';
import { OracleCustomerName } from './components/fields/customer-name/customer-name.component';
import { OracleProductName } from './components/fields/product-name/product-name.component';
import { OracleProductPrice } from './components/fields/product-price/product-price.component';
import { OracleNotificationsSection } from './components/notifications/notifications-section.component';
import { OracleHitAdd } from './components/panels/order-panel/hit-add/hit-add.component';
import { OracleOrderPanelSection } from './components/panels/order-panel/order-panel-section.component';
import { OracleProductStock } from './components/panels/order-panel/product-stock/product-stock.component';
import { OracleTicketPanelSection } from './components/panels/ticket-panel/ticket-panel-section.component';

/**
 * Reference implementation of the support console (test oracle, not a contest
 * entry): the shell. Sign-in or the frame with one section component per
 * region, each with its field components in subfolders (README.md has the tree).
 */
@Component({
  selector: 'app-oracle-console',
  imports: [
    ConsoleFrameComponent,
    ConsoleSignInComponent,
    OracleNotificationsSection,
    OracleAgentSection,
    OracleCustomerListSection,
    OracleCustomerHeaderSection,
    OracleCustomerTabsSection,
    OracleShipmentsSection,
    OracleActivitySection,
    OracleOrderPanelSection,
    OracleTicketPanelSection,
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
        <app-oracle-notifications-section consoleBell />
        <app-oracle-agent-section consoleAgent />

        <app-oracle-customer-list-section consoleList />

        @if (selected(); as customerId) {
          <ng-container consoleMain>
            <app-oracle-customer-header-section [customerId]="customerId" />
            <app-oracle-customer-tabs-section [customerId]="customerId" />
          </ng-container>
        }

        @if (selected(); as customerId) {
          <ng-container consoleRail>
            <app-oracle-shipments-section [customerId]="customerId" />
            <app-oracle-activity-section [customerId]="customerId" />
          </ng-container>
        }

        @if (selected(); as customerId) {
          <ng-container consolePanel>
            <app-oracle-order-panel-section [customerId]="customerId" />
            <app-oracle-ticket-panel-section />
          </ng-container>
        }
      </app-console-frame>
    }
  `,
  providers: [
    { provide: PRODUCT_NAME_FIELD, useValue: OracleProductName },
    { provide: CUSTOMER_TIER_FIELD, useValue: OracleCustomerTier },
    { provide: OPEN_TICKETS_FIELD, useValue: OracleOpenTickets },
    { provide: KPI_FIELD, useValue: OracleKpi },
    { provide: AGENT_NAME_FIELD, useValue: OracleAgentName },
    { provide: CUSTOMER_NAME_FIELD, useValue: OracleCustomerName },
    { provide: SHIPMENT_TRACKING_FIELD, useValue: OracleShipmentTracking },
    { provide: PRODUCT_PRICE_FIELD, useValue: OracleProductPrice },
    { provide: LINE_TOTAL_FIELD, useValue: OracleLineTotal },
    { provide: CART_TOTAL_FIELD, useValue: OracleCartTotal },
    { provide: PRODUCT_STOCK_FIELD, useValue: OracleProductStock },
    { provide: HIT_ADD_FIELD, useValue: OracleHitAdd },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OracleConsoleComponent {
  protected readonly s = inject(OracleConsoleStore);

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
