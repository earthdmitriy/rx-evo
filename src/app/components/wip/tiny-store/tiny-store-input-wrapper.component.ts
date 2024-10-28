import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { TinyStoreComponent } from './tiny-store.component';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-tiny-store-input-wrapper',
  standalone: true,
  imports: [CommonModule, TinyStoreComponent],
  template: `<app-tiny-store
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-tiny-store>`,
})
export class TinyStoreInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
