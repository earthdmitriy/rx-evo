import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { Price, Product, Stock } from '../console.types';

/**
 * The product service: names only, in batches or by search. There is no
 * "whole catalog" call. Public: works signed out.
 */
@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Up to `MAX_BATCH` skus per call (400 above); unknown skus are left out. */
  public products(skus: string[]): Observable<Product[]> {
    return this.http.read('products', skus, 'public', () => this.backend.products(skus));
  }

  /** Server-side search by name, at most `PRODUCT_SEARCH_LIMIT` hits. Empty text: no hits. */
  public searchProducts(text: string): Observable<Product[]> {
    return this.http.read('searchProducts', text, 'public', () => this.backend.searchProducts(text));
  }
}

/** The pricing service: current prices. Public. */
@Injectable({ providedIn: 'root' })
export class PricingApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Up to `MAX_BATCH` skus per call (400 above). Order lines keep the price they were sold at. */
  public prices(skus: string[]): Observable<Price[]> {
    return this.http.read('prices', skus, 'public', () => this.backend.prices(skus));
  }
}

/** The inventory service: stock. Public. */
@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Up to `MAX_BATCH` skus per call (400 above). Changes when orders change. */
  public stock(skus: string[]): Observable<Stock[]> {
    return this.http.read('stock', skus, 'public', () => this.backend.stock(skus));
  }
}
