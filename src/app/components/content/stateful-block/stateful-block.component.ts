import { AsyncPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { StatefulObservable } from '../../../submodules/stateful-observable/src';
import { GenericErrorComponent } from '../generic-error/generic-error.component';

@Component({
  selector: 'app-stateful-block',
  imports: [AsyncPipe, GenericErrorComponent],
  templateUrl: './stateful-block.component.html',
})
export class StatefulBlockComponent<T> {
  public readonly stream = input.required<StatefulObservable<T>>();
}
