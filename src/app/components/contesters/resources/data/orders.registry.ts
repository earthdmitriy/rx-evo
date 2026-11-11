import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { OrdersApi } from '../../../../services/contesters';

/** One customer's orders resource, made with the injector of the registry (so it needs no component). */
const makeOrdersResource = (api: OrdersApi, injector: Injector, id: number) =>
  rxResource({
    injector,
    params: () => id,
    stream: ({ params }) => api.orders(params),
  });

/**
 * The shared orders of the session: one `rxResource` per (customer, write
 * version). The version is the `Bus` counter a write bumps, so a write makes a
 * new key. The Orders tab and the shipments rail read the same resource for
 * their customer, so the orders are requested once. Nothing loads before a
 * component asks. Provided by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class OrdersRegistry {
  private readonly api = inject(OrdersApi);
  private readonly injector = inject(Injector);
  private readonly byKey = new Map<
    string,
    ReturnType<typeof makeOrdersResource>
  >();

  /** The customer's orders at this write version, shared by every component that shows them. */
  orders(id: number, version: number) {
    const key = `${id}:${version}`;
    let res = this.byKey.get(key);
    if (!res) {
      res = makeOrdersResource(this.api, this.injector, id);
      this.byKey.set(key, res);
    }
    return res;
  }
}
