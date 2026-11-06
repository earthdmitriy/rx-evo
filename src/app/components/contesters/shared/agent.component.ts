import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PartComponent } from './part.component';
import { AgentVm, Part } from './view-models';

/** S1: the signed-in agent and Log out (always available, whatever the profile's state). */
@Component({
  selector: 'app-console-agent',
  imports: [PartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center gap-2.5', 'data-testid': 'agent', '[attr.data-content]': 'agent()?.state === "ready" ? "shown" : "none"' },
  template: `
    <app-part class="min-w-0" [part]="agent() ?? loading" [width]="8" errorText="Profile unavailable" [retryable]="true" (retry)="retryProfile.emit()">
      @if (agent()?.value; as a) {
        <div class="flex items-center gap-2.5" [attr.data-user-id]="a.agentId">
          <span class="inline-flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">{{ a.initials }}</span>
          <div class="hidden leading-tight @4xl:block">
            <div class="text-sm font-medium whitespace-nowrap text-slate-900" data-testid="agent-name">{{ a.name }}</div>
            <div class="text-xs text-slate-500">{{ a.role }}</div>
          </div>
        </div>
      }
    </app-part>
    <button type="button" class="btn btn-secondary btn-sm whitespace-nowrap" data-testid="logout" (click)="logout.emit()">Log out</button>
  `,
})
export class ConsoleAgentComponent {
  /** The profile, from its own service; null before it is requested. */
  public readonly agent = input<Part<AgentVm> | null>(null);
  public readonly logout = output<void>();
  // @s2-begin
  /** Retry on the profile after its failure (Log out works meanwhile). */
  public readonly retryProfile = output<void>();
  // @s2-end
  protected readonly loading: Part<AgentVm> = { state: 'loading', value: null };
}
