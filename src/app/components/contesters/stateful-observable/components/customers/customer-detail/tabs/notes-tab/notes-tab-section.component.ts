import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { NotesApi } from '../../../../../../../../services/contesters';
import { StatefulBlockComponent } from '../../../../../../../content/stateful-block/stateful-block.component';
import { ConsoleNotesTabComponent } from '../../../../../../shared';
import { NOTES_BY_CUSTOMER } from '../../../../../sources/lookups';
import { action } from '../../../../../utils/action';

/** S8: the notes are the own data of the view; the authors are field components of the page (`AGENT_NAME_FIELD`, the agent directory). */
@Component({
  selector: 'app-notes-tab-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleNotesTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="tab-notes" [stream]="slot">
      <app-console-notes-tab
        [notes]="slot.value$ | async"
        [customerId]="customerId()"
        [addState]="{
          pending: !!(addNote.result.pending$ | async),
          error: addNote.result.error$ | async,
        }"
        (add)="add($event)"
      />
    </app-stateful-block>
  `,
})
export class NotesTabSectionComponent {
  public readonly customerId = input.required<number>();

  private readonly api = inject(NotesApi);
  private readonly notesOf = inject(NOTES_BY_CUSTOMER);

  /** A new note drops the cached notes of the factory and reloads the notes shown. */
  protected readonly addNote = action(
    'addNote',
    ({ customerId, text }: { customerId: number; text: string }) =>
      this.api.addNote(customerId, text).pipe(
        tap(() => {
          this.slot.reload();
        }),
      ),
  );

  /** The notes of the customer: the customer is the input, the results are cached in the factory. */
  protected readonly slot = this.notesOf.project(toObservable(this.customerId));

  protected add(text: string) {
    this.addNote.call({ customerId: this.customerId(), text });
  }
}
