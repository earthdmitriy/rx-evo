import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';

/**
 * SKELETON of the agent name field (docs/contest/spec.md §2.2): the name of an
 * agent from the agent directory (the author of a note, the author of an
 * agent message in a thread). The shared views render this component with the
 * input `agentId`. The template (agent-name.component.html) is finished; the
 * data is yours: replace the two TODO props with whatever you like and change
 * the template's bindings to match.
 *
 * Keep: the selector and the input, the `data-testid`s (`state-block` from the
 * block, `field-agent-name`), and the rule that nothing is rendered while the
 * name has not arrived.
 */
@Component({
  selector: 'app-agent-name',
  imports: [SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (name) {
        <span data-testid="field-agent-name">{{ name }}</span>
      }
    </app-spinner-block>
  `,
})
export class AgentNameComponent {
  /** The agent whose name is shown. */
  public readonly agentId = input.required<number>();

  // TODO: the name of `agentId()`; `undefined` until it has arrived
  protected name: string | undefined = undefined;

  // TODO: `true` while the name is on its way
  protected loading = false;
}
