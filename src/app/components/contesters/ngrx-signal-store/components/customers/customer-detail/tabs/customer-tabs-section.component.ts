import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ConsoleCustomerTabsComponent } from '../../../../../shared';
import { UI_STATE } from '../../../../data/ui-state';
import { SignalStoreCartTabSection } from './cart-tab/cart-tab-section.component';
import { SignalStoreNotesTabSection } from './notes-tab/notes-tab-section.component';
import { SignalStoreOrdersTabSection } from './orders-tab/orders-tab-section.component';
import { SignalStoreTicketsTabSection } from './tickets-tab/tickets-tab-section.component';

/** The tab card of the selected customer with the section of the active tab inside. */
@Component({
  selector: 'app-signal-store-customer-tabs-section',
  imports: [
    ConsoleCustomerTabsComponent,
    SignalStoreOrdersTabSection,
    SignalStoreCartTabSection,
    SignalStoreTicketsTabSection,
    SignalStoreNotesTabSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-console-customer-tabs
      [active]="ui.tab()"
      [customerId]="customerId()"
      (activeChange)="ui.setTab($event)"
    >
      @switch (ui.tab()) {
        @case ('orders') {
          <app-signal-store-orders-tab-section [customerId]="customerId()" />
        }
        @case ('cart') {
          <app-signal-store-cart-tab-section [customerId]="customerId()" />
        }
        @case ('tickets') {
          <app-signal-store-tickets-tab-section [customerId]="customerId()" />
        }
        @case ('notes') {
          <app-signal-store-notes-tab-section [customerId]="customerId()" />
        }
      }
    </app-console-customer-tabs>
  `,
})
export class SignalStoreCustomerTabsSection {
  public readonly customerId = input.required<number>();

  protected readonly ui = inject(UI_STATE);
}
