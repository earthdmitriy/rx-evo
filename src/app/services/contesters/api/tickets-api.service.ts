import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import {
  TicketCount,
  TicketRow,
  TicketStatus,
  TicketThread,
} from '../console.types';

/** The tickets service. Support answers tickets; only customers open them. */
@Injectable({ providedIn: 'root' })
export class TicketsApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** A customer's tickets, most recently updated first. */
  public tickets(customerId: number): Observable<TicketRow[]> {
    return this.http.read('tickets', customerId, 'user', () =>
      this.backend.tickets(customerId),
    );
  }

  /** Tickets that mention an order: the only way from an order to its ticket. */
  public ticketsByOrder(orderId: string): Observable<TicketRow[]> {
    return this.http.read('ticketsByOrder', orderId, 'user', () =>
      this.backend.ticketsByOrder(orderId),
    );
  }

  /** Open-ticket counts for up to `MAX_BATCH` customers (400 above). */
  public ticketCounts(customerIds: number[]): Observable<TicketCount[]> {
    return this.http.read('ticketCounts', customerIds, 'user', () =>
      this.backend.ticketCounts(customerIds),
    );
  }

  /** The ticket with its whole thread; authors by id (customer id or agent directory id). */
  public ticket(ticketId: string): Observable<TicketThread> {
    return this.http.read('ticket', ticketId, 'user', () =>
      this.backend.ticket(ticketId),
    );
  }

  /** Posts the agent's reply and sets the status. 400 for an empty text. */
  public replyTicket(
    ticketId: string,
    text: string,
    status: TicketStatus,
  ): Observable<TicketThread> {
    return this.http.write('replyTicket', { ticketId, status }, 'user', () =>
      this.backend.replyTicket(ticketId, text, status),
    );
  }
}
