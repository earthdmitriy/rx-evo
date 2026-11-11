import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  untracked,
} from '@angular/core';
import { ResourceBlockComponent } from '../../../../../content/resource-block/resource-block.component';
import {
  ConsoleCustomerListComponent,
  CustomerListQuery,
} from '../../../../shared';
import { CustomerListRegistry } from '../../../data/customer-list.registry';
import { initialsOf } from '../../../data/mappers';
import { UiState } from '../../../data/ui-state';

/** S3: the customer list. */
@Component({
  selector: 'app-resources-customer-list-section',
  imports: [ResourceBlockComponent, ConsoleCustomerListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="customers" [resource]="page()">
      <app-console-customer-list
        [page]="customers()"
        [query]="ui.displayQuery()"
        [selectedId]="ui.selected()"
        (queryChange)="onQueryChange($event)"
        (select)="ui.selectCustomer($event)"
      />
    </app-resource-block>
  `,
})
export class ResourcesCustomerListSection {
  protected readonly ui = inject(UiState);

  private readonly registry = inject(CustomerListRegistry);
  /** The list page of the current query: the session's shared resource for it. */
  protected readonly page = computed(() => {
    const key = this.ui.queryKey();
    return untracked(() => this.registry.page(key));
  });
  protected readonly customers = computed(() => {
    const r = this.page();
    const p = r.hasValue() ? r.value() : undefined;
    return p
      ? {
          rows: p.items.map((h) => ({
            customerId: h.customerId,
            name: h.name,
            initials: initialsOf(h.name),
            email: h.email,
          })),
          total: p.total,
          page: p.page,
          pageSize: p.pageSize,
        }
      : null;
  });

  protected onQueryChange(patch: Partial<CustomerListQuery>) {
    if ('text' in patch) this.ui.setTypedText(patch.text ?? '');
    else this.ui.setQuery(patch);
  }
}
