import { DestroyRef, inject } from '@angular/core';
import {
  Observable,
  combineLatest,
  filter,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { isError, isLoading, isSuccess, wrapResponse } from './shared';

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
  attempts?: number;
  timeout?: number;
  debounce?: boolean;
}): TinyRxStore<Result> => {
  const {
    input,
    loader,
    processResponse = ((x: any) => x) as unknown as (
      response: Response,
      input: Input,
    ) => Result,
    attempts = defaultAttempts,
    timeout = defaultTimeoute,
  } = options;
  const destroyRef = inject(DestroyRef);

  const source$ = input ? input.pipe(filter(Boolean)) : of(true as Input);

  const result$ = source$.pipe(
    switchMap((input) =>
      loader(input).pipe(
        map((result) => processResponse(result, input)),
        wrapResponse(attempts, timeout, destroyRef),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
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
