import { inject, Injectable, Injector } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TicketsApi } from '../../../../services/contesters';

/** One customer's open-ticket count resource, made with the injector of the registry (so it needs no component). */
const makeTicketCountResource = (
  api: TicketsApi,
  injector: Injector,
  id: number,
) =>
  rxResource({
    injector,
    params: () => id,
    stream: ({ params }) => api.ticketCounts([params]).pipe(map(([c]) => c)),
  });

/**
 * The shared open-ticket counts of the session: one `rxResource` per (customer,
 * write version), the version being the `Bus` counter for ticket counts. A list
 * row, the header KPI and the Tickets badge of one customer read the same
 * resource, so the count is requested once per customer. Nothing loads before a
 * component asks. Provided by the signed-in frame, so it goes with the session.
 */
@Injectable()
export class TicketCountsRegistry {
  private readonly api = inject(TicketsApi);
  private readonly injector = inject(Injector);
  private readonly byKey = new Map<
    string,
    ReturnType<typeof makeTicketCountResource>
  >();

  /** The customer's open-ticket count at this version, shared by every component that shows it. */
  ticketCount(id: number, version: number) {
    const key = `${id}:${version}`;
    let res = this.byKey.get(key);
    if (!res) {
      res = makeTicketCountResource(this.api, this.injector, id);
      this.byKey.set(key, res);
    }
    return res;
  }
}
