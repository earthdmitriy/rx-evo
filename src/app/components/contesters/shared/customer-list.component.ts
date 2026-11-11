import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { CUSTOMER_TIER_FIELD, OPEN_TICKETS_FIELD } from './fields';
import { CustomerListQuery, CustomerPageVm } from './view-models';

type CustomerFilter = CustomerListQuery['filter'];
type CustomerSort = CustomerListQuery['sort'];

const FILTERS: { id: CustomerFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'vip', label: 'VIP' },
  { id: 'open-tickets', label: 'Open tickets' },
];
const SORTS: { id: CustomerSort; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'lastOrder', label: 'Last order' },
  { id: 'spend', label: 'Lifetime spend' },
  { id: 'openTickets', label: 'Open tickets' },
];

/**
 * S3: search, filter, sort, pages and rows. The tier badge and the
 * open-ticket badge of a row are field components by customer id
 * (`CUSTOMER_TIER_FIELD`, `OPEN_TICKETS_FIELD`): a row shows without them
 * until they arrive.
 * Emits query changes as they happen (every keystroke for the search text);
 * debouncing and resetting the page are the data layer's job.
 */
@Component({
  selector: 'app-console-customer-list',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'card block overflow-hidden',
    'data-testid': 'customers',
    '[attr.data-content]':
      'page() === null ? "none" : page()!.rows.length ? "shown" : "empty"',
  },
  template: `
    <div class="space-y-2 border-b border-slate-200 p-3">
      <input
        class="input"
        type="search"
        placeholder="Find customer"
        aria-label="Find customer"
        data-testid="customer-search"
        [value]="query().text"
        (input)="queryChange.emit({ text: $any($event.target).value })"
      />
      <div class="flex gap-1.5">
        @for (f of filters; track f.id) {
          <button
            type="button"
            class="badge"
            [class]="query().filter === f.id ? 'badge-accent' : 'badge-neutral'"
            [attr.data-testid]="'filter-' + f.id"
            [attr.aria-pressed]="query().filter === f.id"
            (click)="queryChange.emit({ filter: f.id })"
          >
            {{ f.label }}
          </button>
        }
      </div>
      <div class="flex items-center gap-2">
        <label
          class="text-xs whitespace-nowrap text-slate-500"
          for="console-sort"
          >Sort by</label
        >
        <select
          id="console-sort"
          class="input py-1 text-xs"
          data-testid="sort"
          [value]="query().sort"
          (change)="queryChange.emit({ sort: $any($event.target).value })"
        >
          @for (s of sorts; track s.id) {
            <option [value]="s.id">{{ s.label }}</option>
          }
        </select>
        <button
          type="button"
          class="btn btn-ghost btn-icon shrink-0"
          data-testid="sort-dir"
          [attr.aria-label]="
            dir() === 'desc'
              ? 'Descending, switch to ascending'
              : 'Ascending, switch to descending'
          "
          (click)="queryChange.emit({ dir: dir() === 'desc' ? 'asc' : 'desc' })"
        >
          {{ dir() === 'desc' ? '↓' : '↑' }}
        </button>
      </div>
    </div>

    <div data-part="main">
      <ul>
        @for (c of page()?.rows ?? []; track c.customerId) {
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors"
              [class]="
                c.customerId === selectedId()
                  ? 'border-indigo-600 bg-indigo-50/70'
                  : 'border-transparent hover:bg-slate-50'
              "
              [attr.data-testid]="'customer-' + c.customerId"
              [attr.data-customer-id]="c.customerId"
              [attr.aria-current]="c.customerId === selectedId()"
              (click)="select.emit(c.customerId)"
            >
              <span
                class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                >{{ c.initials }}</span
              >
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5">
                  <span class="truncate text-sm font-medium text-slate-900">{{
                    c.name
                  }}</span>
                  <span
                    class="inline-block min-w-8 shrink-0"
                    data-testid="row-tier"
                    ><ng-container
                      *ngComponentOutlet="
                        tierField;
                        inputs: { customerId: c.customerId }
                      "
                  /></span>
                </span>
                <span class="block truncate text-xs text-slate-500">{{
                  c.email
                }}</span>
              </span>
              <span
                class="inline-block min-w-5 text-right"
                data-testid="row-open-tickets"
                ><ng-container
                  *ngComponentOutlet="
                    openTicketsField;
                    inputs: { customerId: c.customerId, variant: 'row' }
                  "
              /></span>
            </button>
          </li>
        }
      </ul>
      @if (page() && !page()!.rows.length) {
        <div class="empty-state">No customers match.</div>
      }
    </div>

    <div
      class="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500"
    >
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        data-testid="page-prev"
        [disabled]="pageNo() <= 1"
        (click)="queryChange.emit({ page: pageNo() - 1 })"
      >
        Prev
      </button>
      <span class="tabular-nums" data-testid="page-info">{{ range() }}</span>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        data-testid="page-next"
        [disabled]="!hasNext()"
        (click)="queryChange.emit({ page: pageNo() + 1 })"
      >
        Next
      </button>
    </div>
  `,
})
export class ConsoleCustomerListComponent {
  public readonly page = input<CustomerPageVm | null>(null);
  /** Shows the tier of a customer (CRM): supplied by the implementation (`CUSTOMER_TIER_FIELD`). */
  protected readonly tierField = inject(CUSTOMER_TIER_FIELD);
  /** Shows the open tickets of a customer (tickets service): supplied by the implementation (`OPEN_TICKETS_FIELD`). */
  protected readonly openTicketsField = inject(OPEN_TICKETS_FIELD);
  public readonly query = input.required<CustomerListQuery>();
  public readonly selectedId = input<number | null>(null);
  /** One changed field at a time. */
  public readonly queryChange = output<Partial<CustomerListQuery>>();
  public readonly select = output<number>();

  protected readonly filters = FILTERS;
  protected readonly sorts = SORTS;
  protected readonly dir = computed(() => this.query().dir);
  protected readonly pageNo = computed(() => this.query().page);
  protected readonly hasNext = computed(() => {
    const p = this.page();
    return !!p && p.page * p.pageSize < p.total;
  });
  protected readonly range = computed(() => {
    const p = this.page();
    if (!p || !p.total) return '';
    const from = (p.page - 1) * p.pageSize + 1;
    return `${from}–${Math.min(p.total, from + p.rows.length - 1)} of ${p.total} · page ${p.page}`;
  });
}
