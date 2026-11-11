import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { Price, Product, Stock } from '../console.types';

/**
 * The product service: names only, one product per call or by search. There
 * is no batch endpoint and no "whole catalog" call. Public: works signed out.
 */
@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** One product per call. 404 for an unknown sku. */
  public product(sku: string): Observable<Product> {
    return this.http.read('product', sku, 'public', () =>
      this.backend.product(sku),
    );
  }

  /** Server-side search by name, at most `PRODUCT_SEARCH_LIMIT` hits. Empty text: no hits. */
  public searchProducts(text: string): Observable<Product[]> {
    return this.http.read('searchProducts', text, 'public', () =>
      this.backend.searchProducts(text),
    );
  }
}

/** The pricing service: current prices. Public. */
@Injectable({ providedIn: 'root' })
export class PricingApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Up to `MAX_BATCH` skus per call (400 above). Order lines keep the price they were sold at. */
  public prices(skus: string[]): Observable<Price[]> {
    return this.http.read('prices', skus, 'public', () =>
      this.backend.prices(skus),
    );
  }
}

/** The inventory service: stock, one sku per call (no batch endpoint). Public. */
@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** One sku per call. Changes when orders change. 404 for an unknown sku. */
  public stock(sku: string): Observable<Stock> {
    return this.http.read('stock', sku, 'public', () =>
      this.backend.stock(sku),
    );
  }
}
