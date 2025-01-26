import { Injectable, signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { delay, map, of } from 'rxjs';
import { combineTinyStores, createTinyStore } from './tinyStore';

// I have not found way to test async signals outside of service or component
@Injectable()
class SampleService {
  input = signal<number | undefined>(undefined);
  makeRequest = jest.fn((value) => of(value * 2).pipe(delay(1)));
  store = createTinyStore({
    input: this.input,
    loader: (value) => this.makeRequest(value),
    attempts: 0,
  });
}

describe('TinyStore', () => {
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
    sampleService.input.set(1);
    expect(sampleService.store).toBeTruthy();
    expect(sampleService.makeRequest.mock.calls.length).toEqual(0);
  });

  it('should call loader on subscribe', fakeAsync(() => {
    sampleService.input.set(1);
    // subscribe to signal
    sampleService.store.data();
    TestBed.flushEffects();
    tick(100);

    expect(sampleService.store).toBeTruthy();
    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(sampleService.store.data()).toEqual(2);
  }));

  it('subscribe to loading materialize loader', fakeAsync(() => {
    sampleService.input.set(1);
    // subscribe to signal
    const loading = sampleService.store.loading();
    expect(loading).toEqual(true);
    TestBed.flushEffects();
    tick(100);

    expect(sampleService.store).toBeTruthy();
    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(sampleService.store.data()).toEqual(2);
    expect(sampleService.store.loading()).toEqual(false);
  }));

  it('subscribe to error materialize loader', fakeAsync(() => {
    sampleService.input.set(1);
    // subscribe to signal
    sampleService.store.error();
    TestBed.flushEffects();
    tick(100);

    expect(sampleService.store).toBeTruthy();
    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(sampleService.store.data()).toEqual(2);
  }));

  it('input change rerun loader', fakeAsync(() => {
    sampleService.input.set(1);
    // subscribe to signal
    sampleService.store.data();
    TestBed.flushEffects();
    tick(100);

    sampleService.input.set(2);
    TestBed.flushEffects();

    expect(sampleService.store.loading()).toEqual(true);

    tick(100);

    expect(sampleService.store).toBeTruthy();
    expect(sampleService.makeRequest.mock.calls.length).toEqual(2);
    expect(sampleService.store.data()).toEqual(4);
    expect(sampleService.store.loading()).toEqual(false);
  }));

  it('handle error', fakeAsync(() => {
    sampleService.makeRequest.mockImplementation((v) =>
      of(v).pipe(
        delay(1),
        map((v) => {
          throw '';
        }),
      ),
    );

    sampleService.input.set(1);
    // subscribe to signal
    sampleService.store.data();
    TestBed.flushEffects();
    tick(100);

    expect(sampleService.makeRequest.mock.calls.length).toEqual(1);
    expect(sampleService.store.data()).toEqual(null);
    expect(sampleService.store.error()).toEqual(true);
  }));
});

@Injectable()
class SampleCombineService {
  inputA = signal<number | undefined>(undefined);
  makeRequestA = jest.fn((value) => of(value * 2).pipe(delay(1)));
  storeA = createTinyStore({
    input: this.inputA,
    loader: (value) => this.makeRequestA(value),
    attempts: 0,
  });

  inputB = signal<number | undefined>(undefined);
  makeRequestB = jest.fn((value) => of(value * 2).pipe(delay(1)));
  storeB = createTinyStore({
    input: this.inputB,
    loader: (value) => this.makeRequestB(value),
    attempts: 0,
  });

  combinedStore = combineTinyStores(
    [this.storeA, this.storeB],
    ([a, b]) => a * 10 + b,
  );
}

describe('TinyStoreCombine', () => {
  let sampleService: SampleCombineService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SampleCombineService],
    });
    sampleService = TestBed.inject(SampleCombineService);
  });

  it('should create the combinedStore', () => {
    expect(sampleService.combinedStore).toBeTruthy();
  });

  it('should wait till all stores populated', fakeAsync(() => {
    sampleService.inputA.set(1);
    // subscribe to signal
    sampleService.combinedStore.data();

    TestBed.flushEffects();
    tick(100);

    expect(sampleService.makeRequestA.mock.calls.length).toEqual(1);
    expect(sampleService.combinedStore.data()).toEqual(null);
    expect(sampleService.combinedStore.loading()).toEqual(true);
  }));

  it('should provide result when all stores populated', fakeAsync(() => {
    sampleService.inputA.set(1);
    sampleService.inputB.set(1);
    // subscribe to signal
    sampleService.combinedStore.data();

    TestBed.flushEffects();
    tick(100);

    expect(sampleService.makeRequestA.mock.calls.length).toEqual(1);
    expect(sampleService.combinedStore.data()).toEqual(22);
    expect(sampleService.combinedStore.loading()).toEqual(false);
  }));

  it('should recombine on new input', fakeAsync(() => {
    sampleService.inputA.set(1);
    sampleService.inputB.set(1);
    // subscribe to signal
    sampleService.combinedStore.data();

    TestBed.flushEffects();
    tick(100);

    sampleService.inputB.set(2);

    TestBed.flushEffects();
    tick(100);

    expect(sampleService.makeRequestA.mock.calls.length).toEqual(1);
    expect(sampleService.makeRequestB.mock.calls.length).toEqual(2);
    expect(sampleService.combinedStore.data()).toEqual(24);
    expect(sampleService.combinedStore.loading()).toEqual(false);
  }));

  it('handle error', fakeAsync(() => {
    sampleService.makeRequestB.mockImplementation((v) =>
      of(v).pipe(
        delay(1),
        map((v) => {
          throw '';
        }),
      ),
    );

    sampleService.inputA.set(1);
    sampleService.inputB.set(1);
    // subscribe to signal
    sampleService.combinedStore.data();
    TestBed.flushEffects();
    tick(100);

    expect(sampleService.makeRequestA.mock.calls.length).toEqual(1);
    expect(sampleService.makeRequestB.mock.calls.length).toEqual(1);
    expect(sampleService.combinedStore.data()).toEqual(null);
    expect(sampleService.combinedStore.error()).toEqual(true);
  }));
});
