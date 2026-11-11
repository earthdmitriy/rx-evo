import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CartApi } from '../../../../services/contesters';

/** One customer's cart resource, made with the injector of the registry (so it needs no component). */
const makeCartResource = (api: CartApi, injector: Injector, id: number) =>
  rxResource({
    injector,
    params: () => id,
    stream: ({ params }) => api.cart(params),
  });

/**
 * The shared carts of the session: one `rxResource` per customer. A tab shown
 * again finds its cart already loaded. Nothing loads before a component asks.
 * Provided by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class CartRegistry {
  private readonly api = inject(CartApi);
  private readonly injector = inject(Injector);
  private readonly byId = new Map<
    number,
    ReturnType<typeof makeCartResource>
  >();

  /** The customer's cart, shared by every component that shows it. */
  cart(id: number) {
    let res = this.byId.get(id);
    if (!res) {
      res = makeCartResource(this.api, this.injector, id);
      this.byId.set(id, res);
    }
    return res;
  }
}
