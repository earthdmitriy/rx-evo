import { ReplaySubject, concatMap, filter, firstValueFrom, of } from 'rxjs';
import { ResponseLoading, isError, isSuccess, loadingSymbol } from '../shared';
import { wrapResponse } from './wrapResponse';

describe('wrapResponse', () => {
  beforeEach(() => {});

  it('start with loading', async () => {
    const observable = of(1);

    const wrapped = observable.pipe(wrapResponse());

    const res = await firstValueFrom(wrapped);

    expect((res as ResponseLoading).state).toBe(loadingSymbol);
  });

  it('keep stream alive after error', async () => {
    const observable = new ReplaySubject<boolean>(1);

    const wrapped = observable.pipe(
      concatMap((pass) => {
        if (!pass) throw '';
        return of(true);
      }),
      wrapResponse(0),
      filter(isSuccess),
    );
    observable.next(false);
    observable.next(true);

    const res = await firstValueFrom(wrapped);

    expect(res).toBe(true);
  });

  it('use error mapper', async () => {
    const observable = new ReplaySubject<boolean>(1);

    const wrapped = observable.pipe(
      concatMap((pass) => {
        if (!pass) throw '';
        return of(true);
      }),
      wrapResponse(0, 0, () => 'err'),
      filter(isError),
    );
    observable.next(false);

    const res = await firstValueFrom(wrapped);

    expect(res.error).toEqual('err');
  });
});
