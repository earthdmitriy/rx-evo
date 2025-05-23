import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { CombineComponent } from './combine.component';

@Component({
  selector: 'app-combine-input-wrapper',
  imports: [CommonModule, CombineComponent],
  template: `<app-combine
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-combine>`,
})
export class CombineInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
