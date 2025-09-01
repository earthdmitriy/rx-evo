import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  ObservedValueOf,
  of,
  OperatorFunction,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { publishWhile } from './operators/publishWhile';
import { wrapResponse } from './operators/wrapResponse';
import { isError, isLoading, isSuccess, tryGetDestroyRef } from './shared';

export type TinyRxStore<Result = unknown, Error = unknown> = {
  data: Observable<Readonly<Result>>;
  error: Observable<false | Error>;
  loading: Observable<boolean>;
  active: Observable<boolean>;

  reload: () => void;
};

const defaultAttempts = 0 as const;
const defaultTimeout = 1000 as const;

type TmapOperator = <T, O extends Observable<any>>(
  project: (value: T, index: number) => O,
) => OperatorFunction<T, ObservedValueOf<O>>;

export const createTinyRxStore = <
  Input,
  Response,
  Result = Response,
  Error = unknown,
>(options: {
  input?: Observable<Input>;
  loader: (input: Input) => Observable<Response>;
  processResponse?: (response: Response, input: Input) => Result;
  processError?: (error: unknown, input: Input) => Error;
  mapOperator?: TmapOperator;
  // with active subscribers - refetch
  // without subscribers - clear cache
  active?: Observable<boolean>;
  attempts?: number;
  timeout?: number;
  destroyRef?: DestroyRef;
}): TinyRxStore<Result, Error> => {
  const {
    input,
    loader,
    processResponse = ((x: any) => x) as unknown as (
      response: Response,
      input: Input,
    ) => Result,
    processError = ((x: any) => x) as unknown as (
      error: unknown,
      input: Input,
    ) => Error,
    mapOperator = switchMap,
    active = new BehaviorSubject(true),
    attempts = defaultAttempts,
    timeout = defaultTimeout,
    destroyRef = tryGetDestroyRef(),
  } = options;

  // force refCount if no injector (and, probably, no injection context)
  const refCount = !destroyRef;

  const source$ = input ? input : of(true as Input);
  const reload$ = new BehaviorSubject(true);

  const result$ = combineLatest([source$, reload$, active]).pipe(
    map(([input]) => input),
    mapOperator((input) =>
      loader(input).pipe(
        map((result) => processResponse(result, input)),
        wrapResponse(attempts, timeout, (error) => processError(error, input)),
      ),
    ),
    destroyRef ? takeUntilDestroyed(destroyRef) : tap(),
    publishWhile(active, { refCount }),
  );

  return {
    data: result$.pipe(filter(isSuccess)),
    error: result$.pipe(
      filter((e) => !isLoading(e)),
      map((e) => (isError(e) ? (e.error as Error) : false)),
    ),
    loading: result$.pipe(map(isLoading)),
    active: active,

    reload: () => reload$.next(true),
  };
};
// magic
type UnwrapTinyStore<T> = T extends TinyRxStore<infer U> ? U : never;
type UnwrapTinyStores<T extends unknown[]> = T extends []
  ? [] // stop on empty tuple
  : T extends readonly [infer Head, ...infer Tail]
    ? [UnwrapTinyStore<Head>, ...UnwrapTinyStores<Tail>] // process as tuple
    : T extends TinyRxStore<infer R>[] // process as array
      ? R[]
      : [];

type UnwrapTinyStoreError<T> =
  T extends TinyRxStore<any, infer E> ? false | E : never;
type UnwrapTinyStoresError<T extends unknown[]> = T extends []
  ? [] // stop on empty tuple
  : T extends [infer Head, ...infer Tail]
    ? [UnwrapTinyStoreError<Head>, ...UnwrapTinyStoresError<Tail>] // process as tuple
    : T extends TinyRxStore<any, infer E>[] // process as array
      ? E[]
      : [];

export const combineTinyRxStores = <T extends [...TinyRxStore[]], Result>(
  args: [...T],
  processResponse: (data: UnwrapTinyStores<T>) => Result,
  destroyRef?: DestroyRef,
): TinyRxStore<Result, UnwrapTinyStoresError<T>> => {
  const ref = destroyRef ?? tryGetDestroyRef();
  // force refCount if no injector (and, probably, no injection context)
  const refCount = !destroyRef;
  const active = combineLatest(args.map((s) => s.active)).pipe(
    map((args) => args.every(Boolean)),
    distinctUntilChanged(),
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
      map((args) =>
        args.some((r) => r) ? (args as UnwrapTinyStoresError<T>) : false,
      ),
      ref ? takeUntilDestroyed(destroyRef) : tap(),
      publishWhile(active, { refCount }),
    ),
    data: combineLatest(args.map((s) => s.data)).pipe(
      map((args) => processResponse(args as UnwrapTinyStores<T>)),
      ref ? takeUntilDestroyed(destroyRef) : tap(),
      publishWhile(active, { refCount }),
    ),
    active,

    reload: () => args.forEach((store) => store.reload()),
  };
};
