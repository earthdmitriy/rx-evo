import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { routes } from './app.routes';
import { ControllerComponent } from './components/content/controller/controller.component';
import { DataflowViewComponent } from './layout/dataflow-view/dataflow-view.component';
import { RequestMonitorService } from './services/RequestMonitor.service';
import { SampleNotesComponent } from './layout/sample-notes/sample-notes.component';
import {
  REPO_URL,
  VERDICTS,
  collectGroups,
  findActive,
  repoBlob,
  repoTree,
} from './samples/sample-meta';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ControllerComponent,
    SampleNotesComponent,
    DataflowViewComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly monitor = inject(RequestMonitorService);

  protected readonly groups = collectGroups(routes);
  private readonly flat = this.groups.flatMap((g) => g.samples);
  protected readonly total = this.flat.length;
  protected readonly repoUrl = REPO_URL;
  protected readonly verdicts = VERDICTS;
  protected readonly repoTree = repoTree;
  protected readonly repoBlob = repoBlob;

  private readonly active = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => findActive(this.router.routerState.snapshot.root)),
    ),
    { initialValue: {} as ReturnType<typeof findActive> },
  );

  protected readonly sample = computed(() => this.active().sample);
  protected readonly group = computed(() => this.active().group);

  protected readonly entry = computed(() => {
    const sample = this.sample();
    const idx = this.flat.findIndex((s) => s.title === sample?.title);
    return idx < 0
      ? undefined
      : {
          current: this.flat[idx],
          prev: this.flat[idx - 1],
          next: this.flat[idx + 1],
        };
  });

  constructor() {
    // request counters are per sample page
    effect(() => {
      this.sample();
      untracked(() => this.monitor.resetCounters());
    });
  }
}
