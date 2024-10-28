import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { StreamComponent } from './stream.component';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-stream-input-wrapper',
  standalone: true,
  imports: [CommonModule, StreamComponent],
  template: `<app-stream
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-stream>`,
})
export class StreamInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
