import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConsoleCustomerTabsComponent } from '../../../../../shared';
import { VanillaRxjsConsoleStore } from '../../../../data/console.store';
import { VanillaRxjsCartTabSection } from './cart-tab/cart-tab-section.component';
import { VanillaRxjsNotesTabSection } from './notes-tab/notes-tab-section.component';
import { VanillaRxjsOrdersTabSection } from './orders-tab/orders-tab-section.component';
import { VanillaRxjsTicketsTabSection } from './tickets-tab/tickets-tab-section.component';

/** The tab card of the selected customer with the section of the active tab inside. */
@Component({
  selector: 'app-vanilla-rxjs-customer-tabs-section',
  imports: [
    ConsoleCustomerTabsComponent,
    VanillaRxjsOrdersTabSection,
    VanillaRxjsCartTabSection,
    VanillaRxjsTicketsTabSection,
    VanillaRxjsNotesTabSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-console-customer-tabs
      [active]="tab()"
      [customerId]="customerId()"
      (activeChange)="s.tab$.next($event)"
    >
      @switch (tab()) {
        @case ('orders') {
          <app-vanilla-rxjs-orders-tab-section [customerId]="customerId()" />
        }
        @case ('cart') {
          <app-vanilla-rxjs-cart-tab-section [customerId]="customerId()" />
        }
        @case ('tickets') {
          <app-vanilla-rxjs-tickets-tab-section [customerId]="customerId()" />
        }
        @case ('notes') {
          <app-vanilla-rxjs-notes-tab-section [customerId]="customerId()" />
        }
      }
    </app-console-customer-tabs>
  `,
})
export class VanillaRxjsCustomerTabsSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly tab = toSignal(this.s.tab$, { requireSync: true });
}
