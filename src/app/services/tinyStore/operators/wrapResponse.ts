import {
  Observable,
  OperatorFunction,
  catchError,
  of,
  retry,
  startWith,
  timer,
} from 'rxjs';
import {
  ResponseError,
  ResponseLoading,
  ResponseWithStatus,
  errorSymbol,
  loadingSymbol,
} from '../shared';

const defauleAttempts = 3 as const;
const defaultTimeoute = 1000 as const;

export const wrapResponse =
  <T,E>(
    attempts: number = defauleAttempts,
    timeout: number = defaultTimeoute,
    processError: (error: unknown) => E = x => x as E,
  ): OperatorFunction<T, ResponseWithStatus<T,E>> =>
  (source: Observable<T>): Observable<ResponseWithStatus<T,E>> =>
    source.pipe(
      // retry failed requests
      retry({
        count: attempts,
        delay: (err, attempt) => timer(timeout * attempt),
      }),
      // immediately emit 'loading', useful to show spinners or skeletons
      startWith({ state: loadingSymbol } as ResponseLoading),
      // if retry failed - handle error
      catchError((error) =>
        of<ResponseError<E>>({ state: errorSymbol, error: processError(error) }),
      ),
    );
