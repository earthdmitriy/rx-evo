import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SpinnerBlockComponent } from '../../../../../../content/spinner-block/spinner-block.component';
import { OracleConsoleStore } from '../../../../data/console.store';

/** The reference's customer tier field: the skeleton (`contesters/skeleton`) with its TODO props filled from the store's tiers of the shown page. */
@Component({
  selector: 'app-oracle-customer-tier',
  imports: [AsyncPipe, SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (tier$ | async; as tier) {
        <span
          class="badge px-1.5 py-0 text-[10px]"
          data-testid="field-tier"
          [class]="tier === 'VIP' ? 'badge-accent' : 'badge-neutral'"
          >{{ tier }}</span
        >
      }
    </app-spinner-block>
  `,
})
export class OracleCustomerTier {
  public readonly customerId = input.required<number>();

  protected readonly tier$ = combineLatest([
    toObservable(this.customerId),
    inject(OracleConsoleStore).tiers$,
  ]).pipe(map(([id, tiers]) => tiers[id]));

  /** The reference shows no loading below the level of a section. */
  protected readonly loading = false;
}
