import { Component, input, ResourceRef } from '@angular/core';
import { GenericErrorComponent } from '../generic-error/generic-error.component';

/**
 * A block for a `resource()`/`rxResource()`: its loading class, failed state
 * (with reload) and idle text all come from the resource, so it takes only the
 * `[resource]` input.
 */
@Component({
  selector: 'app-resource-block',
  imports: [GenericErrorComponent],
  templateUrl: './resource-block.component.html',
})
export class ResourceBlockComponent<T> {
  public readonly resource = input.required<ResourceRef<T>>();
  /** Shown instead of the content while the stream is inactive (`active: false`). */
  public readonly inactiveText = input('Inactive');
}
