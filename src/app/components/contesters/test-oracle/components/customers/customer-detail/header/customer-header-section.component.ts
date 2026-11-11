import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../../../content/generic-error/generic-error.component';
import { ConsoleCustomerHeaderComponent } from '../../../../../shared';
import {
  data,
  error,
  idle,
  loading,
  notices,
} from '../../../../data/block-state';
import { OracleConsoleStore } from '../../../../data/console.store';

/** S4: the profile of the selected customer. */
@Component({
  selector: 'app-oracle-customer-header-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleCustomerHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="customer-header"
      [loading]="loading(header().state)"
      [error]="error(header().state)"
      (retry)="s.retryCustomerSource('customer')"
    >
      <app-console-customer-header
        [customerId]="customerId()"
        [customer]="data(header())"
        (clear)="s.selectCustomer(null)"
      />
      <div class="contents">
        @for (n of notices(header().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class OracleCustomerHeaderSection {
  public readonly customerId = input.required<number>();

  protected readonly s = inject(OracleConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly header = toSignal(this.s.header$, { initialValue: idle });
}
