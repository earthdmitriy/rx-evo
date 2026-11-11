import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../content/generic-error/generic-error.component';
import { ConsoleCustomerListComponent } from '../../../../shared';
import { data, error, idle, loading, notices } from '../../../data/block-state';
import { VanillaRxjsConsoleStore } from '../../../data/console.store';

/** S3: the customer list. */
@Component({
  selector: 'app-vanilla-rxjs-customer-list-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleCustomerListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="customers"
      [loading]="loading(customers().state)"
      [error]="error(customers().state)"
      (retry)="s.retryCustomers()"
    >
      <app-console-customer-list
        [page]="data(customers())"
        [query]="query()"
        [selectedId]="selected()"
        (queryChange)="s.changeQuery($event)"
        (select)="s.selectCustomer($event)"
      />
      <div class="contents">
        @for (n of notices(customers().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class VanillaRxjsCustomerListSection {
  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly query = toSignal(this.s.displayQuery$, {
    requireSync: true,
  });
  protected readonly customers = toSignal(this.s.customers$, {
    initialValue: idle,
  });
  protected readonly selected = toSignal(this.s.selected$, {
    requireSync: true,
  });
}
