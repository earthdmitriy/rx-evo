import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import {
  OrderDetail,
  OrderLineChange,
  OrderRow,
  OrderStats,
} from '../console.types';

/** The orders service: a customer's orders and stats, one order, changes to it. */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Newest first. */
  public orders(customerId: number): Observable<OrderRow[]> {
    return this.http.read('orders', customerId, 'user', () =>
      this.backend.orders(customerId),
    );
  }

  /** Number of orders, lifetime spend, average order, last order date. */
  public orderStats(customerId: number): Observable<OrderStats> {
    return this.http.read('orderStats', customerId, 'user', () =>
      this.backend.orderStats(customerId),
    );
  }

  /** Lines by sku with the price they were sold at, address, payment. No ticket link (see `TicketsApi.ticketsByOrder`). */
  public order(orderId: string): Observable<OrderDetail> {
    return this.http.read('order', orderId, 'user', () =>
      this.backend.order(orderId),
    );
  }

  /**
   * Replaces the order's lines (`qty: 0` or a missing sku removes a line);
   * existing lines keep their price, new lines get the current price. With
   * `reply`, also posts the agent's message on that ticket and sets it to
   * Waiting, in the same call.
   *
   * Errors: 409 when the order has shipped or a product is out of stock;
   * 400 for no lines or an empty reply; 404 for an unknown sku.
   * Changes on the server: the order, the customer's order stats, stock and
   * activity; with `reply`, the ticket.
   */
  public updateOrder(
    orderId: string,
    lines: OrderLineChange[],
    reply?: { ticketId: string; text: string },
  ): Observable<OrderDetail> {
    return this.http.write(
      'updateOrder',
      { orderId, lines, reply },
      'user',
      () => this.backend.updateOrder(orderId, lines, reply),
    );
  }

  public resendConfirmation(orderId: string): Observable<void> {
    return this.http.write('resendConfirmation', orderId, 'user', () =>
      this.backend.resendConfirmation(orderId),
    );
  }
}
