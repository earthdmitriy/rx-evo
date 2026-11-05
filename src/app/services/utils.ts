import {
  defer,
  delay,
  interval,
  map,
  Observable,
  of,
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

/**
 * Simulated network latency. The delay is picked per subscription, so the
 * "API speed" switch applies to every new request, including deferred ones.
 */
export const randomDelay =
  (
    skipDelay: boolean,
    logKey = '',
    arg: unknown = '',
    maxDelayMs: () => number = () => randomDelayMs,
  ) =>
  <T>(source: Observable<T>): Observable<T> =>
    defer(() =>
      source.pipe(
        tap(() => console.log(`request ${logKey} start arg ${arg}`)),
        delay<T>(skipDelay ? 10 : Math.random() * maxDelayMs()),
        tap({
          next: () => console.log(`request ${logKey} end`),
          unsubscribe: () => console.log(`request ${logKey} unsubsribe`),
        }),
      ),
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
    // tap((x) => console.log(`counter ${x}`)),
  );
