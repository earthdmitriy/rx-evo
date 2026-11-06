import { ApplicationRef, inject, isDevMode } from '@angular/core';
import { CONSOLE_API_KEYS, ConsoleApiKey } from '../backend/api-keys';
import { FakeBackend } from '../backend/fake-backend.service';
import { CallStats, FakeTransport, LatencyMode } from '../backend/fake-transport.service';
import { httpError } from '../backend/http-error';

type Selector = { index?: number };

/**
 * `window.__api`: the e2e tests' handle on the fake backend (dev builds
 * only). Every call runs change detection afterwards, so the DOM reflects
 * the result when the call returns.
 */
export type ConsoleTestHook = {
  keys: readonly ConsoleApiKey[];
  pending(key?: ConsoleApiKey): { id: number; key: ConsoleApiKey; arg: unknown }[];
  release(key: ConsoleApiKey, selector?: Selector): boolean;
  releaseAll(key?: ConsoleApiKey): number;
  fail(key: ConsoleApiKey, selector?: Selector, status?: number): boolean;
  setThrow(key: ConsoleApiKey, on: boolean): void;
  setLatency(mode: LatencyMode): void;
  stats(): Record<ConsoleApiKey, CallStats>;
  /** Arguments of the calls started since `resetStats()`, oldest first. */
  calls(key: ConsoleApiKey): unknown[];
  /** What the backend holds right now: runs one of its service methods directly (no latency, counters or session check). */
  truth(method: keyof FakeBackend, ...args: unknown[]): unknown;
  resetStats(): void;
  /** Emits one push event now (signed in only); returns whether one was sent. */
  push(): boolean;
  /** Seeded cases the tests need (see `FakeBackend.testFixtures`). */
  fixtures(): ReturnType<FakeBackend['testFixtures']>;
};

declare global {
  interface Window {
    __api?: ConsoleTestHook;
  }
}

/** Installs `window.__api`; register with `provideAppInitializer`. */
export const installConsoleTestHook = () => {
  if (!isDevMode() || typeof window === 'undefined') return;
  const transport = inject(FakeTransport);
  const backend = inject(FakeBackend);
  const appRef = inject(ApplicationRef);
  const tick = <T>(result: T): T => {
    appRef.tick();
    return result;
  };
  const pick = (key: ConsoleApiKey, { index = 0 }: Selector = {}) => transport.pendingCalls(key)[index];

  window.__api = {
    keys: CONSOLE_API_KEYS,
    pending: (key) => transport.pendingCalls(key).map(({ id, key: k, arg }) => ({ id, key: k, arg })),
    release: (key, selector) => {
      const call = pick(key, selector);
      call?.release();
      return tick(!!call);
    },
    releaseAll: (key) => {
      const calls = [...transport.pendingCalls(key)];
      calls.forEach((call) => call.release());
      return tick(calls.length);
    },
    fail: (key, selector, status = 500) => {
      const call = pick(key, selector);
      call?.fail(httpError(status, status === 500 ? 'Internal server error' : 'Request failed', key));
      return tick(!!call);
    },
    setThrow: (key, on) => tick(transport.setFault(key, on)),
    setLatency: (mode) => tick(transport.latency.set(mode)),
    stats: () => transport.stats(),
    calls: (key) => transport.calls(key).map((c) => JSON.parse(JSON.stringify(c.arg ?? null))),
    truth: (method, ...args) => JSON.parse(JSON.stringify((backend[method] as (...a: unknown[]) => unknown).apply(backend, args) ?? null)),
    resetStats: () => tick(transport.resetStats()),
    push: () => tick(backend.pushNow() !== null),
    fixtures: () => backend.testFixtures(),
  };
};
