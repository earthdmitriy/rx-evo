import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CONSOLE_API_KEYS } from '../../../services/contesters';
import {
  FakeTransport,
  LatencyMode,
} from '../../../services/contesters/backend/fake-transport.service';

/**
 * Demo controls for the support console (shell, `dashboard` samples): API
 * speed and, per backend call, request counters and a Throw switch. Not part
 * of any implementation's data flow.
 */
@Component({
  selector: 'app-console-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
        <span class="section-title">Requests</span>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          (click)="transport.resetStats()"
        >
          Reset counters
        </button>
        <div class="flex items-center gap-3 sm:ml-auto">
          <span class="section-title">API speed</span>
          <div
            class="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium"
            role="group"
            aria-label="API speed"
          >
            @for (mode of modes; track mode.id) {
              <button
                type="button"
                class="rounded-md px-2.5 py-1 transition-colors"
                [class]="
                  transport.latency() === mode.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                "
                [attr.aria-pressed]="transport.latency() === mode.id"
                (click)="setLatency(mode.id)"
              >
                {{ mode.label }}
              </button>
            }
          </div>
        </div>
      </div>
      <div
        class="grid gap-1.5 border-t border-slate-200 px-5 py-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5"
      >
        @for (row of rows(); track row.key) {
          <div
            class="flex items-center gap-2 rounded-md px-2 py-1 text-xs"
            [class.bg-rose-50]="row.fault"
          >
            <span
              class="req-dot"
              [attr.data-state]="
                row.stats.inFlight
                  ? 'pending'
                  : row.stats.errors
                    ? 'error'
                    : row.stats.total
                      ? 'ok'
                      : null
              "
              aria-hidden="true"
            ></span>
            <span
              class="min-w-0 flex-1 truncate font-mono text-slate-700"
              [title]="row.key"
              >{{ row.key }}</span
            >
            <span
              class="tabular-nums text-slate-500"
              title="requests / failed / cancelled"
            >
              {{ row.stats.total }}
              @if (row.stats.errors) {
                <span class="text-rose-600">/{{ row.stats.errors }}</span>
              }
              @if (row.stats.cancelled) {
                <span>/{{ row.stats.cancelled }}c</span>
              }
            </span>
            <label
              class="switch switch-danger text-[11px]"
              [title]="'Make ' + row.key + ' fail'"
            >
              <input
                type="checkbox"
                class="peer sr-only"
                [checked]="row.fault"
                (change)="
                  transport.setFault(row.key, $any($event.target).checked)
                "
              />
              <span class="switch-track scale-75"></span>
            </label>
          </div>
        }
      </div>
    </div>
  `,
})
export class ConsoleControlsComponent {
  protected readonly transport = inject(FakeTransport);
  protected readonly modes: { id: LatencyMode; label: string }[] = [
    { id: 'slow', label: 'Slow · ≤5s' },
    { id: 'fast', label: 'Fast · ≤0.3s' },
    { id: 'manual', label: 'Manual' },
  ];
  protected readonly rows = computed(() =>
    CONSOLE_API_KEYS.map((key) => ({
      key,
      stats: this.transport.stats()[key],
      fault: !!this.transport.faults()[key],
    })),
  );

  protected setLatency(mode: LatencyMode) {
    this.transport.latency.set(mode);
  }
}
