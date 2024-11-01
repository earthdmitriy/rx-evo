import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { ResourceComponent } from './resource.component';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-resource-input-wrapper',
  standalone: true,
  imports: [CommonModule, ResourceComponent],
  template: `<app-resource
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-resource>`,
})
export class ResourceInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
