import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ActivityEntry } from '../../../../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { ConsoleActivityComponent } from '../../../../../../shared';
import { data, error, loading } from '../../../../../data/block-state';
import { cacheEntry, poll } from '../../../../../data/entity-store';
import { ACTIVITY } from '../../../../../data/sources';
import { toVm, Vm } from '../../../../../data/vm';

/** S10: the recent activity of the selected customer. Each product-viewed entry's name is its own field component. */
@Component({
  selector: 'app-signal-store-activity-section',
  imports: [ViewBlockComponent, ConsoleActivityComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="activity"
      [loading]="loading(activity().state)"
      [error]="error(activity().state)"
      (retry)="cache.reload(customerId())"
    >
      <app-console-activity
        [entries]="data(activity())"
        [customerId]="customerId()"
      />
    </app-view-block>
  `,
})
export class SignalStoreActivitySection {
  public readonly customerId = input.required<number>();

  protected readonly cache = inject(ACTIVITY);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  private readonly fetched = cacheEntry(this.cache, this.customerId);
  protected readonly activity = computed(
    (): Vm<ActivityEntry[]> =>
      toVm('activity', this.fetched(), (l) => !l.length),
  );

  constructor() {
    poll(this.cache, this.customerId, 20_000);
  }
}
