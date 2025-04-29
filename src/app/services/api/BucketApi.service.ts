import { inject, Injectable } from '@angular/core';
import { faker } from '@faker-js/faker';
import { firstValueFrom, of } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../app.config';
import { clientCount, maxBucketSize, productCount } from '../consts';
import { EventBusService } from '../EventBus.service';
import { mapToError, randomDelay } from '../utils';

export type Bucket = {
  clientId: number;
  products: {
    productId: number;
    amount: number;
  }[];
};

const createBucket = (clientId: number) => ({
  clientId,
  products: new Array(faker.number.int({ min: 2, max: maxBucketSize }))
    .fill(0)
    .map((_) => ({
      productId: faker.number.int({ min: 2, max: productCount }),
      amount: faker.number.int({ min: 1, max: 10 }),
    })),
});

@Injectable({
  providedIn: 'root',
})
export class BucketApiService {
  private readonly logKey = 'bucket';
  private readonly skipDelay = inject(SKIPDELAY_TOKEN);
  private readonly throwError$ = inject(EventBusService).throwBucketApiError$;

  private readonly cachedBuckets: { [id: number]: Bucket } = new Array(
    clientCount,
  )
    .fill(0)
    .reduce(
      (acc, _, idx) => ((acc[idx] = createBucket(idx)), acc),
      {} as { [id: number]: Bucket },
    );

  public getClientBucket$(clientId: number) {
    const cached =
      this.cachedBuckets[clientId] ??
      (this.cachedBuckets[clientId] = createBucket(clientId));

    return of(cached).pipe(
      randomDelay(this.skipDelay, this.logKey, clientId),
      mapToError(this.throwError$),
    );
  }

  public getClientBucketProm(id: number) {
    return firstValueFrom(this.getClientBucket$(id));
  }

  public allBuckets$() {
    return of(
      Object.keys(this.cachedBuckets).map((id) => this.cachedBuckets[+id]),
    ).pipe(
      randomDelay(this.skipDelay, this.logKey),
      mapToError(this.throwError$),
    );
  }
}
