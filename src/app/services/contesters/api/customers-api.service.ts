import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { CustomerHit, CustomerProfile, CustomerQuery, CustomerTier, Page } from '../console.types';

/** The customer search service and the CRM. */
@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /**
   * Search service: filtered, sorted, paged (`CUSTOMER_PAGE_SIZE` per page).
   * Hits carry id, name and email only; tier and ticket counts live in other
   * services.
   */
  public searchCustomers(query: CustomerQuery): Observable<Page<CustomerHit>> {
    return this.http.read('customers', query, 'user', () => this.backend.searchCustomers(query));
  }

  /** CRM profile. No counters. 404 for an unknown id. */
  public customer(customerId: number): Observable<CustomerProfile> {
    return this.http.read('customer', customerId, 'user', () => this.backend.customer(customerId));
  }

  /** CRM tiers for up to `MAX_BATCH` customers (400 above). */
  public tiers(customerIds: number[]): Observable<CustomerTier[]> {
    return this.http.read('tiers', customerIds, 'user', () => this.backend.tiers(customerIds));
  }
}
