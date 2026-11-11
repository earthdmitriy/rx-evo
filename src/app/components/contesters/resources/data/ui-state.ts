import { computed, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounce, of, timer } from 'rxjs';
import { CustomerListQuery } from '../../shared';
import { CustomerTab } from '../../shared/customer-tabs.component';

export type Panel =
  | { kind: 'order'; id: string }
  | { kind: 'ticket'; id: string }
  | null;

const INITIAL_QUERY: CustomerListQuery = {
  text: '',
  filter: 'all',
  sort: 'name',
  dir: 'asc',
  page: 1,
};

/**
 * Everything the page itself owns, not fetched from a service: the signed-in
 * flag, the selected customer, the open panel, the active tab, the customer
 * list's filter/sort/page, the order editor's edit mode and search text.
 * Plain `signal()`s in one `@Injectable({providedIn:'root'})` class — no
 * store builder, this entry does not use NgRx at all.
 *
 * The search text is typed immediately into `typedText` (so the box never
 * lags) and debounced into `query.text` (the fetch trigger) by `typeSearch`,
 * subscribed once in the constructor — plain RxJS, not an NgRx `rxMethod`.
 */
@Injectable({ providedIn: 'root' })
export class UiState {
  readonly signedIn = signal(false);
  readonly selected = signal<number | null>(null);
  readonly panel = signal<Panel>(null);
  readonly tab = signal<CustomerTab>('orders');
  readonly editing = signal(false);
  readonly searchText = signal('');
  readonly notificationsOpen = signal(false);
  readonly typedText = signal('');
  readonly query = signal<CustomerListQuery>(INITIAL_QUERY);

  /** What the list box shows: live text, committed filter/sort/page. */
  readonly displayQuery = computed(
    (): CustomerListQuery => ({ ...this.query(), text: this.typedText() }),
  );
  readonly queryKey = computed(() => JSON.stringify(this.query()));

  constructor() {
    toObservable(this.typedText)
      .pipe(debounce((t) => (t === '' ? of(0) : timer(300))))
      .subscribe((text) => {
        if (text === this.query().text) return;
        this.query.update((q) => ({ ...q, text, page: 1 }));
      });
  }

  signIn() {
    this.signedIn.set(true);
  }

  /** Optimistic: the caller fires the server call and ignores it (R-A3/R-A4/G10 — the UI does not wait). */
  signOut() {
    this.signedIn.set(false);
    this.selected.set(null);
    this.panel.set(null);
    this.tab.set('orders');
    this.editing.set(false);
    this.searchText.set('');
    this.typedText.set('');
    this.query.set(INITIAL_QUERY);
  }

  setTab(tab: CustomerTab) {
    this.tab.set(tab);
  }

  selectCustomer(id: number | null) {
    this.selected.set(id);
    this.panel.set(null);
    this.editing.set(false);
  }

  openOrder(id: string) {
    this.panel.set({ kind: 'order', id });
    this.editing.set(false);
  }

  openTicket(id: string) {
    this.panel.set({ kind: 'ticket', id });
  }

  closePanel() {
    this.panel.set(null);
    this.editing.set(false);
  }

  setEditing(editing: boolean) {
    this.editing.set(editing);
    this.searchText.set('');
  }

  setSearchText(text: string) {
    this.searchText.set(text);
  }

  setNotificationsOpen(open: boolean) {
    this.notificationsOpen.set(open);
  }

  setTypedText(text: string) {
    this.typedText.set(text);
  }

  setQuery(patch: Omit<Partial<CustomerListQuery>, 'text'>) {
    const resetsPage = 'filter' in patch || 'sort' in patch || 'dir' in patch;
    this.query.update((q) => ({
      ...q,
      ...patch,
      ...(resetsPage ? { page: 1 } : {}),
    }));
  }
}
