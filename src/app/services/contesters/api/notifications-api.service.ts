import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { AgentNotification, PushEvent } from '../console.types';

/** The agent's notifications: a list to fetch and a push channel. */
@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /**
   * All notifications of the signed-in agent, newest first. No text: compose
   * it from the ticket, order and customer each one refers to.
   */
  public notifications(): Observable<AgentNotification[]> {
    return this.http.read('notifications', undefined, 'user', () => this.backend.notifications());
  }

  public markNotificationsRead(): Observable<void> {
    return this.http.write('markNotificationsRead', undefined, 'user', () => this.backend.markNotificationsRead());
  }

  /**
   * **Hot** push channel: one event every `PUSH_PERIOD_MS` (25 s) while an
   * agent is signed in, whether or not anyone subscribes. Each event carries
   * a notification already stored on the server (the next `notifications()`
   * includes it); a `ticket-reply` has also changed that ticket (new customer
   * message, status Open), an `order-delivered` that order (Shipped →
   * Delivered, no shipment any more). Not counted as a request, no latency, no
   * replay: a subscriber gets the events from now on.
   */
  public readonly push$: Observable<PushEvent> = this.backend.push$;
}
