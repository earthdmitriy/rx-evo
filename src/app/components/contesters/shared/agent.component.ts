import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AgentVm } from './view-models';

/** S1: the signed-in agent. Log out is the frame's (it works whatever the profile's state). */
@Component({
  selector: 'app-console-agent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center gap-2.5',
    'data-testid': 'agent',
    '[attr.data-content]': 'agent() ? "shown" : "none"',
  },
  template: `
    @if (agent(); as a) {
      <div class="flex items-center gap-2.5" [attr.data-user-id]="a.agentId">
        <span
          class="inline-flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
          >{{ a.initials }}</span
        >
        <div class="hidden leading-tight @4xl:block">
          <div
            class="text-sm font-medium whitespace-nowrap text-slate-900"
            data-testid="agent-name"
          >
            {{ a.name }}
          </div>
          <div class="text-xs text-slate-500">{{ a.role }}</div>
        </div>
      </div>
    } @else {
      <span class="inline-block h-8 w-8"></span>
    }
  `,
})
export class ConsoleAgentComponent {
  /** The profile, from its own service; null before it is requested. */
  public readonly agent = input<AgentVm | null>(null);
}
