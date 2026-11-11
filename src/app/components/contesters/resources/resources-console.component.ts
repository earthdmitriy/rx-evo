import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import {
  AGENT_NAME_FIELD,
  CART_TOTAL_FIELD,
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
import { ResourcesKpi } from './components/customers/customer-detail/fields/kpi/kpi.component';
import { ResourcesShipmentTracking } from './components/customers/customer-detail/rail/shipments/shipment-tracking/shipment-tracking.component';
import { ResourcesCartTotal } from './components/customers/customer-detail/tabs/cart-tab/cart-total/cart-total.component';
import { ResourcesLineTotal } from './components/customers/customer-detail/tabs/cart-tab/line-total/line-total.component';
import { ResourcesOpenTickets } from './components/customers/fields/open-tickets/open-tickets.component';
import { ResourcesCustomerTier } from './components/customers/customer-list/customer-tier/customer-tier.component';
import { ResourcesAgentName } from './components/fields/agent-name/agent-name.component';
import { ResourcesCustomerName } from './components/fields/customer-name/customer-name.component';
import { ResourcesProductName } from './components/fields/product-name/product-name.component';
import { ResourcesProductPrice } from './components/fields/product-price/product-price.component';
import { ResourcesHitAdd } from './components/panels/order-panel/hit-add/hit-add.component';
import { ResourcesProductStock } from './components/panels/order-panel/product-stock/product-stock.component';
import { Auth } from './data/auth';
import { UiState } from './data/ui-state';
import { ResourcesSignedInComponent } from './resources-signed-in.component';

/**
 * Contest entry: Signals + `resource()`/`rxResource()`. The shell. Sign-in or
 * the frame with one section component per region, each with its field
 * components in subfolders (README.md has the tree).
 */
@Component({
  selector: 'app-resources-console',
  imports: [ConsoleSignInComponent, ResourcesSignedInComponent],
  template: `
    @if (!ui.signedIn()) {
      <app-console-sign-in
        [state]="auth.login.state()"
        (signIn)="auth.signIn($event)"
      />
    } @else {
      <app-resources-signed-in />
    }
  `,
  providers: [
    { provide: PRODUCT_NAME_FIELD, useValue: ResourcesProductName },
    { provide: CUSTOMER_TIER_FIELD, useValue: ResourcesCustomerTier },
    { provide: OPEN_TICKETS_FIELD, useValue: ResourcesOpenTickets },
    { provide: KPI_FIELD, useValue: ResourcesKpi },
    { provide: AGENT_NAME_FIELD, useValue: ResourcesAgentName },
    { provide: CUSTOMER_NAME_FIELD, useValue: ResourcesCustomerName },
    { provide: SHIPMENT_TRACKING_FIELD, useValue: ResourcesShipmentTracking },
    { provide: PRODUCT_PRICE_FIELD, useValue: ResourcesProductPrice },
    { provide: LINE_TOTAL_FIELD, useValue: ResourcesLineTotal },
    { provide: CART_TOTAL_FIELD, useValue: ResourcesCartTotal },
    { provide: PRODUCT_STOCK_FIELD, useValue: ResourcesProductStock },
    { provide: HIT_ADD_FIELD, useValue: ResourcesHitAdd },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesConsoleComponent {
  protected readonly ui = inject(UiState);
  protected readonly auth = inject(Auth);

  constructor() {
    // the bell is rebuilt closed when the page is shown again
    inject(DestroyRef).onDestroy(() => this.ui.setNotificationsOpen(false));
  }
}
