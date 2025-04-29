import { inject, Injectable } from '@angular/core';
import {
  Product,
  ProductsApiService,
} from '../../../services/api/ProductsApi.service';
import {
  combineTinyRxStores,
  createTinyRxStore,
  TinyRxStore,
} from '../../../services/tinyStore/tinyRxStore';

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

  private readonly productByIdStore: {
    [id: number]: TinyRxStore<Product, string>;
  } = {};

  public getStoreById(id: number) {
    return (this.productByIdStore[id] ??= createTinyRxStore({
      loader: () => this.productsApi.getProduct$(id),
      processError: (_, id) => `Can't load product ${id}`,
    }));
  }

  public getCombinedStoreByIds(ids: number[]) {
    const stores = ids.map((id) => this.getStoreById(id));
    return combineTinyRxStores(stores, (products) => products);
  }
}
