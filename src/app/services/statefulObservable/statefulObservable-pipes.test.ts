import { of, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { splitResponseWithStatus } from './statefulObservable-pipes';
import {
  ResponseWithStatus,
  ResponseError,
  ResponseLoading,
  errorSymbol,
  loadingSymbol,
} from '../tinyStore/shared';

describe('splitResponseWithStatus', () => {
  type Result = string;
  type ErrorType = string;

  const successResponse: ResponseWithStatus<Result, ErrorType> = 'data';

  const errorResponse: ResponseWithStatus<Result, ErrorType> = {
    state: errorSymbol,
    error: 'error-message',
  };

  const loadingResponse: ResponseWithStatus<Result, ErrorType> = {
    state: loadingSymbol,
  };

  it('should emit the original raw observable', (done) => {
    const source$ = of(successResponse);
    const streams = splitResponseWithStatus<Result, ErrorType>(source$);

    streams.raw.pipe(take(1)).subscribe((val) => {
      expect(val).toEqual(successResponse);
      done();
    });
  });

  it('should emit only successful values on value stream', (done) => {
    const source$ = of(successResponse, errorResponse, loadingResponse);
    const streams = splitResponseWithStatus<Result, ErrorType>(source$);

    const results: ResponseWithStatus<Result, ErrorType>[] = [];
    streams.value.subscribe((val) => results.push(val));

    setTimeout(() => {
      expect(results).toEqual([successResponse]);
      done();
    }, 10);
  });

  it('should emit only error payloads on error stream', (done) => {
    const source$ = of(successResponse, errorResponse, loadingResponse);
    const streams = splitResponseWithStatus<Result, ErrorType>(source$);

    const errors: (ErrorType | false)[] = [];
    streams.error.subscribe((err) => errors.push(err));

    setTimeout(() => {
      expect(errors).toEqual(['error-message']);
      done();
    }, 10);
  });

  it('should emit loading state as booleans on pending stream', (done) => {
    const source$ = of(successResponse, errorResponse, loadingResponse);
    const streams = splitResponseWithStatus<Result, ErrorType>(source$);

    const pendings: boolean[] = [];
    streams.pending.subscribe((pending) => pendings.push(pending));

    setTimeout(() => {
      expect(pendings).toEqual([false, false, true]);
      done();
    }, 10);
  });

  it('should cache the latest value for late subscribers', (done) => {
    const subject$ = new Subject<ResponseWithStatus<Result, ErrorType>>();
    const streams = splitResponseWithStatus<Result, ErrorType>(subject$);

    streams.pending.subscribe(); // ensure subscription to start caching

    subject$.next(loadingResponse);
    subject$.next(successResponse);

    setTimeout(() => {
      const results: ResponseWithStatus<Result, ErrorType>[] = [];
      streams.value.subscribe((val) => results.push(val));
      setTimeout(() => {
        expect(results).toEqual([successResponse]);
        done();
      }, 10);
    }, 10);
  });
});
