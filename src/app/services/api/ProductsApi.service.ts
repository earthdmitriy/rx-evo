import { inject, Injectable } from '@angular/core';
import { faker } from '@faker-js/faker';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../app.config';
import { productCount } from '../consts';
import { EventBusService } from '../EventBus.service';
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
      randomDelay(this.skipDelay, this.logKey, productId),
      mapToError(this.throwError$),
    );
  }

  public getProducts$(productIds: number[]) {
    return forkJoin(productIds.map((id) => this.getProduct$(id)));
  }

  public allProducts$() {
    return of(
      Object.keys(this.cachedProducts).map((id) => this.cachedProducts[+id]),
    ).pipe(
      randomDelay(this.skipDelay, this.logKey),
      mapToError(this.throwError$),
    );
  }

  public allProductsProm() {
    return firstValueFrom(this.allProducts$());
  }
}
