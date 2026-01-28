import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { StatefulObservableComponent } from './stateful-observable.component';

@Component({
  selector: 'app-stateful-observable-input-wrapper',
  imports: [CommonModule, StatefulObservableComponent],
  template: `@if (counter$ | async; as counter) {
    <app-stateful-observable
      [clientId]="counter"
      [showBucket]="(showBucket$ | async) ?? false"
    ></app-stateful-observable>
  }`,
})
export class StatefulObservableInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
