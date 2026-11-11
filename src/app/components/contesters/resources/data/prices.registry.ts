import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PricingApi } from '../../../../services/contesters';

/** One sku's price resource, made with the injector of the registry (so it needs no component). */
const makePriceResource = (api: PricingApi, injector: Injector, sku: string) =>
  rxResource({
    injector,
    params: () => sku,
    stream: ({ params }) => api.prices([params]).pipe(map(([p]) => p)),
  });

/**
 * The shared prices of the session: one `rxResource` per sku. The price field
 * of a product, the cart's line total and the editor's Add read the same
 * resource, so a price is requested once per sku. Nothing loads before a
 * component asks. Provided by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class PricesRegistry {
  private readonly api = inject(PricingApi);
  private readonly injector = inject(Injector);
  private readonly bySku = new Map<
    string,
    ReturnType<typeof makePriceResource>
  >();

  /** The price entry of a sku (`price` is the amount), shared by every component that shows it. */
  price(sku: string) {
    let res = this.bySku.get(sku);
    if (!res) {
      res = makePriceResource(this.api, this.injector, sku);
      this.bySku.set(sku, res);
    }
    return res;
  }
}
