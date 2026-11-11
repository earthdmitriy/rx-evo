import { inject, InjectionToken, signal, WritableSignal } from '@angular/core';
import {
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  merge,
  Observable,
  shareReplay,
  startWith,
  Subject,
} from 'rxjs';
import { SessionApi } from '../../../../services/contesters';
import { Credentials } from '../../shared';
import { CustomerTab } from '../../shared/customer-tabs.component';
import { statefulObservable } from '../lib';

/** User intents, as events: the controls push, the write streams below listen. */
export const CREDENTIALS = new InjectionToken('credentials', {
  providedIn: 'root',
  factory: () => new Subject<Credentials>(),
});
export const LOGOUT_CLICKS = new InjectionToken('logoutClicks', {
  providedIn: 'root',
  factory: () => new Subject<void>(),
});

export const LOGIN = new InjectionToken('login', {
  providedIn: 'root',
  factory: () => {
    const api = inject(SessionApi);
    return statefulObservable({
      input: inject(CREDENTIALS),
      loader: ({ email, password }) => api.login(email, password),
      mapOperator: exhaustMap,
      name: 'login',
      refCount: false,
    });
  },
});

export const LOGOUT = new InjectionToken('logout', {
  providedIn: 'root',
  factory: () => {
    const api = inject(SessionApi);
    return statefulObservable({
      input: inject(LOGOUT_CLICKS),
      loader: () => api.logout(),
      mapOperator: exhaustMap,
      name: 'logout',
      refCount: false,
    });
  },
});

/**
 * Signed in or not, derived from the two writes: a login that succeeded, a
 * logout that has started (the page does not wait for the answer). The
 * `active` option of every user-scope source listens to it.
 */
export const LOGGED_IN = new InjectionToken<Observable<boolean>>('loggedIn', {
  providedIn: 'root',
  factory: () =>
    merge(
      inject(LOGIN).pipeValue(map(() => true)),
      inject(LOGOUT).pending$.pipe(
        filter(Boolean),
        map(() => false),
      ),
    ).pipe(
      startWith(false),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: false }),
    ),
});

/**
 * Which tab a customer opens on: a display preference (R-S5), not a record,
 * so it is the one piece of UI state kept at the root instead of in the tabs
 * card. It survives a navigation to another sample and back, within the same
 * session; the selected customer and the open panel are page state and do
 * not. A new session starts clean (R-S4): a logout resets it.
 */
export const LAST_TAB = new InjectionToken<WritableSignal<CustomerTab>>(
  'lastTab',
  {
    providedIn: 'root',
    factory: () => {
      const tab = signal<CustomerTab>('orders');
      inject(LOGOUT_CLICKS).subscribe(() => tab.set('orders'));
      return tab;
    },
  },
);
