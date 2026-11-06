import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { Shipment } from '../console.types';

/** Carrier tracking, one order at a time. */
@Injectable({ providedIn: 'root' })
export class ShipmentsApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Only for in-flight orders (`IN_FLIGHT`); 404 for any other. */
  public shipment(orderId: string): Observable<Shipment> {
    return this.http.read('shipment', orderId, 'user', () => this.backend.shipment(orderId));
  }
}
