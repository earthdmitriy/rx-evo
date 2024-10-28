import {
  DestroyRef,
  Signal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import {
  Observable,
  catchError,
  filter,
  map,
  of,
  retry,
  shareReplay,
  startWith,
  switchMap,
  timer,
} from 'rxjs';
import { toLazySignal } from 'ngxtension/to-lazy-signal';

const loading = Symbol('loading');
const error = Symbol('error');

export type ResponseLoading = {
  state: typeof loading;
};

export type ResponseError = { state: typeof error; message: string };
export type ResponseWithStatus<T> = ResponseLoading | ResponseError | T;

export const isLoading = <T>(
  response: ResponseWithStatus<T>,
): response is ResponseLoading =>
  (response as ResponseLoading)?.state === loading;
export const isError = <T>(
  response: ResponseWithStatus<T>,
): response is ResponseError => (response as ResponseError)?.state === error;
export const isSuccess = <T>(response: ResponseWithStatus<T>): response is T =>
  !isLoading(response) && !isError(response);

export type TinyStore<Result = unknown> = {
  data: Signal<Readonly<Result> | null>;
  error: Signal<boolean>;
  loading: Signal<boolean>;
};

const defauleAttempts = 3 as const;
const defaultTimeoute = 1000 as const;

export const createTinyStore = <Input, Response, Result = Response>(options: {
  input?: Signal<Input | undefined>;
  loader: (input: Input) => Observable<Response>;
  processResponse?: (response: Response, input: Input) => Result;
  attempts?: number;
  timeout?: number;
  debounce?: boolean;
}): TinyStore<Result> => {
  const {
    input,
    loader,
    processResponse = ((x: any) => x) as unknown as (
      response: Response,
      input: Input,
    ) => Result,
    attempts = defauleAttempts,
    timeout = defaultTimeoute,
    debounce = false,
  } = options;
  const destroyRef = inject(DestroyRef);

  const source$ = input
    ? toObservable(input).pipe(filter(Boolean))
    : of(true as Input);

  const wrapResponse =
    <T>() =>
    (source: Observable<T>): Observable<ResponseWithStatus<Readonly<T>>> =>
      source.pipe(
        // retry failed requests
        retry({
          count: attempts,
          delay: (err, attempt) => timer(timeout * attempt),
        }),
        // immediately emit 'loading', useful to show spinners or skeletons
        startWith({ state: loading } as ResponseLoading),
        // if retry failed - handle error
        catchError((error) =>
          of<ResponseError>({ state: error, message: String(error) }),
        ),
        takeUntilDestroyed(destroyRef),
      );

  const result$ = source$.pipe(
    switchMap((input) =>
      loader(input).pipe(
        map((result) => processResponse(result, input)),
        wrapResponse(),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
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
