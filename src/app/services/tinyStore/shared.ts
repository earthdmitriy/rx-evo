import { assertInInjectionContext, DestroyRef, inject } from '@angular/core';
import {
  catchError,
  Observable,
  of,
  OperatorFunction,
  retry,
  startWith,
  timer,
} from 'rxjs';

export const loadingSymbol = Symbol('loading');
export const errorSymbol = Symbol('error');

export type ResponseLoading = {
  state: typeof loadingSymbol;
};

export type ResponseError = { state: typeof errorSymbol; message: string };
export type ResponseWithStatus<T> = ResponseLoading | ResponseError | T;

export const isLoading = <T>(
  response: ResponseWithStatus<T>,
): response is ResponseLoading =>
  (response as ResponseLoading)?.state === loadingSymbol;
export const isError = <T>(
  response: ResponseWithStatus<T>,
): response is ResponseError =>
  (response as ResponseError)?.state === errorSymbol;
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
  <T>(
    attempts: number = defauleAttempts,
    timeout: number = defaultTimeoute,
  ): OperatorFunction<T, ResponseWithStatus<Readonly<T>>> =>
  (source: Observable<T>): Observable<ResponseWithStatus<Readonly<T>>> =>
    source.pipe(
      // retry failed requests
      retry({
        count: attempts,
        delay: (err, attempt) => timer(timeout * attempt),
      }),
      // immediately emit 'loading', useful to show spinners or skeletons
      startWith({ state: loadingSymbol } as ResponseLoading),
      // if retry failed - handle error
      catchError((errorMsg) =>
        of<ResponseError>({ state: errorSymbol, message: String(errorMsg) }),
      ),
    );
