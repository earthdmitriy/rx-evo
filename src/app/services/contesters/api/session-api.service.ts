import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { Agent } from '../console.types';

/** Sign-in, sign-out and the signed-in agent. */
@Injectable({ providedIn: 'root' })
export class SessionApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Starts a session. Any non-empty email and password work; the email picks the agent. 401 otherwise. */
  public login(email: string, password: string): Observable<Agent> {
    return this.http.write('login', { email }, 'public', () => this.backend.login(email, password));
  }

  public logout(): Observable<void> {
    return this.http.write('logout', undefined, 'public', () => this.backend.logout());
  }

  public profile(): Observable<Agent> {
    return this.http.read('profile', undefined, 'user', () => this.backend.profile());
  }
}
