import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CustomersApi } from '../../../../services/contesters';

/** One customer-list query's resource, made with the injector of the registry (so it needs no component). */
const makeListResource = (
  api: CustomersApi,
  injector: Injector,
  queryKey: string,
) =>
  rxResource({
    injector,
    params: () => queryKey,
    stream: ({ params }) => api.searchCustomers(JSON.parse(params)),
  });

/**
 * The shared customer lists of the session: one `rxResource` per query key (the
 * filter, sort, page and text of the list). A list shown again with a query it
 * has had finds that page already loaded. Nothing loads before a component
 * asks. Provided by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class CustomerListRegistry {
  private readonly api = inject(CustomersApi);
  private readonly injector = inject(Injector);
  private readonly byKey = new Map<
    string,
    ReturnType<typeof makeListResource>
  >();

  /** The list page of a query key, shared by every component that shows it. */
  page(queryKey: string) {
    let res = this.byKey.get(queryKey);
    if (!res) {
      res = makeListResource(this.api, this.injector, queryKey);
      this.byKey.set(queryKey, res);
    }
    return res;
  }
}
