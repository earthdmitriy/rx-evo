import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  CustomerHit,
  CustomerQuery,
  Page,
} from '../../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import {
  ConsoleCustomerListComponent,
  CustomerPageVm,
} from '../../../../shared';
import { data, error, loading } from '../../../data/block-state';
import { cacheEntry } from '../../../data/entity-store';
import { initialsOf } from '../../../data/mappers';
import { CUSTOMERS_PAGE } from '../../../data/sources';
import { UI_STATE } from '../../../data/ui-state';
import { mapVm, toVm, Vm } from '../../../data/vm';

const toCustomerPageVm = (p: Page<CustomerHit>): CustomerPageVm => ({
  rows: p.items.map((h) => ({
    customerId: h.customerId,
    name: h.name,
    initials: initialsOf(h.name),
    email: h.email,
  })),
  total: p.total,
  page: p.page,
  pageSize: p.pageSize,
});

/** S3: the customer list. */
@Component({
  selector: 'app-signal-store-customer-list-section',
  imports: [ViewBlockComponent, ConsoleCustomerListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="customers"
      [loading]="loading(customers().state)"
      [error]="error(customers().state)"
      (retry)="cache.reload(key())"
    >
      <app-console-customer-list
        [page]="data(customers())"
        [query]="ui.displayQuery()"
        [selectedId]="ui.selected()"
        (queryChange)="onQueryChange($event)"
        (select)="ui.selectCustomer($event)"
      />
    </app-view-block>
  `,
})
export class SignalStoreCustomerListSection {
  protected readonly cache = inject(CUSTOMERS_PAGE);
  protected readonly ui = inject(UI_STATE);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  protected readonly key = this.ui.queryKey;
  private readonly fetched = cacheEntry(this.cache, this.key);
  protected readonly customers = computed(
    (): Vm<CustomerPageVm> =>
      mapVm(
        toVm('customers', this.fetched(), (p) => !p.items.length),
        toCustomerPageVm,
      ),
  );

  protected onQueryChange(patch: Partial<CustomerQuery>) {
    if ('text' in patch) this.ui.typeSearch(patch.text ?? '');
    else this.ui.setQuery(patch);
  }
}
