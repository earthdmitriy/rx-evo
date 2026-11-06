import { AsyncPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import {
  isInactive,
  StatefulObservable,
} from '../../../submodules/stateful-observable/src';
import { GenericErrorComponent } from '../generic-error/generic-error.component';

/**
 * `app-stateful-block` tuned to a `StatefulObservable`: its shape require only one input for state meta.
 */
@Component({
  selector: 'app-stateful-observable-block',
  imports: [AsyncPipe, GenericErrorComponent],
  templateUrl: './stateful-observable-block.component.html',
})
export class StatefulObservableBlockComponent<T> {
  public readonly stream = input.required<StatefulObservable<T>>();
  /** Shown instead of the content while the stream is inactive (`active: false`). */
  public readonly inactiveText = input('Inactive');

  protected isInactive = isInactive;
}
