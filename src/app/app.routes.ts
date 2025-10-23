import { Routes } from '@angular/router';
import { ChaosInputWrapperComponent } from './components/legacy/chaos/chaos-input-wrapper.component';
import { MultiSubscribeInputWrapperComponent } from './components/legacy/multi-subscribe/multi-subscribe-input-wrapper.component ';
import { CombineInputWrapperComponent } from './components/optimized/combine/combine-input-wrapper.component';
import { InputInputWrapperComponent } from './components/optimized/input/input-input-wrapper.component';
import { AlmostThereInputWrapperComponent } from './components/pipe/almost-there/almost-there-input-wrapper.component';
import { StreamInputWrapperComponent } from './components/pipe/stream/stream-input-wrapper.component';
import { SignalInputWrapperComponent } from './components/signals/signal/signal-input-wrapper.component';
import { ContainerRxInputWrapperComponent } from './components/wip/container-rx/container-rx-input-wrapper.component';
import { ContainerSignalInputWrapperComponent } from './components/wip/container-signal/container-signal-input-wrapper.component';
import { TinyStoreComponent } from './components/wip/tiny-store/tiny-store.component';
import { TinyStoreInputWrapperComponent } from './components/wip/tiny-store/tiny-store-input-wrapper.component';
import { ResourceInputWrapperComponent } from './components/wip/resource/resource-input-wrapper.component';
import { TinyRxStoreInputWrapperComponent } from './components/wip/tiny-rx-store/tiny-rx-store-input-wrapper.component';
import { StatefulObservableInputWrapperComponent } from './components/wip/stateful-observable/stateful-observable-input-wrapper.component';

export const routes: Routes = [
  {
    path: 'legacy',
    children: [
      { path: 'chaos', component: ChaosInputWrapperComponent },
      {
        path: 'multisubscribe',
        component: MultiSubscribeInputWrapperComponent,
      },
    ],
  },
  {
    path: 'optimized',
    children: [
      { path: 'combine', component: CombineInputWrapperComponent },
      {
        path: 'input',
        component: InputInputWrapperComponent,
      },
    ],
  },
  {
    path: 'pipe',
    children: [
      { path: 'almost-there', component: AlmostThereInputWrapperComponent },
      {
        path: 'stream',
        component: StreamInputWrapperComponent,
      },
    ],
  },
  {
    path: 'signals',
    children: [{ path: 'signal', component: SignalInputWrapperComponent }],
  },
  {
    path: 'wip',
    children: [
      { path: 'container-rx', component: ContainerRxInputWrapperComponent },
      {
        path: 'container-signal',
        component: ContainerSignalInputWrapperComponent,
      },
      {
        path: 'tiny-rx-store',
        component: TinyRxStoreInputWrapperComponent,
      },
      {
        path: 'tiny-store',
        component: TinyStoreInputWrapperComponent,
      },
      {
        path: 'resource',
        component: ResourceInputWrapperComponent,
      },
      {
        path: 'stateful-observable',
        component: StatefulObservableInputWrapperComponent,
      },
    ],
  },
];
