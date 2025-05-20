# TinyStore Service

## Overview

The `TinyStore` service is a lightweight state management solution for your application. It provides a simple and efficient way to manage and share state across components.

## Features

- Lightweight and easy to use
- Reactive state management
- Minimal boilerplate
- TypeScript support

## Installation

```bash
npm install tiny-rx-store
```

## Usage

### Importing the Store

```typescript
import { combineTinyRxStores, createTinyRxStore, TinyRxStore } from "tiny-rx-store";
```

### Creating a Store

```typescript
private readonly store = createTinyRxStore({
  loader: () => this.apiService.fetchSomething(),
});
```
### Creating a Store with all parameters

```typescript
private readonly store = createTinyRxStore({
  input: someStream$,// any Observable
  active: isActive$,// Observable<boolean>
  loader: (input) => this.apiService.fetchSomething(input),
  processResponse: (response, inputValue) => response.data,  
  mapOperator: concatMap,// by default switchMap
  attempts: 3,// by default 3
  timeout: 1000,// by default 1000
  // optional
  // if in injection context - store will inject it under the hood
  // if not - should be provided
  // or store will use refCount: true
  destroyRef: this.destroyRef,
});
```

## Use cases
### Stateful request in component

#### Wrapping request
```typescript
protected readonly store = createTinyRxStore({
  loader: () => this.apiService.fetchSomething(),
  processResponse: (response) => response.data,// optional
});
```

#### Unwrapping states in template

With spinner
```html
<div [class.loading]="store.loading | async">
  @if (store.error | async) {
    <app-generic-error text="Failed to load"></app-generic-error>
  } @else {
    <app-data-widget [displayData]="store.data | async"></app-data-widget>
  }
</div>
```

With skeleton
```html
@if (store.loading | async) {
  <app-skeleton></app-skeleton>
} @else { 
  @if (store.error | async) {
    <app-generic-error text="Failed to load"></app-generic-error>
  } @else {
    <app-data-widget [displayData]="store.data | async"></app-data-widget>
  } 
}
```

It is lazy
```typescript
protected readonly showData = signal(false);
```

```html
@if (showData()) {
  @if (store.loading | async) {
    <app-skeleton></app-skeleton>
  } @else { 
    @if (store.error | async) {
      <app-generic-error text="Failed to load"></app-generic-error>
    } @else {
      <app-data-widget [displayData]="store.data | async"></app-data-widget>
    } 
  }
}
```
Store won't be materialized until showData() become true


### Mapping rx stream to request
```typescript
  public readonly clientId = input<number>()
  private readonly clientId$ =  toObservable(clientId);
  // or if you're not on signals yet
  @Input() public set clientId(value: number) {
    this.clientId$.next(value);
  }
  private readonly clientId$ = new ReplaySubject<number>(1);
  // or with forms
  protected readonly clientIdCtrl = this.fb.control<number | null>(
    null,
    [Validators.requred]
  );
  // no debounce an filtering to shorten example
  private readonly clientId$ = this.clientIdCtrl.valueChanges;

  protected readonly store = createTinyRxStore({
    input: this.clientId$,
    loader: (clientId) => this.apiService.fetchClient(clientId),
    // data from input available as 2nd argument
    processResponse: (response, clientId) => response.data
  });
```

With spinner
```html
<div [class.loading]="store.loading | async">
  @if (store.error | async) {
    <app-generic-error text="Failed to load client"></app-generic-error>
  } @else {
    <app-client-info [client]="store.data | async"></app-client-info >
  }
</div>
```

### Shared data in service
```typescript
@Injectable({
  providedIn: 'root',
})
export class ProductsStoreService {
  private readonly productsApi = inject(ProductsApiService);
  private readonly loggedIn$: Observable<boolean> = inject(EventsService).loggedIn$;

  // any thruthy value in strean
  private readonly reload$ = new BehaviorSubject(1);

  // public method to trigger re-fetch
  public reload() {
    this.reload$.next(1);
  }

  public readonly store = createTinyRxStore({
    input: this.reload$,
    // clear cache and stop emitting events on log out
    active: this.loggedIn$,
    loader: () => this.productsApi.allProducts$(),
    // or more complicated processing
    processResponse: (response) => response.data
  });
}
```

### Combining data from stores
combineTinyRxStores aware of 'active' stream of source stores and become inactive if any dependencies are inactive
```typescript
  public readonly clientId = input<number>();

  private readonly bucketApi = inject(BucketApiService);
  private readonly productsStore = inject(ProductsStoreService).store;

  private readonly bucketStore = createTinyRxStore({
    input: toObservable(this.clientId),
    loader: (clientId) => this.bucketApi.getClientBucket$(clientId),
  });

  protected readonly populatedBucketStore = combineTinyRxStores(
    [this.bucketStore, this.productsStore],
    ([bucket, products]) => prepareBucket(bucket, products),
  );
```
With spinner
```html
<div [class.loading]="populatedBucketStore.loading | async">
  @if (populatedBucketStore.error | async) {
    <app-generic-error text="Failed to load"></app-generic-error>
  } @else {
    <app-bucket [data]="populatedBucketStore.data | async"></app-bucket >
  }
</div>
```


