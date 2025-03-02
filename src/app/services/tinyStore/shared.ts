import { assertInInjectionContext, DestroyRef, inject } from '@angular/core';
import {
  catchError,
  MonoTypeOperatorFunction,
  Observable,
  of,
  retry,
  startWith,
  Subject,
  Subscription,
  timer,
} from 'rxjs';

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

export function publishWhile<T>(
  available$: Observable<boolean>,
  options?: { bufferSize?: number; refCount?: boolean },
): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>): Observable<T> => {
    const { bufferSize = 1, refCount = true } = options ?? {};
    const subject = new Subject<T>();
    const buffer: T[] = [];

    let activeSubscribers = 0;

    let sourceSubscription: Subscription | null = null;

    const subscribeToSource = () => {
      sourceSubscription?.unsubscribe();
      sourceSubscription = source.subscribe({
        next(value: T) {
          // Добавляем новое значение в буфер
          buffer.push(value);
          // Ограничиваем размер буфера
          if (buffer.length > bufferSize) {
            buffer.shift();
          }
          subject.next(value);
        },
        error(err: any) {
          subject.error(err);
        },
        complete() {
          subject.complete();
        },
      });
    };
    const subscribeToAvailability = () => {
      availabilitySubscription?.unsubscribe();
      availabilitySubscription = available$.subscribe((available) => {
        if (available) {
          subscribeToSource();
        } else {
          buffer.shift();
          sourceSubscription?.unsubscribe();
        }
      });
    };

    let availabilitySubscription: Subscription | null = null;
    // Возвращаем Observable, который будет делиться данными
    return new Observable<T>((subscriber) => {
      activeSubscribers++;
      const innerSubscription: Subscription = subject.subscribe(subscriber);
      if (!availabilitySubscription) {
        subscribeToAvailability();
      } else {
        // Отправляем значения из буфера при подписке
        buffer.forEach((value) => subscriber.next(value));
      }

      // Возвращаем функцию отписки
      return () => {
        activeSubscribers--;
        innerSubscription.unsubscribe();
        if (!activeSubscribers && refCount) {
          sourceSubscription?.unsubscribe();
          availabilitySubscription?.unsubscribe();
          sourceSubscription = null;
          availabilitySubscription = null;
          buffer.shift();
        }
      };
    });
  };
}
