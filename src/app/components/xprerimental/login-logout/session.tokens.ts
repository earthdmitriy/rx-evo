import { inject, InjectionToken } from '@angular/core';
import { faker } from '@faker-js/faker';
import { BehaviorSubject, map, shareReplay, switchMap } from 'rxjs';
import { BucketApiService } from '../../../services/api/BucketApi.service';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import { clientCount } from '../../../services/consts';
import { prepareBucket } from '../../../services/utils';
import {
  combineStatefulObservables,
  statefulObservable,
} from '../../../submodules/stateful-observable/src';
import { allProductsToken } from '../../wip/stateful-observable/products-store.service';

/** Session flag: `true` while a user is logged in. */
export const loggedInToken = new InjectionToken('loggedIn', {
  providedIn: 'root',
  factory: () => new BehaviorSubject<boolean>(false),
});

/**
 * Profile of the logged-in user. No input: in a real app the server knows the
 * user from the session cookie. Here the loader picks a random client, so each
 * session is a different "user". `active` drops the stream to inactive on
 * logout and clears its cache, so nothing of the previous user is reused.
 */
export const profileToken = new InjectionToken('profile', {
  providedIn: 'root',
  factory: () => {
    const api = inject(ClientApiService);
    return statefulObservable({
      loader: () =>
        api.getClient$(faker.number.int({ min: 1, max: clientCount - 1 })),
      active: inject(loggedInToken),
      name: 'profile',
    })
      .pipeError(map(() => "Can't load profile"))
      .pipe(shareReplay(1));
  },
});

/**
 * Data derived from the profile: the user's bucket, requested inside the
 * profile's own chain (`pipeValue(switchMap(...))`). It inherits the profile's
 * states: inactive after logout, pending while the next profile and then its
 * bucket load, and it can never pair a new profile with an old bucket. The
 * catalog is public data and is not gated by the session.
 */
export const profileBucketToken = new InjectionToken('profileBucket', {
  providedIn: 'root',
  factory: () => {
    const api = inject(BucketApiService);
    const bucket = inject(profileToken)
      .pipeValue(switchMap((user) => api.getClientBucket$(user.clientId)))
      .pipeError(map(() => "Can't load bucket"));

    return combineStatefulObservables(
      [bucket, inject(allProductsToken)],
      ([clientBucket, products]) => prepareBucket(clientBucket, products),
    ).pipe(shareReplay(1));
  },
});
