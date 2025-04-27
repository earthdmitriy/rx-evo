import { inject, Injectable } from '@angular/core';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { createTinyRxStore } from '../../../services/tinyStore/tinyRxStore';

/**
 * shared data
 */
@Injectable({
  providedIn: 'root',
})
export class ProductsStoreService {
  private readonly productsApi = inject(ProductsApiService);

  public readonly store = createTinyRxStore({
    loader: () => this.productsApi.allProducts$(),
    processError: () => "Can't load products",
  });
}
