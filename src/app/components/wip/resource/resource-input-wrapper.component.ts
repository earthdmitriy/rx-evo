import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { ResourceComponent } from './resource.component';

@Component({
  selector: 'app-resource-input-wrapper',
  imports: [CommonModule, ResourceComponent],
  template: `@if (counter$ | async; as counter) {
  <app-resource
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-resource>
}`,
})
export class ResourceInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
