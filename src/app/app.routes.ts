import { Routes } from '@angular/router';
import { groupRoute, sampleRoute } from './samples/sample-meta';

/**
 * Groups follow the folder order under `components/` — worst → best.
 * Every sample keeps its description out of its own code:
 *   - short facts here (`SampleMeta`),
 *   - long form in the sample folder's `README.md` (see docs/sample-description.md).
 */

const entityCardDocs = [
  { label: 'Entity card', path: 'docs/reactive_patterns/entity-card.md' },
  {
    label: 'Complex entity card',
    path: 'docs/reactive_patterns/complex-entity-card.md',
  },
];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'rx-evo · reactive patterns, worst → best',
    loadComponent: () =>
      import('./layout/home/home.component').then((m) => m.HomeComponent),
  },

  groupRoute(
    'legacy',
    {
      title: 'Legacy',
      blurb:
        'Imperative loading: promises and subscriptions write into mutable fields from lifecycle hooks.',
    },
    [
      sampleRoute(
        'chaos',
        () =>
          import('./components/legacy/chaos/chaos-input-wrapper.component').then(
            (m) => m.ChaosInputWrapperComponent,
          ),
        {
          title: 'Chaos',
          summary:
            'Pure anti-pattern: no change handling, no progressive loading, a hidden race condition, no error handling.',
          verdict: 'anti-pattern',
          scenario: 'client-card',
          tags: [
            'Promise',
            '@Input',
            'ngOnInit',
            'ngOnChanges',
            'mutable fields',
          ],
          folder: 'legacy/chaos',
          readme: () =>
            import('./components/legacy/chaos/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/legacy/chaos/chaos.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
      sampleRoute(
        'multisubscribe',
        () =>
          import('./components/legacy/multi-subscribe/multi-subscribe-input-wrapper.component ').then(
            (m) => m.MultiSubscribeInputWrapperComponent,
          ),
        {
          title: 'Multi-subscribe',
          summary:
            "Chaos's race is mitigated by starting one subscribe() from inside another — still blind to input changes and errors.",
          verdict: 'anti-pattern',
          scenario: 'client-card',
          tags: ['subscribe()', 'nested subscriptions', '@Input', 'ngOnInit'],
          folder: 'legacy/multi-subscribe',
          readme: () =>
            import('./components/legacy/multi-subscribe/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/legacy/multi-subscribe/multi-subscribe.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
    ],
  ),

  groupRoute(
    'optimized',
    {
      title: 'Optimized',
      blurb:
        'Same imperative shape, but requests are combined and subscriptions are cleaned up.',
    },
    [
      sampleRoute(
        'combine',
        () =>
          import('./components/optimized/combine/combine-input-wrapper.component').then(
            (m) => m.CombineInputWrapperComponent,
          ),
        {
          title: 'Combine',
          summary:
            'forkJoin with takeUntil: decent for a one-shot component, but all-or-nothing.',
          verdict: 'leaky',
          scenario: 'client-card',
          tags: ['forkJoin', 'takeUntil', 'destroy$', 'ngOnInit'],
          folder: 'optimized/combine',
          readme: () =>
            import('./components/optimized/combine/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/optimized/combine/combine.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
      sampleRoute(
        'input',
        () =>
          import('./components/optimized/input/input-input-wrapper.component').then(
            (m) => m.InputInputWrapperComponent,
          ),
        {
          title: 'Input',
          summary:
            'First sample with change handling (ngOnChanges) — still all-or-nothing, still no error handling.',
          verdict: 'leaky',
          scenario: 'client-card',
          tags: ['forkJoin', 'ngOnChanges', 'takeUntil', 'manual cache'],
          folder: 'optimized/input',
          readme: () =>
            import('./components/optimized/input/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/optimized/input/input.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
    ],
  ),

  groupRoute(
    'pipe',
    {
      title: 'Pipe',
      blurb:
        'Data is described as streams and the template subscribes; loading flags are still pushed by hand.',
    },
    [
      sampleRoute(
        'almost-there',
        () =>
          import('./components/pipe/almost-there/almost-there-input-wrapper.component').then(
            (m) => m.AlmostThereInputWrapperComponent,
          ),
        {
          title: 'Almost there',
          summary:
            'Change handling removed for simplicity, to show a component running on async pipes without explicit subscriptions.',
          verdict: 'leaky',
          scenario: 'client-card',
          tags: ['defer', 'combineLatest', 'async pipe', 'tap side effect'],
          folder: 'pipe/almost-there',
          readme: () =>
            import('./components/pipe/almost-there/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/pipe/almost-there/almost-there.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
      sampleRoute(
        'stream',
        () =>
          import('./components/pipe/stream/stream-input-wrapper.component').then(
            (m) => m.StreamInputWrapperComponent,
          ),
        {
          title: 'Stream',
          summary:
            'Best pre-signal solution without extra libraries: per-id switchMap and progressive loading; errors left out to avoid bloat.',
          verdict: 'getting-there',
          scenario: 'client-card',
          tags: [
            'ReplaySubject',
            'switchMap',
            'shareReplay',
            'BehaviorSubject flags',
          ],
          folder: 'pipe/stream',
          readme: () =>
            import('./components/pipe/stream/README.md').then((m) => m.default),
          dataflow: () =>
            import('./components/pipe/stream/stream.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
    ],
  ),

  groupRoute(
    'signals',
    {
      title: 'Signals',
      blurb:
        'Signal inputs and toSignal for the template, RxJS for async — readiness flags are still written from tap.',
    },
    [
      sampleRoute(
        'signal',
        () =>
          import('./components/signals/signal/signal-input-wrapper.component').then(
            (m) => m.SignalInputWrapperComponent,
          ),
        {
          title: 'Signal',
          summary:
            'Almost the same as Stream, with async pipes and ready subjects replaced by signals.',
          verdict: 'getting-there',
          scenario: 'client-card',
          tags: ['input()', 'toObservable', 'toSignal', 'writable signal'],
          folder: 'signals/signal',
          readme: () =>
            import('./components/signals/signal/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/signals/signal/signal.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
    ],
  ),

  groupRoute(
    'wip',
    {
      title: 'WIP',
      blurb:
        'Loading, error and value travel together as one primitive: home-grown containers, tiny stores, rxResource and statefulObservable.',
    },
    [
      sampleRoute(
        'container-rx',
        () =>
          import('./components/wip/container-rx/container-rx-input-wrapper.component').then(
            (m) => m.ContainerRxInputWrapperComponent,
          ),
        {
          title: 'Container-Rx',
          summary:
            'First draft of tooling: progressive loading and error display without bloating the component; combining looks messy.',
          verdict: 'getting-there',
          scenario: 'client-card',
          tags: ['wrapMapRequest', 'combineResponses', 'async pipe'],
          folder: 'wip/container-rx',
          readme: () =>
            import('./components/wip/container-rx/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/wip/container-rx/container-rx.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
      sampleRoute(
        'container-signal',
        () =>
          import('./components/wip/container-signal/container-signal-input-wrapper.component').then(
            (m) => m.ContainerSignalInputWrapperComponent,
          ),
        {
          title: 'Container-Signal',
          summary:
            'Containers exposed as signals (a shape later found in Angular resources) — and the discovery that signals are eager.',
          verdict: 'getting-there',
          scenario: 'client-card',
          tags: ['wrapMapRequest', 'toSignal', 'computed', 'input()'],
          folder: 'wip/container-signal',
          readme: () =>
            import('./components/wip/container-signal/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/wip/container-signal/container-signal.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
      sampleRoute(
        'tiny-rx-store',
        () =>
          import('./components/wip/tiny-rx-store/tiny-rx-store-input-wrapper.component').then(
            (m) => m.TinyRxStoreInputWrapperComponent,
          ),
        {
          title: 'Tiny-rx-store',
          summary:
            'Lessons learned: a small RxJS store with an improved combine and reload().',
          verdict: 'getting-there',
          scenario: 'client-card',
          tags: ['createTinyRxStore', 'combineTinyRxStores', 'shared store'],
          folder: 'wip/tiny-rx-store',
          readme: () =>
            import('./components/wip/tiny-rx-store/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/wip/tiny-rx-store/tiny-rx-store.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
      sampleRoute(
        'tiny-store',
        () =>
          import('./components/wip/tiny-store/tiny-store-input-wrapper.component').then(
            (m) => m.TinyStoreInputWrapperComponent,
          ),
        {
          title: 'Tiny-store',
          summary:
            'Tiny-rx-store with a signal API — declined, because it is eager.',
          verdict: 'getting-there',
          scenario: 'client-card',
          tags: ['createTinyStore', 'combineTinyStores', 'signals'],
          folder: 'wip/tiny-store',
          readme: () =>
            import('./components/wip/tiny-store/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/wip/tiny-store/tiny-store.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
      sampleRoute(
        'resource',
        () =>
          import('./components/wip/resource/resource-input-wrapper.component').then(
            (m) => m.ResourceInputWrapperComponent,
          ),
        {
          title: 'Resource',
          summary:
            'Angular rxResource: eager, wipes content on every new request (layout shift), needs a hand-written combineResources, but has retry.',
          verdict: 'getting-there',
          scenario: 'client-card',
          tags: ['rxResource', 'combineResources', 'input()'],
          folder: 'wip/resource',
          readme: () =>
            import('./components/wip/resource/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/wip/resource/resource.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
      sampleRoute(
        'stateful-observable',
        () =>
          import('./components/wip/stateful-observable/stateful-observable-input-wrapper.component').then(
            (m) => m.StatefulObservableInputWrapperComponent,
          ),
        {
          title: 'Stateful-observable',
          summary:
            'The final solution: statefulObservable with pure pipeValue/pipeError mapping, combineStatefulObservables and a StatefulBlock consumer.',
          verdict: 'target',
          scenario: 'client-card',
          tags: [
            'statefulObservable',
            'pipeValue',
            'pipeError',
            'combineStatefulObservables',
            'InjectionToken',
          ],
          folder: 'wip/stateful-observable',
          readme: () =>
            import('./components/wip/stateful-observable/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/wip/stateful-observable/stateful-observable.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: entityCardDocs,
        },
      ),
    ],
  ),

  groupRoute(
    'x',
    {
      title: 'Xperimental',
      blurb:
        'Typical real-life list scenarios to assess the final solution: filters, pagination, infinite and virtual scroll, nested requests per row.',
    },
    [
      sampleRoute(
        'pagination',
        () =>
          import('./components/xprerimental/pagination/pagination.component').then(
            (m) => m.PaginationComponent,
          ),
        {
          title: 'Pagination',
          summary:
            'Filters + page form combined into one statefulObservable input; cacheKey makes revisited pages instant.',
          verdict: 'experimental',
          scenario: 'list',
          tags: [
            'statefulObservable',
            'cacheKey',
            'reactive forms',
            'Redux DevTools',
          ],
          folder: 'xprerimental/pagination',
          readme: () =>
            import('./components/xprerimental/pagination/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/xprerimental/pagination/pagination.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: [
            {
              label: 'List with filters and pagination',
              path: 'docs/reactive_patterns/list-filters-pagination.md',
            },
          ],
        },
      ),
      sampleRoute(
        'infinite-scroll',
        () =>
          import('./components/xprerimental/infinite-scroll/infinite-scroll.component').then(
            (m) => m.InfiniteScrollComponent,
          ),
        {
          title: 'Infinite Scroll',
          summary:
            'How statefulObservable fits infinite scroll: the page is part of the input, scan in pipeValue accumulates, errors keep the list.',
          verdict: 'experimental',
          scenario: 'list',
          tags: ['statefulObservable', 'scan', 'IntersectionObserver'],
          folder: 'xprerimental/infinite-scroll',
          readme: () =>
            import('./components/xprerimental/infinite-scroll/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/xprerimental/infinite-scroll/infinite-scroll.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: [
            {
              label: 'List with filters and pagination',
              path: 'docs/reactive_patterns/list-filters-pagination.md',
            },
          ],
        },
      ),
      sampleRoute(
        'virtual-scroll',
        () =>
          import('./components/xprerimental/virtual-scroll/virtual-scroll.component').then(
            (m) => m.VirtualScrollComponent,
          ),
        {
          title: 'Virtual Scroll',
          summary:
            'CDK viewport range → visible pages from a per-page factory, combined per range; pages land in a sparse array.',
          verdict: 'experimental',
          scenario: 'list',
          tags: [
            'statefulObservable',
            'mergeMap',
            'CDK virtual scroll',
            'scan',
          ],
          folder: 'xprerimental/virtual-scroll',
          readme: () =>
            import('./components/xprerimental/virtual-scroll/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/xprerimental/virtual-scroll/virtual-scroll.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: [
            {
              label: 'Virtual scroll',
              path: 'docs/reactive_patterns/virtual-scroll.md',
            },
          ],
        },
      ),
      sampleRoute(
        'with-collapse',
        () =>
          import('./components/xprerimental/with-collapse/with-collapse.component').then(
            (m) => m.WithCollapseComponent,
          ),
        {
          title: 'With Collapse',
          summary:
            'Paged table whose rows expand into a client card loaded by statefulObservableFactory per id.',
          verdict: 'experimental',
          scenario: 'list',
          tags: [
            'statefulObservableFactory',
            'StatefulBlock',
            'nested requests',
          ],
          folder: 'xprerimental/with-collapse',
          readme: () =>
            import('./components/xprerimental/with-collapse/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/xprerimental/with-collapse/with-collapse.component.dataflow.md').then(
              (m) => m.default,
            ),
          docs: [
            {
              label: 'List with nested requests',
              path: 'docs/reactive_patterns/list-with-nested-requests.md',
            },
          ],
        },
      ),
      sampleRoute(
        'login-logout',
        () =>
          import('./components/xprerimental/login-logout/login-logout.component').then(
            (m) => m.LoginLogoutComponent,
          ),
        {
          title: 'Login / Logout',
          summary:
            'Invalidating derived streams: active: false on the root wipes everything derived from it, even behind shareReplay(1), where vanilla RxJS would replay the previous user.',
          verdict: 'experimental',
          scenario: 'auth',
          tags: [
            'statefulObservable',
            'active',
            'InjectionToken',
            'StatefulBlock',
          ],
          folder: 'xprerimental/login-logout',
          readme: () =>
            import('./components/xprerimental/login-logout/README.md').then(
              (m) => m.default,
            ),
          dataflow: () =>
            import('./components/xprerimental/login-logout/login-logout.component.dataflow.md').then(
              (m) => m.default,
            ),
        },
      ),
    ],
  ),

  { path: '**', redirectTo: '' },
];
