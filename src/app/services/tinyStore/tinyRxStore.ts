import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { publishWhile } from './publishWhile';
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
  active: Observable<boolean>;
};

const defaultAttempts = 3 as const;
const defaultTimeout = 1000 as const;

export const createTinyRxStore = <Input, Response, Result = Response>(options: {
  input?: Observable<Input | undefined>;
  loader: (input: Input) => Observable<Response>;
  processResponse?: (response: Response, input: Input) => Result;
  // with active subscribers - refetch
  // without subscribers - clear cache
  active?: Observable<boolean>;
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
    active = new BehaviorSubject(true),
    attempts = defaultAttempts,
    timeout = defaultTimeout,
    destroyRef = tryGetDestroyRef(),
  } = options;

  // force refCount if no injector (and, probably, no injection context)
  const refCount = !destroyRef;

  const source$ = input ? input.pipe(filter(Boolean)) : of(true as Input);

  const result$ = combineLatest([source$, active]).pipe(
    map(([input]) => input),
    switchMap((input) =>
      loader(input).pipe(
        map((result) => processResponse(result, input)),
        wrapResponse(attempts, timeout),
      ),
    ),
    destroyRef ? takeUntilDestroyed(destroyRef) : tap(),
    publishWhile(active, { refCount }),
  );

  return {
    data: result$.pipe(filter(isSuccess)),
    error: result$.pipe(map(isError)),
    loading: result$.pipe(map(isLoading)),
    active: active,
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
  destroyRef?: DestroyRef,
): TinyRxStore<Result> => {
  const ref = destroyRef ?? tryGetDestroyRef();
  // force refCount if no injector (and, probably, no injection context)
  const refCount = !destroyRef;
  const active = combineLatest(args.map((s) => s.active)).pipe(
    map((args) => args.every(Boolean)),
    debounceTime(0),
    ref ? takeUntilDestroyed(destroyRef) : tap(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  return {
    loading: combineLatest(args.map((s) => s.loading)).pipe(
      map((args) => args.some((r) => r)),
      ref ? takeUntilDestroyed(destroyRef) : tap(),
      publishWhile(active, { refCount }),
    ),
    error: combineLatest(args.map((s) => s.error)).pipe(
      map((args) => args.some((r) => r)),
      ref ? takeUntilDestroyed(destroyRef) : tap(),
      publishWhile(active, { refCount }),
    ),
    data: combineLatest(args.map((s) => s.data)).pipe(
      map((args) => processResponse(args as UnwrapTinyStores<T>)),
      ref ? takeUntilDestroyed(destroyRef) : tap(),
      publishWhile(active, { refCount }),
    ),
    active,
  };
};
