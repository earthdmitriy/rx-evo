import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../../../content/generic-error/generic-error.component';
import { ConsoleNotesTabComponent } from '../../../../../../shared';
import {
  data,
  error,
  idle,
  loading,
  notices,
} from '../../../../../data/block-state';
import { VanillaRxjsConsoleStore } from '../../../../../data/console.store';

/** S8: the Notes tab. */
@Component({
  selector: 'app-vanilla-rxjs-notes-tab-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleNotesTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="tab-notes"
      [loading]="loading(notes().state)"
      [error]="error(notes().state)"
      (retry)="s.retryCustomerSource('notes')"
    >
      <app-console-notes-tab
        [notes]="data(notes())"
        [customerId]="customerId()"
        [addState]="note()"
        (add)="s.addNote(customerId(), $event)"
      />
      <div class="contents">
        @for (n of notices(notes().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class VanillaRxjsNotesTabSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly notes = toSignal(this.s.notes$, { initialValue: idle });
  protected readonly note = toSignal(this.s.note$, { requireSync: true });
}
