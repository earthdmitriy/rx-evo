import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BehaviorSubject,
  concatMap,
  defer,
  delay,
  filter,
  firstValueFrom,
  map,
  NEVER,
  Observable,
  of,
  race,
  ReplaySubject,
  shareReplay,
} from 'rxjs';
import { combineTinyRxStores, createTinyRxStore } from './tinyRxStore';

@Injectable()
class SampleService {
  input = new ReplaySubject<number>(1);
  available = new BehaviorSubject(true);
  process = jest.fn((value) => {
    return value * 2;
  });
  makeRequest = jest.fn((value) =>
    defer(() =>
      of(value).pipe(
        delay(1),
        map((v) => this.process(v)),
      ),
    ),
  );
  store = createTinyRxStore({
    input: this.input,
    loader: (value) => this.makeRequest(value),
    attempts: 0,
    active: this.available,
  });
}

describe('TinyRxStore', () => {
  let sampleService: SampleService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SampleService],
    });
    sampleService = TestBed.inject(SampleService);
  });

  it('should create the tinyStore', () => {
    expect(sampleService.store).toBeTruthy();
  });

  it('should be lazy', () => {
    sampleService.input.next(1);
    expect(sampleService.store).toBeTruthy();
    expect(sampleService.makeRequest.mock.calls.length).toEqual(0);
  });

  it('should call loader on subscribe', async () => {
    sampleService.input.next(1);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(0);

    sampleService.store.data.subscribe();

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
  });

  it('provide data from loader', async () => {
    sampleService.input.next(1);

    const res = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(res).toEqual(2);
  });

  it('subscribe to loading materialize loader', async () => {
    sampleService.input.next(1);

    sampleService.store.loading.subscribe();

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
  });

  it('subscribe to error materialize loader', async () => {
    sampleService.input.next(1);

    sampleService.store.error.subscribe();

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
  });

  it('share result', async () => {
    sampleService.input.next(1);

    sampleService.store.data.subscribe(); // keep active subscription
    const res = await firstValueFrom(sampleService.store.data);
    const res2 = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(res).toEqual(2);
    expect(res2).toEqual(2);
  });

  it('input change rerun loader', async () => {
    sampleService.input.next(1);

    sampleService.store.data.subscribe(); // keep active subscription
    const res = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(res).toEqual(2);

    sampleService.input.next(2);

    const res2 = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(2);
    expect(res2).toEqual(4);
  });

  it('handle error', async () => {
    sampleService.makeRequest.mockImplementation((v) =>
      of(v).pipe(
        delay(1),
        map((v) => {
          throw 'err';
        }),
      ),
    );

    sampleService.input.next(1);

    const res = await firstValueFrom(sampleService.store.error);
    expect(res).toEqual('err');
  });

  it('keep state without subscribers', async () => {
    sampleService.input.next(1);

    const res = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(res).toEqual(2);

    const res2 = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(res2).toEqual(2);
  });

  it('dont keep state after flush', async () => {
    sampleService.input.next(1);

    sampleService.store.data.subscribe();

    const res = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(res).toEqual(2);

    sampleService.makeRequest.mockImplementation((v) =>
      of(v).pipe(
        delay(1),
        map((v) => 0),
      ),
    );
    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);

    sampleService.available.next(false);
    sampleService.available.next(true);
    expect(sampleService.makeRequest.mock.calls.length).toEqual(2);

    const res2 = await firstValueFrom(sampleService.store.data);

    expect(res2).toEqual(0);
    expect(sampleService.makeRequest.mock.calls.length).toEqual(2);
  });

  it('flush without subscribers dont materialize data', async () => {
    sampleService.input.next(1);

    expect(sampleService.process.mock.calls.length).toEqual(0);

    expect(sampleService.process.mock.calls.length).toEqual(0);

    sampleService.available.next(false);

    expect(sampleService.process.mock.calls.length).toEqual(0);

    sampleService.available.next(true);
    expect(sampleService.process.mock.calls.length).toEqual(0);

    const res = await firstValueFrom(sampleService.store.data);

    expect(res).toEqual(2);
    expect(sampleService.process.mock.calls.length).toEqual(1);
  });

  it('after flush dont materialize data without subscribers', async () => {
    sampleService.input.next(1);
    expect(sampleService.makeRequest.mock.calls.length).toEqual(0);

    const subscription = sampleService.store.data.subscribe();

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);

    subscription.unsubscribe();

    sampleService.available.next(false);

    sampleService.store.data.forEach;

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);

    sampleService.available.next(true);
    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);

    const res2 = await firstValueFrom(sampleService.store.data);

    expect(res2).toEqual(2);
    expect(sampleService.process.mock.calls.length).toEqual(1);
  });

  it('second subscriber get loading state', async () => {
    sampleService.makeRequest.mockImplementation((v) =>
      of(v).pipe(concatMap(() => NEVER)),
    );

    sampleService.input.next(1);

    const first$ = sampleService.store.loading.pipe(
      filter((loading) => !loading),
      map(() => 1),
      shareReplay(1),
    );
    first$.subscribe();
    const second$ = sampleService.store.loading.pipe(map(() => 2));

    const res = await firstValueFrom(race([first$, second$]));

    expect(res).toEqual(2);
  });
});

describe('TinyRxStore out of injection context', () => {
  let sampleService: SampleService;
  beforeEach(() => {
    sampleService = new SampleService();
  });

  it('dont keep state without subscribers', async () => {
    sampleService.input.next(1);

    const res = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(res).toEqual(2);

    const res2 = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(2);
    expect(res2).toEqual(2);
  });

  it('dont keep state after flush', async () => {
    sampleService.input.next(1);

    sampleService.store.data.subscribe();

    const res = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(res).toEqual(2);

    sampleService.makeRequest.mockImplementation((v) =>
      of(v).pipe(
        delay(1),
        map((v) => 0),
      ),
    );
    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);

    sampleService.available.next(false);
    sampleService.available.next(true);

    const res2 = await firstValueFrom(sampleService.store.data);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(2);
    expect(res2).toEqual(0);
  });

  it('map error', async () => {
    const store = createTinyRxStore({
      loader: (value): Observable<string> =>
        of('something').pipe(
          map((x) => {
            throw '';
          }),
        ),
      processError: (error, input) => {
        return 'err' as const;
      },
    });

    const res = await firstValueFrom(store.error);

    expect(res).toEqual('err');
  });

  it('map error with different types', async () => {
    const store = createTinyRxStore({
      loader: (value): Observable<string> =>
        of('something').pipe(
          map((x) => {
            throw '1';
          }),
        ),
      processError: (error, input) => {
        if (error === '1') return 1;
        if (error === '2') return 2;
        return 'unknown';
      },
    });

    const res = await firstValueFrom(store.error);

    expect(res).toEqual(1);
  });

  it('combine error', async () => {
    const store = createTinyRxStore({
      loader: (value): Observable<string> =>
        of('something').pipe(
          map((x) => {
            throw '';
          }),
        ),
      processError: (error, input) => {
        return 'err' as const;
      },
    });
    const anotherStore = createTinyRxStore({
      loader: () => of(true),

      processError: (error, input) => {
        return 'anotherErr' as const;
      },
    });

    const combinedStore = combineTinyRxStores(
      [store, anotherStore],
      (values) => values,
    );

    const res = await firstValueFrom(combinedStore.error);

    expect(res).toEqual(['err', false]);
  });
});
