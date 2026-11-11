import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CustomersApi } from '../../../../services/contesters';

/** One customer's tier resource, made with the injector of the registry (so it needs no component). */
const makeTierResource = (api: CustomersApi, injector: Injector, id: number) =>
  rxResource({
    injector,
    params: () => id,
    stream: ({ params }) => api.tiers([params]).pipe(map(([t]) => t.tier)),
  });

/**
 * The shared customer tiers of the session: one `rxResource` per customer id. A
 * list row shown again, or the same customer in another section, finds the tier
 * already loaded. Nothing loads before a component asks. Provided by the
 * signed-in frame, so it goes with the session.
 */
@Injectable()
export class TiersRegistry {
  private readonly api = inject(CustomersApi);
  private readonly injector = inject(Injector);
  private readonly byId = new Map<
    number,
    ReturnType<typeof makeTierResource>
  >();

  /** The customer's tier, shared by every component that shows it. */
  tier(id: number) {
    let res = this.byId.get(id);
    if (!res) {
      res = makeTierResource(this.api, this.injector, id);
      this.byId.set(id, res);
    }
    return res;
  }
}
