import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../content/spinner-block/spinner-block.component';
import { VanillaRxjsConsoleStore } from '../../../data/console.store';

/** The reference's agent name field: the skeleton with its TODO props filled from the names the notes and the open ticket looked up. */
@Component({
  selector: 'app-vanilla-rxjs-agent-name',
  imports: [AsyncPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (name$ | async; as name) {
        <span data-testid="field-agent-name">{{ name }}</span>
      }
    </app-spinner-block>
  `,
})
export class VanillaRxjsAgentName {
  public readonly agentId = input.required<number>();

  protected readonly name$ = combineLatest([
    toObservable(this.agentId),
    inject(VanillaRxjsConsoleStore).allAgentNames$,
  ]).pipe(map(([id, names]) => names[id]));

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
