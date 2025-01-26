import { assertInInjectionContext, DestroyRef, inject } from '@angular/core';
import { catchError, Observable, of, retry, startWith, timer } from 'rxjs';

export const loading = Symbol('loading');
export const error = Symbol('error');

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

const defauleAttempts = 3 as const;
const defaultTimeoute = 1000 as const;

export const isInIjectionContext = () => {
  try {
    assertInInjectionContext(() => '');
  } catch {
    return false;
  }
  return true;
};

export const tryGetDestroyRef = () => {
  if (isInIjectionContext()) return inject(DestroyRef);
  return undefined;
};

export const wrapResponse =
  <T>(attempts: number = defauleAttempts, timeout: number = defaultTimeoute) =>
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
      catchError((errorMsg) =>
        of<ResponseError>({ state: error, message: String(errorMsg) }),
      ),
    );
