import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map, of } from 'rxjs';
import { MAX_BATCH, PricingApi } from '../../../../services/contesters';

const chunk = <T>(items: T[], size: number): T[][] => {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    groups.push(items.slice(i, i + size));
  return groups;
};

/** One cart's prices resource (the skus of a cart, in groups of `MAX_BATCH`), made with the registry's injector. */
const makeCartPricesResource = (
  api: PricingApi,
  injector: Injector,
  skus: string[],
) =>
  rxResource({
    injector,
    params: () => skus,
    stream: ({ params }) => {
      const groups = chunk(params, MAX_BATCH);
      return (
        groups.length
          ? forkJoin(groups.map((group) => api.prices(group)))
          : of([[]])
      ).pipe(map((all) => all.flat()));
    },
  });

/**
 * The shared cart prices of the session: one `rxResource` per list of skus (a
 * cart's lines). The cart total batches its prices; a tab shown again asks for
 * the same list, so it finds the answer already loaded. Nothing loads before a
 * component asks. Provided by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class CartPricesRegistry {
  private readonly api = inject(PricingApi);
  private readonly injector = inject(Injector);
  private readonly byKey = new Map<
    string,
    ReturnType<typeof makeCartPricesResource>
  >();

  /** The prices of these skus, shared by every component that totals them. */
  prices(skus: string[]) {
    const key = skus.join(',');
    let res = this.byKey.get(key);
    if (!res) {
      res = makeCartPricesResource(this.api, this.injector, skus);
      this.byKey.set(key, res);
    }
    return res;
  }
}
