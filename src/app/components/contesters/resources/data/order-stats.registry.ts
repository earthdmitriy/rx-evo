import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { OrdersApi } from '../../../../services/contesters';

/** One customer's order stats resource, made with the injector of the registry (so it needs no component). */
const makeOrderStatsResource = (
  api: OrdersApi,
  injector: Injector,
  id: number,
) =>
  rxResource({
    injector,
    params: () => id,
    stream: ({ params }) => api.orderStats(params),
  });

/**
 * The shared order stats of the session: one `rxResource` per (customer, write
 * version), the version being the `Bus` counter for the stats. The KPI strip
 * and the Orders badge read the same resource for their customer, so the stats
 * are requested once. Nothing loads before a component asks. Provided by the
 * signed-in frame, so it goes with the session.
 */
@Injectable()
export class OrderStatsRegistry {
  private readonly api = inject(OrdersApi);
  private readonly injector = inject(Injector);
  private readonly byKey = new Map<
    string,
    ReturnType<typeof makeOrderStatsResource>
  >();

  /** The customer's order stats at this version, shared by every KPI that shows them. */
  orderStats(id: number, version: number) {
    const key = `${id}:${version}`;
    let res = this.byKey.get(key);
    if (!res) {
      res = makeOrderStatsResource(this.api, this.injector, id);
      this.byKey.set(key, res);
    }
    return res;
  }
}
