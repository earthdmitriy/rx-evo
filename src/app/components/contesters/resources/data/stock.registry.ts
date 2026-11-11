import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { InventoryApi } from '../../../../services/contesters';

/** One sku's stock resource, made with the injector of the registry (so it needs no component). */
const makeStockResource = (
  api: InventoryApi,
  injector: Injector,
  sku: string,
) =>
  rxResource({
    injector,
    params: () => sku,
    stream: ({ params }) => api.stock(params),
  });

/**
 * The shared stock of the session: one `rxResource` per (sku, write version),
 * the version being the `Bus` counter for stock. The stock field of a product
 * and the editor's Add read the same resource, so stock is requested once per
 * sku and version. Nothing loads before a component asks. Provided by the
 * signed-in frame, so it goes with the session.
 */
@Injectable()
export class StockRegistry {
  private readonly api = inject(InventoryApi);
  private readonly injector = inject(Injector);
  private readonly byKey = new Map<
    string,
    ReturnType<typeof makeStockResource>
  >();

  /** The stock entry of a sku at this version, shared by every component that shows it. */
  stock(sku: string, version: number) {
    const key = `${sku}:${version}`;
    let res = this.byKey.get(key);
    if (!res) {
      res = makeStockResource(this.api, this.injector, sku);
      this.byKey.set(key, res);
    }
    return res;
  }
}
