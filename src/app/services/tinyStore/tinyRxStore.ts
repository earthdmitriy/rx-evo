import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  combineLatest,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import {
  isError,
  isLoading,
  isSuccess,
  tryGetDestroyRef,
  wrapResponse,
} from './shared';

export type TinyRxStore<Result = unknown> = {
  data: Observable<Readonly<Result>>;
  error: Observable<boolean>;
  loading: Observable<boolean>;
};

const defaultAttempts = 3 as const;
const defaultTimeoute = 1000 as const;

export const createTinyRxStore = <Input, Response, Result = Response>(options: {
  input?: Observable<Input | undefined>;
  loader: (input: Input) => Observable<Response>;
  processResponse?: (response: Response, input: Input) => Result;
  // with active subscribers - refetch
  // without subscribers - clear cache
  flush?: Observable<unknown>;
  attempts?: number;
  timeout?: number;
  destroyRef?: DestroyRef;
}): TinyRxStore<Result> => {
  const {
    input,
    loader,
    processResponse = ((x: any) => x) as unknown as (
      response: Response,
      input: Input,
    ) => Result,
    flush = new Subject<void>(),
    attempts = defaultAttempts,
    timeout = defaultTimeoute,
    destroyRef = tryGetDestroyRef(),
  } = options;

  // force refCount if no injector (and, probably, no injection context)
  const refCount = !destroyRef;

  const source$ = input ? input.pipe(filter(Boolean)) : of(true as Input);

  const result$ = combineLatest([source$, flush.pipe(startWith(null))]).pipe(
    map(([input]) => input),
    switchMap((input) =>
      loader(input).pipe(
        map((result) => processResponse(result, input)),
        wrapResponse(attempts, timeout),
        takeUntil(flush),
      ),
    ),
    destroyRef ? takeUntilDestroyed(destroyRef) : tap(),
    shareReplay({ bufferSize: 1, refCount }),
  );

  return {
    data: result$.pipe(filter(isSuccess)),
    error: result$.pipe(map(isError)),
    loading: result$.pipe(map(isLoading)),
  };
};
// magic
type UnwrapTinyStore<T> = T extends TinyRxStore<infer U> ? U : T;
type UnwrapTinyStores<T extends unknown[]> = T extends [
  infer Head,
  ...infer Tail,
]
  ? [UnwrapTinyStore<Head>, ...UnwrapTinyStores<Tail>]
  : [];

export const combineTinyRxStores = <T extends [...TinyRxStore[]], Result>(
  args: [...T],
  processResponse: (data: UnwrapTinyStores<T>) => Result,
): TinyRxStore<Result> => ({
  loading: combineLatest(args.map((s) => s.loading)).pipe(
    map((args) => args.some((r) => r)),
  ),
  error: combineLatest(args.map((s) => s.error)).pipe(
    map((args) => args.some((r) => r)),
  ),
  data: combineLatest(args.map((s) => s.data)).pipe(
    map((args) => processResponse(args as UnwrapTinyStores<T>)),
  ),
});
