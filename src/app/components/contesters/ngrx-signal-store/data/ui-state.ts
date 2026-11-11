import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { debounce, of, pipe, tap, timer } from 'rxjs';
import { CustomerQuery } from '../../../../services/contesters';
import { CustomerTab } from '../../shared/customer-tabs.component';

export type Panel =
  | { kind: 'order'; id: string }
  | { kind: 'ticket'; id: string }
  | null;

const INITIAL_QUERY: Required<CustomerQuery> = {
  text: '',
  filter: 'all',
  sort: 'name',
  dir: 'asc',
  page: 1,
};

/**
 * Everything the page itself owns, not fetched from a service: the signed-in
 * flag, the selected customer, the open panel, the active tab, the customer
 * list's filter/sort/page, the order editor's edit mode and search text. One
 * `withState`/`withMethods` store, the natural shape for this amount of
 * named, related state. `providedIn: 'root'`, so all of it survives a
 * navigation to another sample and back; R-S5 only asks that of the tab
 * (a display preference), not of the selected customer or the open panel
 * (page state), so this is a superset of the requirement, not a gap.
 *
 * The search text is typed immediately into `typedText` (so the box never
 * lags) and debounced into `query.text` (the fetch trigger) by `typeSearch`,
 * an `rxMethod` — any other query change goes through `setQuery` at once.
 */
export const UI_STATE = signalStore(
  { providedIn: 'root' },
  withState({
    signedIn: false,
    selected: null as number | null,
    panel: null as Panel,
    tab: 'orders' as CustomerTab,
    editing: false,
    searchText: '',
    notificationsOpen: false,
    typedText: '',
    query: INITIAL_QUERY,
  }),
  withComputed((store) => ({
    /** What the list box shows: live text, committed filter/sort/page. */
    displayQuery: computed(
      (): Required<CustomerQuery> => ({
        ...store.query(),
        text: store.typedText(),
      }),
    ),
    queryKey: computed(() => JSON.stringify(store.query())),
  })),
  withMethods((store) => ({
    signIn: () => patchState(store, { signedIn: true }),
    signOut: () =>
      patchState(store, {
        signedIn: false,
        selected: null,
        panel: null,
        tab: 'orders',
        editing: false,
        searchText: '',
        typedText: '',
        query: INITIAL_QUERY,
      }),
    setTab: (tab: CustomerTab) => patchState(store, { tab }),
    selectCustomer: (id: number | null) =>
      patchState(store, { selected: id, panel: null, editing: false }),
    openOrder: (id: string) =>
      patchState(store, { panel: { kind: 'order', id }, editing: false }),
    openTicket: (id: string) =>
      patchState(store, { panel: { kind: 'ticket', id } }),
    closePanel: () => patchState(store, { panel: null, editing: false }),
    setEditing: (editing: boolean) =>
      patchState(store, { editing, searchText: '' }),
    setSearchText: (text: string) => patchState(store, { searchText: text }),
    setNotificationsOpen: (open: boolean) =>
      patchState(store, { notificationsOpen: open }),
    setQuery: (patch: Omit<Partial<CustomerQuery>, 'text'>) => {
      const resetsPage = 'filter' in patch || 'sort' in patch || 'dir' in patch;
      patchState(store, (s) => ({
        query: { ...s.query, ...patch, ...(resetsPage ? { page: 1 } : {}) },
      }));
    },
    typeSearch: rxMethod<string>(
      pipe(
        tap((text) => patchState(store, { typedText: text })),
        debounce((t) => (t === '' ? of(0) : timer(300))),
        // against the *committed* text, not the last typed one: a logout resets `query.text`
        // to '' without going through this stream, so a plain `distinctUntilChanged` would
        // still remember the old typed value and swallow the same search typed again after
        // signing back in.
        tap((text) => {
          if (text === store.query().text) return;
          patchState(store, (s) => ({ query: { ...s.query, text, page: 1 } }));
        }),
      ),
    ),
  })),
);

export const uiState = () => inject(UI_STATE);
