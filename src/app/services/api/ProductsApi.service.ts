import { inject, Injectable } from '@angular/core';
import { faker } from '@faker-js/faker';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../app.config';
import { productCount, fastDelayMs, randomDelayMs } from '../consts';
import { EventBusService } from '../EventBus.service';
import { RequestMonitorService } from '../RequestMonitor.service';
import { mapToError, randomDelay } from '../utils';

export type Product = {
  productId: number;
  name: string;
  descripton: string;
  material: string;
  price: string;
};

const createProduct = (id: number) => ({
  productId: id,
  name: faker.commerce.product(),
  descripton: faker.commerce.productDescription(),
  material: faker.commerce.productMaterial(),
  price: faker.commerce.price(),
});

@Injectable({
  providedIn: 'root',
})
export class ProductsApiService {
  private readonly logKey = 'product';
  private readonly skipDelay = inject(SKIPDELAY_TOKEN);
  private readonly slowApi$ = inject(EventBusService).slowApi$;
  private readonly maxDelay = () =>
    this.slowApi$.value ? randomDelayMs : fastDelayMs;
  private readonly monitor = inject(RequestMonitorService);
  private readonly throwError$ = inject(EventBusService).throwProductApiError$;

  private readonly cachedProducts: { [id: number]: Product } = new Array(
    productCount,
  )
    .fill(0)
    .map((_, idx) => createProduct(idx))
    .reduce(
      (acc, product) => ((acc[product.productId] = product), acc),
      {} as { [id: number]: Product },
    );

  public getProduct$(productId: number) {
    const cached =
      this.cachedProducts[productId] ??
      (this.cachedProducts[productId] = {
        productId: productId,
        name: faker.commerce.product(),
        descripton: faker.commerce.productDescription(),
        material: faker.commerce.productMaterial(),
        price: faker.commerce.price(),
      });
    return of(cached).pipe(
      randomDelay(this.skipDelay, this.logKey, productId, this.maxDelay),
      mapToError(this.throwError$),
      this.monitor.track('product'),
    );
  }

  public getProducts$(productIds: number[]) {
    return forkJoin(productIds.map((id) => this.getProduct$(id)));
  }

  public allProducts$() {
    return of(
      Object.keys(this.cachedProducts).map((id) => this.cachedProducts[+id]),
    ).pipe(
      randomDelay(this.skipDelay, this.logKey, undefined, this.maxDelay),
      mapToError(this.throwError$),
      this.monitor.track('product'),
    );
  }

  public allProductsProm() {
    return firstValueFrom(this.allProducts$());
  }
}
