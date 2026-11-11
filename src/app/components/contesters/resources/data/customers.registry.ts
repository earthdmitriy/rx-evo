import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CustomersApi } from '../../../../services/contesters';

/** One customer's profile resource, made with the injector of the registry (so it needs no component). */
const makeCustomerResource = (
  api: CustomersApi,
  injector: Injector,
  id: number,
) =>
  rxResource({
    injector,
    params: () => id,
    stream: ({ params }) => api.customer(params),
  });

/**
 * The shared customer resources of the session: one `rxResource` per customer
 * id. The first component that asks for an id creates it, and every later
 * component gets the same one, so a customer loads once. Nothing loads before
 * something asks. Provided by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class CustomersRegistry {
  private readonly api = inject(CustomersApi);
  private readonly injector = inject(Injector);
  private readonly byId = new Map<
    number,
    ReturnType<typeof makeCustomerResource>
  >();

  /** The profile of a customer, shared by every component that shows it. */
  customer(id: number) {
    let res = this.byId.get(id);
    if (!res) {
      res = makeCustomerResource(this.api, this.injector, id);
      this.byId.set(id, res);
    }
    return res;
  }
}
