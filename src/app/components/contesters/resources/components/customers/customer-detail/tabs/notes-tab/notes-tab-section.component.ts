import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NotesApi } from '../../../../../../../../services/contesters';
import { ResourceBlockComponent } from '../../../../../../../content/resource-block/resource-block.component';
import { ConsoleNotesTabComponent } from '../../../../../../shared';
import { createAction } from '../../../../../data/action';

/** S8: the Notes tab. */
@Component({
  selector: 'app-resources-notes-tab-section',
  imports: [ResourceBlockComponent, ConsoleNotesTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="tab-notes" [resource]="res">
      <app-console-notes-tab
        [notes]="(res.hasValue() ? res.value() : undefined) ?? null"
        [customerId]="customerId()"
        [addState]="addNote.state()"
        (add)="add($event)"
      />
    </app-resource-block>
  `,
})
export class ResourcesNotesTabSection {
  public readonly customerId = input.required<number>();

  private readonly notesApi = inject(NotesApi);
  protected readonly res = rxResource({
    params: () => this.customerId(),
    stream: ({ params }) => this.notesApi.notes(params),
  });

  protected readonly addNote = createAction((text: string) =>
    this.notesApi.addNote(this.customerId(), text),
  );

  protected add(text: string) {
    this.addNote.run(text, () => this.res.reload());
  }
}
