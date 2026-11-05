import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';

export type ApiKey = 'client' | 'bucket' | 'product';
export type RequestOutcome = 'idle' | 'ok' | 'error' | 'cancelled';

export type ApiStats = {
  inFlight: number;
  total: number;
  ok: number;
  errors: number;
  cancelled: number;
  last: RequestOutcome;
};

const emptyStats = (): ApiStats => ({
  inFlight: 0,
  total: 0,
  ok: 0,
  errors: 0,
  cancelled: 0,
  last: 'idle',
});

/**
 * Demo instrumentation: counts what the fake APIs actually do, so the demo
 * controls can show duplicated, cancelled and failed requests.
 * Not part of any sample's data flow.
 */
@Injectable({ providedIn: 'root' })
export class RequestMonitorService {
  private readonly state = signal<Record<ApiKey, ApiStats>>({
    client: emptyStats(),
    bucket: emptyStats(),
    product: emptyStats(),
  });

  public readonly stats = this.state.asReadonly();
  public readonly client = computed(() => this.state().client);
  public readonly bucket = computed(() => this.state().bucket);
  public readonly product = computed(() => this.state().product);

  /** Every subscription is one request: started → ok | error | cancelled. */
  public track(key: ApiKey) {
    return <T>(source: Observable<T>): Observable<T> =>
      new Observable<T>((subscriber) => {
        let settled = false;
        this.patch(key, (s) => ({
          ...s,
          inFlight: s.inFlight + 1,
          total: s.total + 1,
        }));
        const settle = (outcome: Exclude<RequestOutcome, 'idle'>) => {
          if (settled) return;
          settled = true;
          this.patch(key, (s) => ({
            ...s,
            inFlight: Math.max(0, s.inFlight - 1),
            last: outcome,
            ok: s.ok + (outcome === 'ok' ? 1 : 0),
            errors: s.errors + (outcome === 'error' ? 1 : 0),
            cancelled: s.cancelled + (outcome === 'cancelled' ? 1 : 0),
          }));
        };
        const sub = source.subscribe({
          next: (value) => {
            settle('ok');
            subscriber.next(value);
          },
          error: (err) => {
            settle('error');
            subscriber.error(err);
          },
          complete: () => {
            settle('ok');
            subscriber.complete();
          },
        });
        return () => {
          sub.unsubscribe();
          settle('cancelled');
        };
      });
  }

  /** Clears counters (keeps requests that are still in flight). */
  public resetCounters() {
    this.state.update(
      (all) =>
        Object.fromEntries(
          Object.entries(all).map(([key, s]) => [
            key,
            {
              ...emptyStats(),
              inFlight: s.inFlight,
              last: s.inFlight ? s.last : 'idle',
            },
          ]),
        ) as Record<ApiKey, ApiStats>,
    );
  }

  private patch(key: ApiKey, fn: (s: ApiStats) => ApiStats) {
    this.state.update((all) => ({ ...all, [key]: fn(all[key]) }));
  }
}
