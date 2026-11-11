import { inject, Injectable } from '@angular/core';
import { SessionApi } from '../../../../services/contesters';
import { Credentials } from '../../shared';
import { createAction } from './action';
import { UiState } from './ui-state';

/** Login/logout: two actions driving `UiState`'s `signedIn` flag. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly sessionApi = inject(SessionApi);
  private readonly ui = inject(UiState);

  readonly login = createAction((c: Credentials) =>
    this.sessionApi.login(c.email, c.password),
  );

  signIn(c: Credentials) {
    this.login.run(c, () => this.ui.signIn());
  }

  /** Signs out at once: the UI does not wait for the server to confirm a logout, only fires the request. */
  signOut() {
    this.sessionApi.logout().subscribe({ error: () => undefined });
    this.ui.signOut();
  }
}
