import { inject, Injectable } from '@angular/core';
import { SessionApi } from '../../../../services/contesters';
import { Credentials } from '../../shared';
import { createAction } from './action';
import { UI_STATE } from './ui-state';
import { SESSION_CACHES } from './sources';

/** Login/logout: two actions, driving `UI_STATE`'s `signedIn` flag and clearing the caches on logout. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly sessionApi = inject(SessionApi);
  private readonly ui = inject(UI_STATE);
  private readonly caches = SESSION_CACHES.map((cache) => inject(cache));

  readonly login = createAction((c: Credentials) =>
    this.sessionApi.login(c.email, c.password),
  );

  signIn(c: Credentials) {
    this.login.run(c, () => this.ui.signIn());
  }

  /** Signs out at once: the UI does not wait for the server to confirm a logout (R-A3/R-A4), only fires the request. */
  signOut() {
    this.sessionApi.logout().subscribe({ error: () => undefined });
    this.ui.signOut();
    this.caches.forEach((cache) => cache.clear());
  }
}
