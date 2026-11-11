import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { ActivityEntry } from '../console.types';

/** What a customer did recently. Meant to be polled. */
@Injectable({ providedIn: 'root' })
export class ActivityApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Newest first. Every successful call after the first adds one new event, so polls see changes. */
  public activity(customerId: number): Observable<ActivityEntry[]> {
    return this.http.read('activity', customerId, 'user', () =>
      this.backend.activity(customerId),
    );
  }
}
