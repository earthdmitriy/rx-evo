import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, shareReplay } from 'rxjs';
import {
  Product,
  ProductsApiService,
} from '../../../services/api/ProductsApi.service';
import {
  combineStatefulObservables,
  statefulObservable,
  StatefulObservable,
} from '../../../submodules/stateful-observable/src';

/**
 * shared data
 */
@Injectable({
  providedIn: 'root',
})
export class ProductsStoreService {
  private readonly productsApi = inject(ProductsApiService);

  public readonly store = statefulObservable({
    loader: () => this.productsApi.allProducts$(),
  })
    .pipe(shareReplay(1))
    .pipeError(map(() => "Can't load products"));

  private readonly productByIdStore: {
    [id: number]: StatefulObservable<Product>;
  } = {};

  public getStoreById(id: number) {
    return (this.productByIdStore[id] ??= statefulObservable({
      loader: () => this.productsApi.getProduct$(id),
    }));
  }

  public getCombinedStoreByIds(ids: number[]) {
    const stores = ids.map((id) => this.getStoreById(id));
    return combineStatefulObservables(stores, (products) => products);
  }
}

export const allProductsToken = new InjectionToken('allProducts', {
  providedIn: 'root',
  factory: () => {
    const api = inject(ProductsApiService);
    return statefulObservable(() => api.allProducts$())
      .pipeError(map(() => "Can't load products"))
      .pipe(shareReplay(1));
  },
});
