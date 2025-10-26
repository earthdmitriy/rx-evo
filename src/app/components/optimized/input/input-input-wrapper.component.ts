import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { InputComponent } from './input.component';

@Component({
  selector: 'app-input-input-wrapper',
  imports: [CommonModule, InputComponent],
  template: `@if (counter$ | async; as counter) {
  <app-input
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-input>
}`,
})
export class InputInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
