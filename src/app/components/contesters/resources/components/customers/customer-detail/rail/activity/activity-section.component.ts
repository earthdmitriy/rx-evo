import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { ResourceBlockComponent } from '../../../../../../../content/resource-block/resource-block.component';
import { ConsoleActivityComponent } from '../../../../../../shared';
import { ActivityRegistry } from '../../../../../data/activity.registry';

/** S10: the recent activity of the selected customer. Each product-viewed entry's name is its own field component. A 20s poll keeps it fresh (R-D2) via `reload()`. */
@Component({
  selector: 'app-resources-activity-section',
  imports: [ResourceBlockComponent, ConsoleActivityComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="activity" [resource]="res()">
      <app-console-activity
        [entries]="(res().hasValue() ? res().value() : undefined) ?? null"
        [customerId]="customerId()"
      />
    </app-resource-block>
  `,
})
export class ResourcesActivitySection {
  public readonly customerId = input.required<number>();

  private readonly registry = inject(ActivityRegistry);
  /** The customer's activity: the session's shared resource. */
  protected readonly res = computed(() => {
    const id = this.customerId();
    return untracked(() => this.registry.activity(id));
  });

  constructor() {
    interval(20_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.res().reload());
  }
}
