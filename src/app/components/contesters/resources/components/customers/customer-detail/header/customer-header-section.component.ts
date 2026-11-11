import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ResourceBlockComponent } from '../../../../../../content/resource-block/resource-block.component';
import { ConsoleCustomerHeaderComponent } from '../../../../../shared';
import { CustomersRegistry } from '../../../../data/customers.registry';
import { toHeaderVm } from '../../../../data/mappers';
import { UiState } from '../../../../data/ui-state';

/** S4: the profile of the selected customer. */
@Component({
  selector: 'app-resources-customer-header-section',
  imports: [ResourceBlockComponent, ConsoleCustomerHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="customer-header" [resource]="profile()">
      <app-console-customer-header
        [customerId]="customerId()"
        [customer]="header()"
        (clear)="ui.selectCustomer(null)"
      />
    </app-resource-block>
  `,
})
export class ResourcesCustomerHeaderSection {
  public readonly customerId = input.required<number>();
  protected readonly ui = inject(UiState);

  private readonly registry = inject(CustomersRegistry);
  /** The customer's profile, the session's shared resource for this id. */
  protected readonly profile = computed(() => {
    const id = this.customerId();
    return untracked(() => this.registry.customer(id));
  });
  protected readonly header = computed(() => {
    const p = this.profile();
    const c = p.hasValue() ? p.value() : undefined;
    return c ? toHeaderVm(c) : null;
  });
}
