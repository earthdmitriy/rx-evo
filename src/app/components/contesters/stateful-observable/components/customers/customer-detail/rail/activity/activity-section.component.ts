import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { map, switchMap, timer } from 'rxjs';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { ConsoleActivityComponent } from '../../../../../../shared';
import { ACTIVITY_BY_CUSTOMER } from '../../../../../sources/lookups';

const POLL_MS = 20_000;

/**
 * S10: the polled entries are the own data of the view; a viewed product is
 * named by the products service, one lookup input.
 *
 * Errors are handled here, in the template: an error is shown only while the
 * view has no list of the customer it shows. So a failed first load shows its
 * error (R-E1), and a failed poll keeps the list with no error (R-G4); a list
 * of the previous customer is never shown as this one's (R-C2).
 */
@Component({
  selector: 'app-activity-section',
  imports: [AsyncPipe, ViewBlockComponent, ConsoleActivityComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @let shown = slot.value$ | async;
    @let list =
      shown && shown.customerId === customerId() ? shown.entries : null;
    <app-view-block
      data-section="activity"
      [loading]="slot.pending$ | async"
      [error]="list ? null : (slot.error$ | async)"
      (retry)="slot.reload()"
    >
      <app-console-activity [entries]="list" [customerId]="customerId()" />
    </app-view-block>
  `,
})
export class ActivitySectionComponent {
  public readonly customerId = input.required<number>();

  private readonly activityOf = inject(ACTIVITY_BY_CUSTOMER);

  private readonly customerId$ = toObservable(this.customerId);

  /** The activity of the customer: a settled list is kept by the factory, so coming back to a customer shows it at once (R-L5). */
  protected readonly slot = this.activityOf.project(this.customerId$);

  constructor() {
    // The poll is this view's (R-D2, R-L8): every 20 s it reloads the entry of
    // the customer shown, and stops with the view or when the customer changes.
    this.customerId$
      .pipe(
        switchMap((id) => timer(POLL_MS, POLL_MS).pipe(map(() => id))),
        takeUntilDestroyed(),
      )
      .subscribe((id) => this.activityOf.get(id).reload());
  }
}
