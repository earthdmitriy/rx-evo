import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ViewBlockComponent } from '../../../../../../content/view-block/view-block.component';
import {
  ConsoleCustomerHeaderComponent,
  CustomerHeaderVm,
} from '../../../../../shared';
import { data, error, loading } from '../../../../data/block-state';
import { cacheEntry } from '../../../../data/entity-store';
import { toHeaderVm } from '../../../../data/mappers';
import { CUSTOMER } from '../../../../data/sources';
import { UI_STATE } from '../../../../data/ui-state';
import { mapVm, toVm, Vm } from '../../../../data/vm';

/** S4: the profile of the selected customer. */
@Component({
  selector: 'app-signal-store-customer-header-section',
  imports: [ViewBlockComponent, ConsoleCustomerHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="customer-header"
      [loading]="loading(header().state)"
      [error]="error(header().state)"
      (retry)="cache.reload(customerId())"
    >
      <app-console-customer-header
        [customerId]="customerId()"
        [customer]="data(header())"
        (clear)="ui.selectCustomer(null)"
      />
    </app-view-block>
  `,
})
export class SignalStoreCustomerHeaderSection {
  public readonly customerId = input.required<number>();

  protected readonly cache = inject(CUSTOMER);
  protected readonly ui = inject(UI_STATE);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  private readonly fetched = cacheEntry(this.cache, this.customerId);
  protected readonly header = computed(
    (): Vm<CustomerHeaderVm> =>
      mapVm(toVm('customer', this.fetched()), toHeaderVm),
  );
}
