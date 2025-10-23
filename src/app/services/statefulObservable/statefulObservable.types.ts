import { Observable, MonoTypeOperatorFunction, OperatorFunction } from 'rxjs';
import { ResponseWithStatus } from '../tinyStore/shared';

export type StatefulObservableStreams<T = unknown, Error = unknown> = {
  raw: Observable<ResponseWithStatus<T, Error>>;
  value: Observable<T>;
  error: Observable<false | Error>;
  pending: Observable<boolean>;
};

export type StatefulObservable<T = unknown, Error = unknown> =StatefulObservableStreams<T, Error> &{
  reload: () => void;
  // combineWith: () => void;

  pipe(): StatefulObservable<T, Error>;
  pipe(
    ...operations: MonoTypeOperatorFunction<ResponseWithStatus<T>>[]
  ): StatefulObservable<T>;

  pipeValue(): StatefulObservable<T, Error>;
  // omit error type because stream can fail with another error
  pipeValue<A>(op1: OperatorFunction<T, A>): StatefulObservable<A>;
  pipeValue<A, B>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
  ): StatefulObservable<B>;
  pipeValue<A, B, C>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
  ): StatefulObservable<C>;
  pipeValue<A, B, C, D>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
  ): StatefulObservable<D>;
  pipeValue<A, B, C, D, E>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
  ): StatefulObservable<E>;
  pipeValue<A, B, C, D, E, F>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
  ): StatefulObservable<F>;
  pipeValue<A, B, C, D, E, F, G>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
  ): StatefulObservable<G>;
  pipeValue<A, B, C, D, E, F, G, H>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
  ): StatefulObservable<H>;
  pipeValue<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
  ): StatefulObservable<I>;
  pipeValue<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
    ...operations: OperatorFunction<any, any>[]
  ): StatefulObservable<unknown>;

  pipeError(): StatefulObservable<T, Error>;
  pipeError<A>(op1: OperatorFunction<T, A>): StatefulObservable<T, A>;
  pipeError<A, B>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
  ): StatefulObservable<T, B>;
  pipeError<A, B, C>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
  ): StatefulObservable<T, C>;
  pipeError<A, B, C, D>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
  ): StatefulObservable<T, D>;
  pipeError<A, B, C, D, E>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
  ): StatefulObservable<T, E>;
  pipeError<A, B, C, D, E, F>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
  ): StatefulObservable<T, F>;
  pipeError<A, B, C, D, E, F, G>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
  ): StatefulObservable<T, G>;
  pipeError<A, B, C, D, E, F, G, H>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
  ): StatefulObservable<T, H>;
  pipeError<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
  ): StatefulObservable<T, I>;
  pipeError<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
    ...operations: OperatorFunction<any, any>[]
  ): StatefulObservable<T, unknown>;
  /* tslint:enable:max-line-length */

  //withErrorHandler<TError>(errorHandler: (e: unknown) => TError): StatefulObservable<T, TError>
};

export type StatefulObservableForPipe<T = unknown, Error = unknown> = Omit<
  StatefulObservable<T, Error>,
  'pipe' | 'pipeValue' | 'pipeError'
>;
