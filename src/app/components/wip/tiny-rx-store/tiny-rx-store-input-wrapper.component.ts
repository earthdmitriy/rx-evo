import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { TinyRxStoreComponent } from './tiny-rx-store.component';

@Component({
  selector: 'app-tiny-store-input-wrapper',
  imports: [CommonModule, TinyRxStoreComponent],
  template: `@if (counter$ | async; as counter) {
    <app-tiny-rx-store
      [clientId]="counter"
      [showBucket]="(showBucket$ | async) ?? false"
    ></app-tiny-rx-store>
  }`,
})
export class TinyRxStoreInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
