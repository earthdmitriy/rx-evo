import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ProductsApi } from '../../../../services/contesters';

/** One product's resource, made with the injector of the registry (so it needs no component). */
const makeProductResource = (
  api: ProductsApi,
  injector: Injector,
  sku: string,
) =>
  rxResource({
    injector,
    params: () => sku,
    stream: ({ params }) => api.product(params),
  });

/**
 * The shared products of the session: one `rxResource` per sku. A name field in
 * the cart, the order and the activity read the same resource. Nothing loads
 * before a component asks. Provided by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class ProductsRegistry {
  private readonly api = inject(ProductsApi);
  private readonly injector = inject(Injector);
  private readonly bySku = new Map<
    string,
    ReturnType<typeof makeProductResource>
  >();

  /** The product of a sku, shared by every component that shows its name. */
  product(sku: string) {
    let res = this.bySku.get(sku);
    if (!res) {
      res = makeProductResource(this.api, this.injector, sku);
      this.bySku.set(sku, res);
    }
    return res;
  }
}
