import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { ContainerRxComponent } from './container-rx.component';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-rx-input-wrapper',
  standalone: true,
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
