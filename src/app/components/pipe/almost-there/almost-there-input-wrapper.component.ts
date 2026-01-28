import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { AlmostThereComponent } from './almost-there.component';

@Component({
  selector: 'app-almost-there-input-wrapper',
  imports: [CommonModule, AlmostThereComponent],
  template: `@if (counter$ | async; as counter) {
    <app-almost-there
      [clientId]="counter"
      [showBucket]="(showBucket$ | async) ?? false"
    ></app-almost-there>
  }`,
})
export class AlmostThereInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
