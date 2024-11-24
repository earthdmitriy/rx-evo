import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  debounce,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  race,
  retry,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
  timer,
} from 'rxjs';

export type ResponseData<T> = { data: T };

export type ResponseLoading = {
  state: 'loading';
};

export type ResponseError = { state: 'error'; message: string };
export type ResponseWithStatus<T> = ResponseLoading | ResponseError | T;

export const isLoading = <T>(
  response: ResponseWithStatus<T>,
): response is ResponseLoading =>
  (response as ResponseLoading)?.state === 'loading';
export const isError = <T>(
  response: ResponseWithStatus<T>,
): response is ResponseError => (response as ResponseError)?.state === 'error';
export const isSuccess = <T>(response: ResponseWithStatus<T>): response is T =>
  !isLoading(response) && !isError(response);

export type ResponseContainer<T = unknown> = Readonly<{
  loading$: Observable<boolean>;
  error$: Observable<unknown>;
  success$: Observable<boolean>;
  data$: Observable<T>;
  toSignal: () => SignalContainer<T>;
}>;

export type ExtendedResponseCOntainer<T = unknown> = ResponseContainer<T> &
  Readonly<{
    toSignal: () => SignalContainer<T>;
  }>;

export type SignalContainer<T = unknown> = Readonly<{
  loading: Signal<boolean>;
  error: Signal<unknown>;
  success: Signal<boolean>;
  data: Signal<T | null>;
}>;

const containerToSignal = <T>(
  container: Omit<ResponseContainer<T>, 'toSignal'>,
): SignalContainer<T> => ({
  loading: toSignal(container.loading$, { initialValue: true }),
  error: toSignal(container.error$),
  success: toSignal(container.success$, { initialValue: true }),
  data: toSignal(container.data$, { initialValue: null }),
});

/**
 * similar with @see splitRequest, but intended to handle response together with its options
 * @param input$ observable with options, required to make request
 * @param doRequest map options from eventSource to actual API request
 * @param processResponse process results with options
 * @param options retry options
 * @returns
 */
export const wrapMapRequest = <Input, Response, Result>(
  input$: Observable<Input>,
  doRequest: (input: Input) => Observable<Response>,
  processResponse: (response: Response, options: Input) => Result,
  options: { attempts?: number; timeout?: number } = {},
): ResponseContainer<Result> => {
  const { attempts = 3, timeout = 1000 } = options;

  const loading$ = new BehaviorSubject<boolean>(false);
  const error$ = new BehaviorSubject<unknown>(undefined);
  const success$ = combineLatest([loading$, error$]).pipe(
    map(([isLoading, error]) => isLoading || !error),
  );

  // Skip input values while current request is loading.
  const attemptFailed$ = new Subject<void>();
  const notLoading$ = loading$.pipe(filter((x) => !x));
  const inputDebounce$ = race(notLoading$, attemptFailed$).pipe(take(1));
  const dataDebounce$ = combineLatest([loading$, success$]).pipe(
    filter(([loading, success]) => !loading && success),
  );

  const tryDoRequest = (data: Input): Observable<Result> =>
    of(data).pipe(
      tap(() => {
        loading$.next(true);
        error$.next(undefined);
      }),
      switchMap(doRequest),
      // Sync with last input value
      tap({ error: () => attemptFailed$.next() }),
      retry({
        count: attempts,
        delay: (_, attempt) => timer(timeout * attempt),
      }),
      // Set flags for failed doRequest after all retries
      tap({ error: (error) => error$.next(error) }),
      // No output data for failed doRequest
      catchError(() => EMPTY),
      // Set flags for observable from doRequest
      tap({
        next: () => loading$.next(false),
        complete: () => loading$.next(false),
      }),
      debounce(() => dataDebounce$),
      map((response: Response): Result => processResponse(response, data)),
    );

  const syncInternalObservable =
    <T>() =>
    (source: Observable<T>) =>
      source.pipe(distinctUntilChanged(), debounceTime(0), shareReplay(1));

  const data$ = input$.pipe(
    // Skip input values, while current request not success or not failed.
    debounce(() => inputDebounce$),
    // Do request with last input value
    switchMap(tryDoRequest),
    syncInternalObservable(),
  );

  const result = {
    loading$: loading$.pipe(syncInternalObservable()),
    error$: error$.pipe(syncInternalObservable()),
    success$: success$.pipe(syncInternalObservable()),
    data$,
  };

  return {
    ...result,
    toSignal: () => containerToSignal(result),
  };
};

// magic
type UnwrapResponseContainer<T> = T extends ResponseContainer<infer U> ? U : T;
type UnwrapResponseContainers<T extends unknown[]> = T extends [
  infer Head,
  ...infer Tail,
]
  ? [UnwrapResponseContainer<Head>, ...UnwrapResponseContainers<Tail>]
  : [];
type RemapResponseContainers<T extends unknown[]> = ResponseContainer<
  UnwrapResponseContainers<T>
>;

/** combineLatest for ResponseContainer */
export const combineResponses = <T extends [...ResponseContainer[]]>(
  args: [...T],
): RemapResponseContainers<T> => {
  const result = {
    loading$: combineLatest(args.map(({ loading$ }) => loading$)).pipe(
      map((arr) => arr.some((x) => x)),
    ),
    error$: combineLatest(args.map(({ error$ }) => error$)).pipe(
      map((arr) => arr.some((x) => x)),
    ),
    success$: combineLatest(
      args.map(({ success$: noError$ }) => noError$),
    ).pipe(map((arr) => arr.every((x) => x))),
    data$: combineLatest(args.map(({ data$ }) => data$)) as Observable<
      UnwrapResponseContainers<T>
    >,
  };

  return {
    ...result,
    toSignal: () => containerToSignal(result),
  };
};

/**
 * Rx operator
 * add it into web requst in API service
 *
 * For example:
 * `return this.http.get(url).pipe(wrapResponse);`
 */
export const wrapResponse =
  <T>() =>
  (source: Observable<T>): Observable<ResponseWithStatus<Readonly<T>>> =>
    source.pipe(
      // retry failed requests
      retry({
        count: 3,
        delay: (err, attempt) => timer(1000 * attempt),
      }),
      // immediately emit 'loading', useful to show spinners or skeletons
      startWith({ state: 'loading' } as ResponseLoading),
      // if retry failed - handle error
      catchError((error) =>
        of<ResponseError>({ state: 'error', message: error.toString() }),
      ),
    );
