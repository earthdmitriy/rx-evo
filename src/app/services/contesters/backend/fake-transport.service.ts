import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, Subscription, timer } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../../app.config';
import { fastDelayMs, randomDelayMs } from '../../consts';
import { CONSOLE_API_KEYS, ConsoleApiKey } from './api-keys';
import { FakeBackend } from './fake-backend.service';
import { copyJson, httpError } from './http-error';

export type LatencyMode = 'slow' | 'fast' | 'manual';

export type CallStats = {
  total: number;
  ok: number;
  errors: number;
  cancelled: number;
  inFlight: number;
};

export type PendingCall = {
  readonly id: number;
  readonly key: ConsoleApiKey;
  readonly arg: unknown;
  readonly release: () => void;
  readonly fail: (error?: unknown) => void;
};

/** Who may call: `user` needs a session (401 otherwise), `public` does not. */
export type CallScope = 'user' | 'public';

const emptyStats = (): CallStats => ({
  total: 0,
  ok: 0,
  errors: 0,
  cancelled: 0,
  inFlight: 0,
});

const readLatency = (): LatencyMode => {
  const value =
    typeof location === 'undefined'
      ? null
      : new URLSearchParams(location.search).get('latency');
  return value === 'fast' || value === 'manual' ? value : 'slow';
};

/**
 * The network between the console and the fake backend: latency, faults,
 * the session check and request counters. The test harness drives it; data
 * layers never touch it.
 *
 * - **Reads** (`read`) run when the request arrives: unsubscribing before
 *   that cancels the request, and the backend never sees it.
 * - **Writes** (`write`) are sent on subscribe and always reach the backend:
 *   unsubscribing only drops the response, as with a real server.
 */
@Injectable({ providedIn: 'root' })
export class FakeTransport {
  private readonly backend = inject(FakeBackend);
  private readonly skipDelay = inject(SKIPDELAY_TOKEN);

  public readonly latency = signal<LatencyMode>(readLatency());
  /** Throw switch per key: the call fails with a 500. */
  public readonly faults = signal<Partial<Record<ConsoleApiKey, boolean>>>({});

  private readonly statsState = signal(
    Object.fromEntries(
      CONSOLE_API_KEYS.map((k) => [k, emptyStats()]),
    ) as Record<ConsoleApiKey, CallStats>,
  );
  public readonly stats = this.statsState.asReadonly();

  private readonly pending: PendingCall[] = [];
  private nextId = 0;
  /** Every call started since the last `resetStats`, with its argument (batch sizes, which ids were asked for). */
  private readonly log: { key: ConsoleApiKey; arg: unknown }[] = [];

  /** Calls started since the last `resetStats`, oldest first. */
  public calls(
    key?: ConsoleApiKey,
  ): readonly { key: ConsoleApiKey; arg: unknown }[] {
    return this.log.filter((c) => !key || c.key === key);
  }

  public setFault(key: ConsoleApiKey, on: boolean) {
    this.faults.update((all) => ({ ...all, [key]: on }));
  }

  public resetStats() {
    this.log.length = 0;
    this.statsState.update(
      (all) =>
        Object.fromEntries(
          Object.entries(all).map(([k, s]) => [
            k,
            { ...emptyStats(), inFlight: s.inFlight },
          ]),
        ) as Record<ConsoleApiKey, CallStats>,
    );
  }

  /** Requests waiting for a manual release, oldest first. */
  public pendingCalls(key?: ConsoleApiKey): readonly PendingCall[] {
    return this.pending.filter((c) => !key || c.key === key);
  }

  /** A read: answered by `respond` when the request arrives, cancellable. */
  public read<T>(
    key: ConsoleApiKey,
    arg: unknown,
    scope: CallScope,
    respond: () => T,
  ): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.count(key, 'start');
      this.log.push({ key, arg });
      let settled = false;
      const settle = (outcome: 'ok' | 'errors' | 'cancelled') => {
        if (settled) return;
        settled = true;
        this.count(key, outcome);
      };
      const arrival = this.arrival(key, arg).subscribe({
        next: () => {
          try {
            const value = this.answer(key, scope, respond);
            settle('ok');
            subscriber.next(value);
            subscriber.complete();
          } catch (error) {
            settle('errors');
            subscriber.error(error);
          }
        },
        error: (error) => {
          settle('errors');
          subscriber.error(error);
        },
      });
      return () => {
        arrival.unsubscribe();
        settle('cancelled');
      };
    });
  }

  /**
   * A write: reaches the backend even if the subscriber leaves, then applies
   * `apply` there. The session is checked when the request is sent.
   */
  public write<T>(
    key: ConsoleApiKey,
    arg: unknown,
    scope: CallScope,
    apply: () => T,
  ): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.count(key, 'start');
      this.log.push({ key, arg });
      const allowed = scope === 'public' || this.backend.session() !== null;
      let listening = true;
      let settled = false;
      const settle = (outcome: 'ok' | 'errors' | 'cancelled') => {
        if (settled) return;
        settled = true;
        this.count(key, outcome);
      };
      // not tied to the subscriber: the server finishes the work anyway
      const flight: Subscription = this.arrival(key, arg).subscribe({
        next: () => {
          let value: T;
          try {
            if (!allowed) throw httpError(401, 'Not signed in', key);
            value = this.answer(key, 'public', apply);
          } catch (error) {
            settle('errors');
            if (listening) subscriber.error(error);
            return;
          }
          settle('ok');
          if (listening) {
            subscriber.next(value);
            subscriber.complete();
          }
        },
        error: (error) => {
          settle('errors');
          if (listening) subscriber.error(error);
        },
      });
      return () => {
        listening = false;
        if (!flight.closed && !settled) settle('cancelled');
      };
    });
  }

  private answer<T>(key: ConsoleApiKey, scope: CallScope, respond: () => T): T {
    if (this.faults()[key]) throw httpError(500, 'Internal server error', key);
    if (scope === 'user' && this.backend.session() === null)
      throw httpError(401, 'Not signed in', key);
    // a fresh copy: the client can never mutate the backend's tables
    return copyJson(respond());
  }

  /** Emits once when the request "arrives" at the backend. */
  private arrival(key: ConsoleApiKey, arg: unknown): Observable<void> {
    const mode = this.latency();
    if (mode !== 'manual') {
      const max = this.skipDelay
        ? 0
        : mode === 'slow'
          ? randomDelayMs
          : fastDelayMs;
      return timer(Math.random() * max).pipe(map(() => undefined));
    }
    return new Observable<void>((subscriber) => {
      const call: PendingCall = {
        id: this.nextId++,
        key,
        arg,
        release: () => {
          this.remove(call);
          subscriber.next();
          subscriber.complete();
        },
        fail: (error = httpError(500, 'Internal server error', key)) => {
          this.remove(call);
          subscriber.error(error);
        },
      };
      this.pending.push(call);
      return () => this.remove(call);
    });
  }

  private remove(call: PendingCall) {
    const index = this.pending.indexOf(call);
    if (index >= 0) this.pending.splice(index, 1);
  }

  private count(
    key: ConsoleApiKey,
    event: 'start' | 'ok' | 'errors' | 'cancelled',
  ) {
    this.statsState.update((all) => {
      const s = all[key];
      const next =
        event === 'start'
          ? { ...s, total: s.total + 1, inFlight: s.inFlight + 1 }
          : {
              ...s,
              [event]: s[event] + 1,
              inFlight: Math.max(0, s.inFlight - 1),
            };
      return { ...all, [key]: next };
    });
  }
}
