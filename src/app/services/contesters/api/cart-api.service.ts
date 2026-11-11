import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { CartLine } from '../console.types';

/** A customer's cart. Read-only for support. */
@Injectable({ providedIn: 'root' })
export class CartApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Skus and quantities only: names and prices come from the catalog. */
  public cart(customerId: number): Observable<CartLine[]> {
    return this.http.read('cart', customerId, 'user', () =>
      this.backend.cart(customerId),
    );
  }
}
