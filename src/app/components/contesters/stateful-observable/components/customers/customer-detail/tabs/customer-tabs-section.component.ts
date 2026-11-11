import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { ConsoleCustomerTabsComponent } from '../../../../../shared';
import { CustomerTab } from '../../../../../shared/customer-tabs.component';
import { LAST_TAB } from '../../../../sources/session';
import { CartTabSectionComponent } from './cart-tab/cart-tab-section.component';
import { NotesTabSectionComponent } from './notes-tab/notes-tab-section.component';
import { OrdersTabSectionComponent } from './orders-tab/orders-tab-section.component';
import { TicketsTabSectionComponent } from './tickets-tab/tickets-tab-section.component';

/** The tab card: the badges are field components of the page (`KPI_FIELD`, `OPEN_TICKETS_FIELD`) looked up by the customer id, the active tab's section inside. */
@Component({
  selector: 'app-customer-tabs-section',
  imports: [
    ConsoleCustomerTabsComponent,
    OrdersTabSectionComponent,
    CartTabSectionComponent,
    TicketsTabSectionComponent,
    NotesTabSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-console-customer-tabs
      [active]="tab()"
      [customerId]="customerId()"
      (activeChange)="setTab($event)"
    >
      @if (opened().includes('orders')) {
        <div [hidden]="tab() !== 'orders'">
          <app-orders-tab-section
            [customerId]="customerId()"
            (openOrder)="openOrder.emit($event)"
          />
        </div>
      }
      @if (opened().includes('cart')) {
        <div [hidden]="tab() !== 'cart'">
          <app-cart-tab-section [customerId]="customerId()" />
        </div>
      }
      @if (opened().includes('tickets')) {
        <div [hidden]="tab() !== 'tickets'">
          <app-tickets-tab-section
            [customerId]="customerId()"
            (openTicket)="openTicket.emit($event)"
            (openOrder)="openOrder.emit($event)"
          />
        </div>
      }
      @if (opened().includes('notes')) {
        <div [hidden]="tab() !== 'notes'">
          <app-notes-tab-section [customerId]="customerId()" />
        </div>
      }
    </app-console-customer-tabs>
  `,
})
export class CustomerTabsSectionComponent {
  public readonly customerId = input.required<number>();
  public readonly openOrder = output<string>();
  public readonly openTicket = output<string>();

  private readonly lastTab = inject(LAST_TAB);

  /** The tab is the card's own state, seeded from the kept preference (R-S5); another customer keeps it too. */
  protected readonly tab = linkedSignal(() => this.lastTab());

  protected setTab(tab: CustomerTab) {
    this.tab.set(tab);
    this.lastTab.set(tab);
  }

  /**
   * The tabs visited for this customer. A tab section is created on its first
   * visit and then only hidden, so its component (and the state it holds)
   * survives switching tabs; another customer starts over with the active tab.
   */
  protected readonly opened = linkedSignal<
    { id: number; tab: CustomerTab },
    CustomerTab[]
  >({
    source: () => ({ id: this.customerId(), tab: this.tab() }),
    computation: (source, previous) =>
      previous && previous.source.id === source.id
        ? [...new Set([...previous.value, source.tab])]
        : [source.tab],
  });
}
