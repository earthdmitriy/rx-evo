import { DestroyRef, Signal, computed } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { toLazySignal } from 'ngxtension/to-lazy-signal';
import { Observable, filter, map, of, shareReplay, switchMap, tap } from 'rxjs';
import {
  isError,
  isLoading,
  isSuccess,
  tryGetDestroyRef,
  wrapResponse,
} from './shared';

export type TinyStore<Result = unknown> = {
  data: Signal<Readonly<Result> | null>;
  error: Signal<boolean>;
  loading: Signal<boolean>;
};

export const createTinyStore = <Input, Response, Result = Response>(options: {
  input?: Signal<Input | undefined>;
  loader: (input: Input) => Observable<Response>;
  processResponse?: (response: Response, input: Input) => Result;
  attempts?: number;
  timeout?: number;
  destroyRef?: DestroyRef;
}): TinyStore<Result> => {
  const {
    input,
    loader,
    processResponse = ((x: any) => x) as unknown as (
      response: Response,
      input: Input,
    ) => Result,
    attempts,
    timeout,
    destroyRef = tryGetDestroyRef(),
  } = options;

  // force refCount if no injector (and, probably, no injection context)
  const refCount = !destroyRef;

  const source$ = input
    ? toObservable(input).pipe(filter(Boolean))
    : of(true as Input);

  const result$ = source$.pipe(
    switchMap((input) =>
      loader(input).pipe(
        map((result) => processResponse(result, input)),
        wrapResponse(attempts, timeout),
      ),
    ),
    destroyRef ? takeUntilDestroyed(destroyRef) : tap(),
    shareReplay({ bufferSize: 1, refCount }),
  );

  return {
    data: toLazySignal(result$.pipe(filter(isSuccess)), { initialValue: null }),
    error: toLazySignal(result$.pipe(map(isError)), { initialValue: false }),
    loading: toLazySignal(result$.pipe(map(isLoading)), { initialValue: true }),
  };
};
// magic
type UnwrapTinyStore<T> = T extends TinyStore<infer U> ? U : T;
type UnwrapTinyStores<T extends unknown[]> = T extends [
  infer Head,
  ...infer Tail,
]
  ? [UnwrapTinyStore<Head>, ...UnwrapTinyStores<Tail>]
  : [];

export const combineTinyStores = <T extends [...TinyStore[]], Result>(
  args: [...T],
  processResponse: (data: UnwrapTinyStores<T>) => Result,
): TinyStore<Result> => ({
  loading: computed(() => args.map((s) => s.loading()).some((r) => r)),
  error: computed(() => args.map((s) => s.error()).some((e) => e)),
  data: computed(() => {
    const isError = args.map((s) => s.error()).some((e) => e);
    if (isError) return null;
    const res = args.map((s) => s.data());
    if (res.some((data) => data === null)) return null;
    return processResponse(res as UnwrapTinyStores<T>);
  }),
});
