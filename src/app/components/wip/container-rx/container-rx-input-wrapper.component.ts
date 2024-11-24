import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { ContainerRxComponent } from './container-rx.component';

@Component({
  selector: 'app-rx-input-wrapper',
  imports: [CommonModule, ContainerRxComponent],
  template: `<app-container-rx
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-container-rx>`,
})
export class ContainerRxInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
