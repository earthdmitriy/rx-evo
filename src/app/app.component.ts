
import { Component, inject } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { ControllerComponent } from './components/content/controller/controller.component';

type RootNode = {
  title: string;
  child?: RouteNode[];
};
type RouteNode = {
  title: string;
  path: string;
};

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterModule, ControllerComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.less'
})
export class AppComponent {
  public readonly routes: RootNode[] = [
    {
      title: 'Legacy',
      child: [
        {
          title: 'Chaos',
          path: '/legacy/chaos',
        },
        {
          title: 'Multi-subscribe',
          path: '/legacy/multisubscribe',
        },
      ],
    },
    {
      title: 'Optimized',
      child: [
        {
          title: 'Combine',
          path: '/optimized/combine',
        },
        {
          title: 'Input',
          path: '/optimized/input',
        },
      ],
    },
    {
      title: 'Pipe',
      child: [
        {
          title: 'Almost there',
          path: '/pipe/almost-there',
        },
        {
          title: 'Stream',
          path: '/pipe/stream',
        },
      ],
    },
    {
      title: 'Signals',
      child: [
        {
          title: 'Signal',
          path: '/signals/signal',
        },
      ],
    },
    {
      title: 'WIP',
      child: [
        {
          title: 'Container-Rx',
          path: '/wip/container-rx',
        },
        {
          title: 'Container-Signal',
          path: '/wip/container-signal',
        },
        {
          title: 'Tiny-rx-store',
          path: '/wip/tiny-rx-store',
        },
        {
          title: 'Tiny-store',
          path: '/wip/tiny-store',
        },
        {
          title: 'Resource',
          path: '/wip/resource',
        },
        {
          title: 'Stateful-observable',
          path: '/wip/stateful-observable',
        },
      ],
    },
  ];

  public readonly router = inject(Router);
}
