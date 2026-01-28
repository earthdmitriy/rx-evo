import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { ContainerSignalComponent } from './container-signal.component';

@Component({
  selector: 'app-signal-input-wrapper',
  imports: [CommonModule, ContainerSignalComponent],
  template: `@if (counter$ | async; as counter) {
    <app-container-signal
      [clientId]="counter"
      [showBucket]="(showBucket$ | async) ?? false"
    ></app-container-signal>
  }`,
})
export class ContainerSignalInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
