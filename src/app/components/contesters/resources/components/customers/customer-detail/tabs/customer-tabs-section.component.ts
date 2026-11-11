import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ConsoleCustomerTabsComponent } from '../../../../../shared';
import { UiState } from '../../../../data/ui-state';
import { ResourcesCartTabSection } from './cart-tab/cart-tab-section.component';
import { ResourcesNotesTabSection } from './notes-tab/notes-tab-section.component';
import { ResourcesOrdersTabSection } from './orders-tab/orders-tab-section.component';
import { ResourcesTicketsTabSection } from './tickets-tab/tickets-tab-section.component';

/** The tab card of the selected customer with the section of the active tab inside. */
@Component({
  selector: 'app-resources-customer-tabs-section',
  imports: [
    ConsoleCustomerTabsComponent,
    ResourcesOrdersTabSection,
    ResourcesCartTabSection,
    ResourcesTicketsTabSection,
    ResourcesNotesTabSection,
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
          <app-resources-orders-tab-section [customerId]="customerId()" />
        }
        @case ('cart') {
          <app-resources-cart-tab-section [customerId]="customerId()" />
        }
        @case ('tickets') {
          <app-resources-tickets-tab-section [customerId]="customerId()" />
        }
        @case ('notes') {
          <app-resources-notes-tab-section [customerId]="customerId()" />
        }
      }
    </app-console-customer-tabs>
  `,
})
export class ResourcesCustomerTabsSection {
  public readonly customerId = input.required<number>();

  protected readonly ui = inject(UiState);
}
