import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounce, map, of, timer } from 'rxjs';
import { CustomersApi } from '../../../../../../services/contesters';
import { StatefulBlockComponent } from '../../../../../content/stateful-block/stateful-block.component';
import {
  ConsoleCustomerListComponent,
  CustomerListQuery,
  CustomerPageVm,
} from '../../../../shared';
import { statefulObservable } from '../../../lib';
import { LOGGED_IN } from '../../../sources/session';
import { hitInitials } from '../../../vm/vm';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * S3: the page of hits is the own data of the view; the tier badge (CRM) and
 * the open-tickets badge (tickets service) are field components of the page
 * (`CUSTOMER_TIER_FIELD`, `OPEN_TICKETS_FIELD`), so a row never waits for them.
 */
@Component({
  selector: 'app-customer-list-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleCustomerListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="customers" [stream]="page">
      <app-console-customer-list
        [page]="page.value$ | async"
        [query]="query()"
        [selectedId]="selectedId()"
        (queryChange)="changeQuery($event)"
        (select)="select.emit($event)"
      />
    </app-stateful-block>
  `,
})
export class CustomerListSectionComponent {
  public readonly selectedId = input<number | null>(null);
  public readonly select = output<number>();

  /** The search box, filter, sort and page are this section's own state. */
  protected readonly query = signal<CustomerListQuery>({
    text: '',
    filter: 'all',
    sort: 'name',
    dir: 'asc',
    page: 1,
  });

  private shownText = '';
  private readonly api = inject(CustomersApi);
  private readonly loggedIn$ = inject(LOGGED_IN);

  /** One page of customer search hits: the query is UI state, so it is this node's input and cache key, not an entity id. */
  protected readonly page = statefulObservable({
    // typing sends one request per pause; any other change goes at once (R-L4)
    input: toObservable(this.query).pipe(
      debounce((query) => {
        const typing = query.text !== this.shownText;
        this.shownText = query.text;
        return typing ? timer(SEARCH_DEBOUNCE_MS) : of(0);
      }),
    ),
    loader: (query) => this.api.searchCustomers(query),
    cacheKey: (query) => [
      query.text,
      query.filter,
      query.sort,
      query.dir,
      query.page,
    ],
    active: this.loggedIn$,
    name: 'customerPage',
  }).pipeValue(
    map(
      (page): CustomerPageVm => ({
        rows: page.items.map((hit) => ({
          customerId: hit.customerId,
          name: hit.name,
          initials: hitInitials(hit),
          email: hit.email,
        })),
        total: page.total,
        page: page.page,
        pageSize: page.pageSize,
      }),
    ),
  );

  /** A change of text, filter or sort goes back to page 1. */
  protected changeQuery(change: Partial<CustomerListQuery>) {
    this.query.update((query) => ({
      ...query,
      ...change,
      page: change.page ?? 1,
    }));
  }
}
