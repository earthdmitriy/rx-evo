import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AGENT_NAME_FIELD,
  CART_TOTAL_FIELD,
  ConsoleFrameComponent,
  ConsoleSignInComponent,
  CUSTOMER_NAME_FIELD,
  CUSTOMER_TIER_FIELD,
  Credentials,
  HIT_ADD_FIELD,
  KPI_FIELD,
  LINE_TOTAL_FIELD,
  OPEN_TICKETS_FIELD,
  PRODUCT_NAME_FIELD,
  PRODUCT_PRICE_FIELD,
  PRODUCT_STOCK_FIELD,
  SHIPMENT_TRACKING_FIELD,
} from '../shared';
import { ActivitySectionComponent } from './components/customers/customer-detail/rail/activity/activity-section.component';
import { AgentNameComponent } from './components/fields/agent-name/agent-name.component';
import { AgentSectionComponent } from './components/agent/agent-section.component';
import { CartTotalComponent } from './components/customers/customer-detail/tabs/cart-tab/cart-total/cart-total.component';
import { HitAddComponent } from './components/panels/order-panel/hit-add/hit-add.component';
import { LineTotalComponent } from './components/customers/customer-detail/tabs/cart-tab/line-total/line-total.component';
import { ProductPriceComponent } from './components/fields/product-price/product-price.component';
import { ProductStockComponent } from './components/panels/order-panel/product-stock/product-stock.component';
import { CustomerHeaderSectionComponent } from './components/customers/customer-detail/header/customer-header-section.component';
import { CustomerListSectionComponent } from './components/customers/customer-list/customer-list-section.component';
import { CustomerNameComponent } from './components/fields/customer-name/customer-name.component';
import { CustomerTierComponent } from './components/customers/customer-list/customer-tier/customer-tier.component';
import { CustomerTabsSectionComponent } from './components/customers/customer-detail/tabs/customer-tabs-section.component';
import { KpiComponent } from './components/customers/customer-detail/fields/kpi/kpi.component';
import { NotificationsSectionComponent } from './components/notifications/notifications-section.component';
import { OpenTicketsComponent } from './components/customers/fields/open-tickets/open-tickets.component';
import { ProductNameComponent } from './components/fields/product-name/product-name.component';
import { OrderPanelSectionComponent } from './components/panels/order-panel/order-panel-section.component';
import { ShipmentTrackingComponent } from './components/customers/customer-detail/rail/shipments/shipment-tracking/shipment-tracking.component';
import { ShipmentsSectionComponent } from './components/customers/customer-detail/rail/shipments/shipments-section.component';
import { TicketPanelSectionComponent } from './components/panels/ticket-panel/ticket-panel-section.component';
import {
  CREDENTIALS,
  LOGGED_IN,
  LOGIN,
  LOGOUT_CLICKS,
} from './sources/session';

type Panel = { order: string } | { ticket: string } | null;

/**
 * Root of the statefulObservable implementation, stage 1 (docs/contest/spec.md §2.4).
 * Only layout and routing of sections lives here: every section is a
 * container that composes the data layer's slices for its view.
 */
@Component({
  selector: 'app-console-page',
  imports: [
    AsyncPipe,
    ConsoleFrameComponent,
    ConsoleSignInComponent,
    AgentSectionComponent,
    NotificationsSectionComponent,
    CustomerListSectionComponent,
    CustomerHeaderSectionComponent,
    CustomerTabsSectionComponent,
    ShipmentsSectionComponent,
    ActivitySectionComponent,
    OrderPanelSectionComponent,
    TicketPanelSectionComponent,
  ],
  template: `
    @if (loggedIn()) {
      <app-console-frame
        [customerSelected]="customerId() !== null"
        (logout)="logout()"
      >
        <app-notifications-section consoleBell />
        <app-agent-section consoleAgent />
        <app-customer-list-section
          consoleList
          [selectedId]="customerId()"
          (select)="selectCustomer($event)"
        />

        @let customer = customerId();
        @if (customer !== null) {
          <app-customer-header-section
            consoleMain
            [customerId]="customer"
            (clear)="selectCustomer(null)"
          />
        }
        @if (customer !== null) {
          <app-customer-tabs-section
            consoleMain
            [customerId]="customer"
            (openOrder)="openOrder($event)"
            (openTicket)="openTicket($event)"
          />
        }
        @if (customer !== null) {
          <app-shipments-section
            consoleRail
            [customerId]="customer"
            (openOrder)="openOrder($event)"
          />
        }
        @if (customer !== null) {
          <app-activity-section consoleRail [customerId]="customer" />
        }

        @if (orderId(); as id) {
          <app-order-panel-section
            consolePanel
            [orderId]="id"
            (close)="closePanel()"
            (openTicket)="openTicket($event)"
          />
        }
        @if (ticketId(); as id) {
          <app-ticket-panel-section
            consolePanel
            [ticketId]="id"
            (close)="closePanel()"
            (openOrder)="openOrder($event)"
          />
        }
      </app-console-frame>
    } @else {
      <app-console-sign-in
        [state]="{
          pending: !!(login.pending$ | async),
          error: login.error$ | async,
        }"
        (signIn)="signIn($event)"
      />
    }
  `,
  providers: [
    { provide: PRODUCT_NAME_FIELD, useValue: ProductNameComponent },
    { provide: CUSTOMER_TIER_FIELD, useValue: CustomerTierComponent },
    { provide: OPEN_TICKETS_FIELD, useValue: OpenTicketsComponent },
    { provide: KPI_FIELD, useValue: KpiComponent },
    { provide: AGENT_NAME_FIELD, useValue: AgentNameComponent },
    { provide: CUSTOMER_NAME_FIELD, useValue: CustomerNameComponent },
    { provide: SHIPMENT_TRACKING_FIELD, useValue: ShipmentTrackingComponent },
    { provide: PRODUCT_PRICE_FIELD, useValue: ProductPriceComponent },
    { provide: LINE_TOTAL_FIELD, useValue: LineTotalComponent },
    { provide: CART_TOTAL_FIELD, useValue: CartTotalComponent },
    { provide: PRODUCT_STOCK_FIELD, useValue: ProductStockComponent },
    { provide: HIT_ADD_FIELD, useValue: HitAddComponent },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolePageComponent {
  private readonly credentials = inject(CREDENTIALS);
  private readonly logoutClicks = inject(LOGOUT_CLICKS);
  protected readonly login = inject(LOGIN);
  protected readonly loggedIn = toSignal(inject(LOGGED_IN), {
    requireSync: true,
  });

  /** What the user picked: the page owns it and hands it down; the sections tell it what they were asked. */
  protected readonly customerId = signal<number | null>(null);
  private readonly panel = signal<Panel>(null);
  protected readonly orderId = computed(() => {
    const panel = this.panel();
    return panel && 'order' in panel ? panel.order : null;
  });
  protected readonly ticketId = computed(() => {
    const panel = this.panel();
    return panel && 'ticket' in panel ? panel.ticket : null;
  });

  protected signIn(credentials: Credentials) {
    this.credentials.next(credentials);
  }

  /** The console unmounts with the session, so everything it owned starts over at the next sign-in. */
  protected logout() {
    this.logoutClicks.next();
    this.selectCustomer(null);
  }

  /** Another customer closes the panel; the tab is kept. */
  protected selectCustomer(customerId: number | null) {
    this.customerId.set(customerId);
    this.panel.set(null);
  }

  protected openOrder(order: string) {
    this.panel.set({ order });
  }

  protected openTicket(ticket: string) {
    this.panel.set({ ticket });
  }

  protected closePanel() {
    this.panel.set(null);
  }
}
