import { Injectable, signal, WritableSignal } from '@angular/core';

/**
 * Version counters bumped by writes, folded into a `rxResource`'s `params`
 * so a bump forces a refetch even though the id did not change. A
 * `resource()` has no cache of its own for another component to invalidate
 * (R-L9/R-L10's gap): the write's own resource updates itself locally via
 * `WritableResource.set()`; everything else that depends on the same data
 * depends on one of these instead.
 */
@Injectable({ providedIn: 'root' })
export class Bus {
  readonly orders = signal(0);
  readonly orderStats = signal(0);
  readonly stock = signal(0);
  readonly tickets = signal(0);
  readonly ticketsByOrder = signal(0);
  readonly ticketCounts = signal(0);

  bump(...topics: WritableSignal<number>[]) {
    topics.forEach((topic) => topic.update((v) => v + 1));
  }
}
