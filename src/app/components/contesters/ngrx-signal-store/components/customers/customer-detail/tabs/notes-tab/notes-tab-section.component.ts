import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Note, NotesApi } from '../../../../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../../../../content/view-block/view-block.component';
import { ConsoleNotesTabComponent } from '../../../../../../shared';
import { createAction } from '../../../../../data/action';
import { data, error, loading } from '../../../../../data/block-state';
import { cacheEntry } from '../../../../../data/entity-store';
import { NOTES } from '../../../../../data/sources';
import { toVm, Vm } from '../../../../../data/vm';

/** S8: the Notes tab. */
@Component({
  selector: 'app-signal-store-notes-tab-section',
  imports: [ViewBlockComponent, ConsoleNotesTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="tab-notes"
      [loading]="loading(notes().state)"
      [error]="error(notes().state)"
      (retry)="cache.reload(customerId())"
    >
      <app-console-notes-tab
        [notes]="data(notes())"
        [customerId]="customerId()"
        [addState]="addNote.state()"
        (add)="add($event)"
      />
    </app-view-block>
  `,
})
export class SignalStoreNotesTabSection {
  public readonly customerId = input.required<number>();

  protected readonly cache = inject(NOTES);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  private readonly fetched = cacheEntry(this.cache, this.customerId);
  protected readonly notes = computed(
    (): Vm<Note[]> => toVm('notes', this.fetched(), (l) => !l.length),
  );

  private readonly notesApi = inject(NotesApi);
  protected readonly addNote = createAction((text: string) =>
    this.notesApi.addNote(this.customerId(), text),
  );

  protected add(text: string) {
    this.addNote.run(text, () => this.cache.reload(this.customerId()));
  }
}
