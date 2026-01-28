import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'legacy',
    children: [
      {
        path: 'chaos',
        loadComponent: () =>
          import(
            './components/legacy/chaos/chaos-input-wrapper.component'
          ).then((m) => m.ChaosInputWrapperComponent),
      },
      {
        path: 'multisubscribe',
        loadComponent: () =>
          import(
            './components/legacy/multi-subscribe/multi-subscribe-input-wrapper.component '
          ).then((m) => m.MultiSubscribeInputWrapperComponent),
      },
    ],
  },
  {
    path: 'optimized',
    children: [
      {
        path: 'combine',
        loadComponent: () =>
          import(
            './components/optimized/combine/combine-input-wrapper.component'
          ).then((m) => m.CombineInputWrapperComponent),
      },
      {
        path: 'input',
        loadComponent: () =>
          import(
            './components/optimized/input/input-input-wrapper.component'
          ).then((m) => m.InputInputWrapperComponent),
      },
    ],
  },
  {
    path: 'pipe',
    children: [
      {
        path: 'almost-there',
        loadComponent: () =>
          import(
            './components/pipe/almost-there/almost-there-input-wrapper.component'
          ).then((m) => m.AlmostThereInputWrapperComponent),
      },
      {
        path: 'stream',
        loadComponent: () =>
          import(
            './components/pipe/stream/stream-input-wrapper.component'
          ).then((m) => m.StreamInputWrapperComponent),
      },
    ],
  },
  {
    path: 'signals',
    children: [
      {
        path: 'signal',
        loadComponent: () =>
          import(
            './components/signals/signal/signal-input-wrapper.component'
          ).then((m) => m.SignalInputWrapperComponent),
      },
    ],
  },
  {
    path: 'wip',
    children: [
      {
        path: 'container-rx',
        loadComponent: () =>
          import(
            './components/wip/container-rx/container-rx-input-wrapper.component'
          ).then((m) => m.ContainerRxInputWrapperComponent),
      },
      {
        path: 'container-signal',
        loadComponent: () =>
          import(
            './components/wip/container-signal/container-signal-input-wrapper.component'
          ).then((m) => m.ContainerSignalInputWrapperComponent),
      },
      {
        path: 'tiny-rx-store',
        loadComponent: () =>
          import(
            './components/wip/tiny-rx-store/tiny-rx-store-input-wrapper.component'
          ).then((m) => m.TinyRxStoreInputWrapperComponent),
      },
      {
        path: 'tiny-store',
        loadComponent: () =>
          import(
            './components/wip/tiny-store/tiny-store-input-wrapper.component'
          ).then((m) => m.TinyStoreInputWrapperComponent),
      },
      {
        path: 'resource',
        loadComponent: () =>
          import(
            './components/wip/resource/resource-input-wrapper.component'
          ).then((m) => m.ResourceInputWrapperComponent),
      },
      {
        path: 'stateful-observable',
        loadComponent: () =>
          import(
            './components/wip/stateful-observable/stateful-observable-input-wrapper.component'
          ).then((m) => m.StatefulObservableInputWrapperComponent),
      },
    ],
  },
  {
    path: 'x',
    children: [
      {
        path: 'pagination',
        loadComponent: () =>
          import(
            './components/xprerimental/pagination/pagination.component'
          ).then((m) => m.PaginationComponent),
      },
      {
        path: 'infinite-scroll',
        loadComponent: () =>
          import(
            './components/xprerimental/infinite-scroll/infinite-scroll.component'
          ).then((m) => m.InfiniteScrollComponent),
      },
      {
        path: 'virtual-scroll',
        loadComponent: () =>
          import(
            './components/xprerimental/virtual-scroll/virtual-scroll.component'
          ).then((m) => m.VirtualScrollComponent),
      },
      {
        path: 'with-collapse',
        loadComponent: () =>
          import(
            './components/xprerimental/with-collapse/with-collapse.component'
          ).then((m) => m.WithCollapseComponent),
      },
    ],
  },
];
