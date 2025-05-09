import { assertInInjectionContext, DestroyRef, inject } from '@angular/core';

export const loadingSymbol = Symbol('loading');
export const errorSymbol = Symbol('error');

export type ResponseLoading = {
  state: typeof loadingSymbol;
};

export type ResponseError = { state: typeof errorSymbol; error: unknown };
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
