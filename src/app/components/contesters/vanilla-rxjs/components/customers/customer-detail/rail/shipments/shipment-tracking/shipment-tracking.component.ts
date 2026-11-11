import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../../../../content/spinner-block/spinner-block.component';
import { VanillaRxjsConsoleStore } from '../../../../../../data/console.store';

/** The reference's shipment tracking field: the skeleton with its TODO props filled from the shipping service's answers that arrived. */
@Component({
  selector: 'app-vanilla-rxjs-shipment-tracking',
  imports: [AsyncPipe, DatePipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="block" [loading]="loading">
      @if (tracking$ | async; as s) {
        <div data-testid="field-shipment-tracking">
          <div class="flex items-center gap-2">
            <span
              class="badge"
              [class]="
                s.state === 'Delayed'
                  ? 'badge-warn'
                  : s.state === 'In transit'
                    ? 'badge-info'
                    : 'badge-neutral'
              "
              >{{ s.state }}</span
            >
            <span class="ml-auto text-xs whitespace-nowrap text-slate-500"
              >ETA {{ s.eta | date: 'MMM d' }}</span
            >
          </div>
          <div class="mt-1 truncate text-xs text-slate-500">
            {{ s.carrier }} · {{ s.lastScan }}
          </div>
        </div>
      }
    </app-spinner-block>
  `,
})
export class VanillaRxjsShipmentTracking {
  public readonly orderId = input.required<string>();

  protected readonly tracking$ = combineLatest([
    toObservable(this.orderId),
    inject(VanillaRxjsConsoleStore).tracking$,
  ]).pipe(map(([id, tracking]) => tracking[id]));

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
