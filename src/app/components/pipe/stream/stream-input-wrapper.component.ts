import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { StreamComponent } from './stream.component';

@Component({
  selector: 'app-stream-input-wrapper',
  imports: [CommonModule, StreamComponent],
  template: `@if (counter$ | async; as counter) {
    <app-stream
      [clientId]="counter"
      [showBucket]="(showBucket$ | async) ?? false"
    ></app-stream>
  }`,
})
export class StreamInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
