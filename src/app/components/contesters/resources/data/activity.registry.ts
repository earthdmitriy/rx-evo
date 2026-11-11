import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivityApi } from '../../../../services/contesters';

/** One customer's activity resource, made with the injector of the registry (so it needs no component). */
const makeActivityResource = (
  api: ActivityApi,
  injector: Injector,
  id: number,
) =>
  rxResource({
    injector,
    params: () => id,
    stream: ({ params }) => api.activity(params),
  });

/**
 * The shared activity of the session: one `rxResource` per customer. A rail
 * shown again finds its activity already loaded; the poll that keeps it fresh
 * reloads the shared resource. Nothing loads before a component asks. Provided
 * by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class ActivityRegistry {
  private readonly api = inject(ActivityApi);
  private readonly injector = inject(Injector);
  private readonly byId = new Map<
    number,
    ReturnType<typeof makeActivityResource>
  >();

  /** The customer's activity, shared by every component that shows it. */
  activity(id: number) {
    let res = this.byId.get(id);
    if (!res) {
      res = makeActivityResource(this.api, this.injector, id);
      this.byId.set(id, res);
    }
    return res;
  }
}
