import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConsoleFrameComponent } from '../shared';
import { ResourcesAgentSection } from './components/agent/agent-section.component';
import { ResourcesCustomerHeaderSection } from './components/customers/customer-detail/header/customer-header-section.component';
import { ResourcesActivitySection } from './components/customers/customer-detail/rail/activity/activity-section.component';
import { ResourcesShipmentsSection } from './components/customers/customer-detail/rail/shipments/shipments-section.component';
import { ResourcesCustomerTabsSection } from './components/customers/customer-detail/tabs/customer-tabs-section.component';
import { ResourcesCustomerListSection } from './components/customers/customer-list/customer-list-section.component';
import { ResourcesNotificationsSection } from './components/notifications/notifications-section.component';
import { ResourcesOrderPanelSection } from './components/panels/order-panel/order-panel-section.component';
import { ResourcesTicketPanelSection } from './components/panels/ticket-panel/ticket-panel-section.component';
import { Auth } from './data/auth';
import { CartPricesRegistry } from './data/cart-prices.registry';
import { ActivityRegistry } from './data/activity.registry';
import { CartRegistry } from './data/cart.registry';
import { CustomerListRegistry } from './data/customer-list.registry';
import { TiersRegistry } from './data/tiers.registry';
import { CustomersRegistry } from './data/customers.registry';
import { OrderStatsRegistry } from './data/order-stats.registry';
import { TicketCountsRegistry } from './data/ticket-counts.registry';
import { PricesRegistry } from './data/prices.registry';
import { ProductsRegistry } from './data/products.registry';
import { StockRegistry } from './data/stock.registry';
import { OrdersRegistry } from './data/orders.registry';
import { UiState } from './data/ui-state';

/**
 * The signed-in frame. It provides the shared resources of the session: they
 * are created by the first component that asks for them, and this component's
 * injector (and so they) is destroyed on sign-out.
 */
@Component({
  selector: 'app-resources-signed-in',
  imports: [
    ConsoleFrameComponent,
    ResourcesNotificationsSection,
    ResourcesAgentSection,
    ResourcesCustomerListSection,
    ResourcesCustomerHeaderSection,
    ResourcesCustomerTabsSection,
    ResourcesShipmentsSection,
    ResourcesActivitySection,
    ResourcesOrderPanelSection,
    ResourcesTicketPanelSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    ActivityRegistry,
    CustomerListRegistry,
    TiersRegistry,
    CartRegistry,
    CartPricesRegistry,
    CustomersRegistry,
    OrdersRegistry,
    OrderStatsRegistry,
    TicketCountsRegistry,
    ProductsRegistry,
    PricesRegistry,
    StockRegistry,
  ],
  template: `
    <app-console-frame
      [customerSelected]="ui.selected() !== null"
      (logout)="auth.signOut()"
    >
      <app-resources-notifications-section consoleBell />
      <app-resources-agent-section consoleAgent />

      <app-resources-customer-list-section consoleList />

      @if (ui.selected(); as customerId) {
        <ng-container consoleMain>
          <app-resources-customer-header-section [customerId]="customerId" />
          <app-resources-customer-tabs-section [customerId]="customerId" />
        </ng-container>
      }

      @if (ui.selected(); as customerId) {
        <ng-container consoleRail>
          <app-resources-shipments-section [customerId]="customerId" />
          <app-resources-activity-section [customerId]="customerId" />
        </ng-container>
      }

      @if (ui.selected(); as customerId) {
        <ng-container consolePanel>
          <app-resources-order-panel-section [customerId]="customerId" />
          <app-resources-ticket-panel-section />
        </ng-container>
      }
    </app-console-frame>
  `,
})
export class ResourcesSignedInComponent {
  protected readonly ui = inject(UiState);
  protected readonly auth = inject(Auth);
}