### Nested stores
```typescript
  public readonly clientId = input<number>();

  private readonly bucketApi = inject(BucketApiService);
  private readonly productApi = inject(ProductApiService);
  private readonly productsStore = inject(ProductsStoreService).store;
  private readonly destroyRef = inject(DestroyRef);

  protected readonly bucketStore = createTinyRxStore({
    input: toObservable(this.clientId),
    loader: (clientId) => this.bucketApi.getClientBucket$(clientId),
    processResponse: (response,clientId) => response.products
      .map(productInBucket => ({
        shortProduct: productInBucket,
        expanded: signal(false),
        productDetailsStore: createTinyRxStore({
          loader: () => this.productApi.getProduct$(productInBucket.productId),
          destroyRef: this.destroyRef
        })
      }))
  });
```

Unwrapping in template
```html
<div [class.loading]="bucketStore.loading | async">
  @if (bucketStore.error | async) {
    <app-generic-error text="Failed to load bucket"></app-generic-error>
  } @else {
    @for (product of bucketStore.data | async; track product.productId) {
      <div>
        <app-short-product-info 
          [product]="product.shortProduct"
        ></app-short-product-info>
      </div>
      <div>
        <button (click)="toggleExpand(product)">
          Toggle details
        </button>
      </div>
      @if (product.expanded()) {
        <div [class.loading]="product.productDetailsStore.loading | async">
          ...
        </div>
      }
    }
  }
</div>
```

### Handling separate error types
```typescript
  protected readonly store = createTinyRxStore({
    input: this.clientId$,
    loader: (clientId) => this.apiService.fetchClient(clientId),
    processResponse: (response, clientId) => response.data,
    processError: (error, clientId) => {
      if (is404(error)) return '404';
      if (is403(error)) return '403';
      if (is500(error)) return '500';
      return 'unknown';// don't return error as is because ti will merge return union type into unknown
    }
  });
```
Type will be 
```typescript
  TinyRxStore<Client,'404' | '403' | '500' | 'unknown'>
```
Therefore you'll be able to show different error messages for each error type

### Putting UPDATE result into store
```typescript
  protected readonly action$ = new BehaviorSubject<
    {type: 'fetch'} | {type: 'update', payload: UserSettings}
  >({type: 'fetch'})

  protected readonly store = createTinyRxStore({
    input: this.action$,
    loader: (action) => { 
      switch (action.type) {
        case 'fetch': return this.apiService.fetchSettings();
        case 'update': return this.apiService.updateSettings(action.payload);
      }
    },
    processResponse: (response, clientId) => response.data,
  });

  protected submit() {
    this.action$.next({ type: 'update', payload: this.from.value })
  }
```

### Dynamic combined store
In case if you need cache entities queried by id
```typescript
@Injectable({
  providedIn: 'root',
})
export class ProductsStoreService {
  private readonly productsApi = inject(ProductsApiService);

  private readonly productByIdStore: {
    [id: number]: TinyRxStore<Product, string>;
  } = {};

  public getStoreById(id: number) {
    return (this.productByIdStore[id] ??= createTinyRxStore({
      loader: () => this.productsApi.getProduct$(id),
      processError: (_, id) => `Can't load product ${id}`,
    }));
  }

  public getCombinedStoreByIds(ids: number[]) {
    const stores = ids.map((id) => this.getStoreById(id));
    return combineTinyRxStores(stores, (products) => products);
  }
}
```

### Smart cache
In case if you need cache filtered lists of entities
```typescript
@Injectable({
  providedIn: 'root',
})
export class ProductsStoreService {
  private readonly productsApi = inject(ProductsApiService);  
  private readonly loggedIn$= inject(EventsService).loggedIn$;

  private readonly dataByQuery: {
    [query: string]: TinyRxStore<Product[], string>;
  } = {};

  constructor() {
    this.loggedIn$.pipe(
      filter(loggedIn => !loggedIn), 
      takeUntilDestroyed()
    ).subscribe(() =>{
      // clear, because query can contain private data
      for (const query in this.dataByQuery) {
        delete this.dataByQuery.query;
      }
    })
  }

  public getStore(filters: FiltersObject) {
    const stringifiedQuery = JSON.stringify(filters)
    return (this.dataByQuery[stringifiedQuery] ??= createTinyRxStore({
      loader: () => this.productsApi.getProduct$(filters),
      processError: (_, filters) => `Can't fetch products`,
    }));
  }
}
```

### Unit tests
Use createTinyRxStore with mock data in loader
```typescript
describe('SomeService', () => {
  let service: SomeService;

  const createService = createServiceFactory({
    service: SomeService,
    providers: [
      {
        provide: StoreService,
        useValue: {
          store: createTinyRxStore({
            loader: () => of([1,2,3,4,5]),
          }),
        },
      },
    ],
  });
});
```