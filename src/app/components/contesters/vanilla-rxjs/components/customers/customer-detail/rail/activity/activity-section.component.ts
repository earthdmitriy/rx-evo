import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../../../content/generic-error/generic-error.component';
import { ConsoleActivityComponent } from '../../../../../../shared';
import {
  data,
  error,
  idle,
  loading,
  notices,
} from '../../../../../data/block-state';
import { VanillaRxjsConsoleStore } from '../../../../../data/console.store';

/** S10: the recent activity of the selected customer. */
@Component({
  selector: 'app-vanilla-rxjs-activity-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleActivityComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="activity"
      [loading]="loading(activity().state)"
      [error]="error(activity().state)"
      (retry)="s.retryCustomerSource('activity')"
    >
      <app-console-activity
        [entries]="data(activity())"
        [customerId]="customerId()"
      />
      <div class="contents">
        @for (n of notices(activity().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class VanillaRxjsActivitySection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly activity = toSignal(this.s.activity$, {
    initialValue: idle,
  });
}
