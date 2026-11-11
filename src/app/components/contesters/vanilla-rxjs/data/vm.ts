import {
  map,
  MonoTypeOperatorFunction,
  Observable,
  scan,
  shareReplay,
  Subscription,
} from 'rxjs';
import { ConsoleApiKey } from '../../../../services/contesters';
import { Fetched, fetched } from './fetched';
import { IDLE, ViewState } from './view-state';
import { QueryStatus } from './query';

/** A section's data and how to show it. */
export type Vm<T> = { state: ViewState; data: T | null };

export const IDLE_VM: Vm<never> = { state: IDLE, data: null };

/** Maps one source's status to what its section shows. */
export const toVm =
  <T>(key: ConsoleApiKey, isEmpty: (d: T) => boolean = () => false) =>
  (s: QueryStatus<T>): Vm<T> => {
    if (s.error)
      return {
        state: {
          kind: 'error',
          failed: [key],
          stale: s.data !== null,
          error: s.error,
        },
        data: s.data,
      };
    if (s.data === null)
      return { state: s.fetching ? { kind: 'loading' } : IDLE, data: null };
    if (isEmpty(s.data)) return { state: { kind: 'empty' }, data: s.data };
    return { state: { kind: 'ready', reloading: s.fetching }, data: s.data };
  };
/** While a new key loads, keep showing the previous key's data, dimmed. */
export const keepPrevious =
  <T>(): MonoTypeOperatorFunction<Vm<T>> =>
  (source) =>
    source.pipe(
      scan<Vm<T>, Vm<T> | null>((prev, next): Vm<T> => {
        if (
          next.state.kind === 'loading' &&
          next.data === null &&
          prev?.data != null
        ) {
          return { state: { kind: 'ready', reloading: true }, data: prev.data };
        }
        return next;
      }, null),
      map((vm) => vm!),
    );

export const shared = <T>(): MonoTypeOperatorFunction<T> =>
  shareReplay({ bufferSize: 1, refCount: true });

/**
 * Enriches a section's data with the parts that other services provide.
 * `enrich` runs once per new data value; the state of the section is passed
 * through at every emission. The new enrichment is subscribed before the
 * old one is dropped, so ids both need are never cancelled in between.
 */
export const withParts =
  <S, T>(enrich: (data: S) => Observable<T>) =>
  (source: Observable<Vm<S>>): Observable<Vm<T>> =>
    new Observable<Vm<T>>((out) => {
      let inner: Subscription | undefined;
      let last: S | null = null;
      let state: ViewState = IDLE;
      let data: T | null = null;
      const sub = source.subscribe({
        next: (vm) => {
          state = vm.state;
          if (vm.data !== last) {
            const previous = inner;
            last = vm.data;
            data = null;
            let sync = false;
            inner = undefined;
            if (vm.data !== null) {
              inner = enrich(vm.data).subscribe({
                next: (d) => {
                  data = d;
                  out.next({ state, data });
                  sync = true;
                },
                error: (e) => out.error(e),
              });
            }
            previous?.unsubscribe();
            if (sync) return;
          }
          out.next({ state, data });
        },
        error: (e) => out.error(e),
        complete: () => out.complete(),
      });
      return () => {
        inner?.unsubscribe();
        sub.unsubscribe();
      };
    });

/** Computes once per input object. */
export const memo = <A extends object, B>(f: (a: A) => B): ((a: A) => B) => {
  const cache = new WeakMap<A, B>();
  return (a) => {
    if (!cache.has(a)) cache.set(a, f(a));
    return cache.get(a)!;
  };
};

export const mapVm = <A extends object, B>(
  vm: Vm<A>,
  f: (a: A) => B,
): Vm<B> => ({ state: vm.state, data: vm.data === null ? null : f(vm.data) });

/**
 * A source that enriches a section failed: its fields stay empty and the
 * section keeps working, naming the failed call as a notice.
 */
export const flag = <T>(vm: Vm<T>, calls: FailedCall[]): Vm<T> => {
  if (!calls.length || vm.state.kind !== 'ready') return vm;
  return {
    state: { ...vm.state, notices: calls.map((c) => c.error) },
    data: vm.data,
  };
};

/** A source's status as a field of another section. */
export const statusFetched = <T, R>(
  s: QueryStatus<T>,
  f: (t: T) => R,
): Fetched<R> =>
  s.data !== null
    ? fetched.ready(f(s.data))
    : s.error
      ? fetched.error(s.error)
      : fetched.loading();

/** A failed call of a section's fields: its API key and its error, as it came. */
export type FailedCall = { key: string; error: unknown };

/** The failed calls among these fields (a field not loaded yet is not a failure). */
export const failedCalls = (
  checks: [ConsoleApiKey, Fetched<unknown> | null | undefined][],
): FailedCall[] =>
  checks.flatMap(([key, p]) =>
    p?.state === 'error' ? [{ key, error: p.error }] : [],
  );

/** The failed calls of a section's own state (an error state, not stale). */
export const errorCalls = (state: ViewState): FailedCall[] =>
  state.kind === 'error'
    ? state.failed.map((key) => ({ key, error: state.error }))
    : [];
