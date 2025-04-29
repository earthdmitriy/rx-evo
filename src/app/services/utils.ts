import {
  delay,
  interval,
  map,
  Observable,
  of,
  pipe,
  startWith,
  switchMap,
  tap,
  throwError,
  withLatestFrom,
} from 'rxjs';
import { Bucket } from './api/BucketApi.service';
import { Client } from './api/ClientApi.service';
import { Product } from './api/ProductsApi.service';
import { clientCount, randomDelayMs } from './consts';

export const randomDelay = <T>(
  skipDelay: boolean,
  logKey = '',
  arg: unknown = '',
) =>
  skipDelay
    ? pipe(
        tap(() => console.log(`request ${logKey} start arg ${arg}`)),
        delay<T>(10),
        tap({
          next: () => console.log(`request ${logKey} end`),
          unsubscribe: () => console.log(`request ${logKey} unsubsribe`),
        }),
      )
    : pipe(
        tap({
          next: () => console.log(`request ${logKey} start arg ${arg}`),
          unsubscribe: () => console.log(`request ${logKey} unsubsribe`),
        }),
        delay<T>(Math.random() * randomDelayMs),
        tap({
          next: () => console.log(`request ${logKey} end`),
          unsubscribe: () => console.log(`request ${logKey} unsubsribe`),
        }),
      );

export const mapToError =
  <T>(error: Observable<boolean>) =>
  (source: Observable<T>) =>
    source.pipe(
      withLatestFrom(error),
      switchMap(([data, err]) =>
        err ? throwError(() => 'some error') : of(data),
      ),
    ) as Observable<T>;

export type PopulatedBucket = {
  goods: { product: Product; amount: number }[];
  total: number;
};
export type ClientWithBucket = {
  clientInfo: Client;
  bucket: PopulatedBucket;
};

export const prepareData = (
  client: Client,
  bucket: Bucket,
  products: Product[],
): ClientWithBucket => ({
  clientInfo: client,
  bucket: prepareBucket(bucket, products),
});

export const prepareBucket = (
  bucket: Bucket,
  products: Product[],
): PopulatedBucket => {
  const productById = products.reduce(
    (acc, product) => ((acc[product.productId] = product), acc),
    {} as { [key: number]: Product },
  );
  const goods = bucket.products.map((p) => ({
    product: productById[p.productId],
    amount: p.amount,
  }));
  const total = goods.reduce(
    (acc, product) => acc + product.amount * +product.product.price,
    0,
  );
  return {
    goods,
    total,
  };
};

export const createCounter$ = (initial: number = 0) =>
  interval(10000).pipe(
    map((num) => ((initial + num + 1) % clientCount) + 1),
    startWith(1),
    tap((x) => console.log(`counter ${x}`)),
  );
