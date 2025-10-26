import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { TinyStoreComponent } from './tiny-store.component';

@Component({
  selector: 'app-tiny-store-input-wrapper',
  imports: [CommonModule, TinyStoreComponent],
  template: `@if (counter$ | async; as counter) {
  <app-tiny-store
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-tiny-store>
}`,
})
export class TinyStoreInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
