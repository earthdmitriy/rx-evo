import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConsoleCustomerTabsComponent } from '../../../../../shared';
import { OracleConsoleStore } from '../../../../data/console.store';
import { OracleCartTabSection } from './cart-tab/cart-tab-section.component';
import { OracleNotesTabSection } from './notes-tab/notes-tab-section.component';
import { OracleOrdersTabSection } from './orders-tab/orders-tab-section.component';
import { OracleTicketsTabSection } from './tickets-tab/tickets-tab-section.component';

/** The tab card of the selected customer with the section of the active tab inside. */
@Component({
  selector: 'app-oracle-customer-tabs-section',
  imports: [
    ConsoleCustomerTabsComponent,
    OracleOrdersTabSection,
    OracleCartTabSection,
    OracleTicketsTabSection,
    OracleNotesTabSection,
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
          <app-oracle-orders-tab-section [customerId]="customerId()" />
        }
        @case ('cart') {
          <app-oracle-cart-tab-section [customerId]="customerId()" />
        }
        @case ('tickets') {
          <app-oracle-tickets-tab-section [customerId]="customerId()" />
        }
        @case ('notes') {
          <app-oracle-notes-tab-section [customerId]="customerId()" />
        }
      }
    </app-console-customer-tabs>
  `,
})
export class OracleCustomerTabsSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(OracleConsoleStore);
  protected readonly tab = toSignal(this.s.tab$, { requireSync: true });
}
