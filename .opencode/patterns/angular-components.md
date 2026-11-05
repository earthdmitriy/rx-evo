# Angular components

Reactive-first rules for Angular components: inputs, outputs, queries, side
effects, and dependency injection. Every member that participates in
reactivity is `readonly`. Writable reactive state is owned by services, not
components.

## Common imports

```typescript
// ✅ common imports
import {
  inject,input,output,viewChild,viewChildren
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
```

## Inputs

Always use signal-based inputs. Never `@Input()`, never `ngOnChanges` to mirror
an input into a `Subject`.

```typescript
class SomeComponent {
    // ❌ Mutable input
    @Input() clientId!: number

    // ❌ Lifecicle hooks prohibited
    ngOnInit(): void {
    // ...
    }

    // ❌ Lifecicle hooks prohibited
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['clientId'].currentValue !== undefined) {
            this.clientId$.next(changes['clientId'].currentValue);
        }
    }

    // ✅ Reactive
    public readonly clientId = input<number>();
    // ✅ Reactive
    public readonly clientId = input.required<number>();

    // ✅ To observble for interop
    public readonly clientId$ = toObservable(this.clientId);

    // ❌ Missing readonly
    public clientId = input<number>();
}
```

## Side effects

`effect()` and subscriptions live in the constructor — never stored as
properties.

```typescript
class SomeComponent {
    // ❌ Effect as property prohibited
    private effectName = effect();
    // ❌ Subscription as property prohibited
    private subscription = this.clientId$.pipe(takeUntilDestroyed()).subscribe(/* ... */);

    constructor() {
        // ✅ side effects in constructor
        effect(/* ... */);
        this.clientId$.pipe(takeUntilDestroyed()).subscribe(/* ... */);
    }
}
```

## Dependency injection

Use `inject()` as a property initializer. Never inject in the constructor.

```typescript
class SomeComponent {
    constructor(
        // ❌ injection in constructor prohibited
        private readonly clientsApi: ClientApiService,
    ) {}
    // ✅ propery injection
    private readonly clientsApi = inject(ClientApiService);
}
```

## Reactive state ownership

Components do not own writable state. If you need to hold data, delegate to a
service that exposes a read-only signal.

```typescript
class SomeComponent {
    // ❌ writable signals prohibited
    client = signal<Client | undefined>(undefined);
    // ❌ writable subjects prohibited
    client = new BehaviorSubject<Client | undefined>(undefined);
}
```
