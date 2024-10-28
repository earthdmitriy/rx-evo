import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, switchMap, takeUntil } from 'rxjs';
import { createCounter$ } from './utils';

@Injectable({
  providedIn: 'root',
})
export class EventBusService {
  public readonly clientId$ = new BehaviorSubject<number>(1);
  public readonly showBucket$ = new BehaviorSubject(true);
  public readonly toggleAutoIncrement$ = new BehaviorSubject(true);

  constructor() {
    console.log('EventBusService');
    this.toggleAutoIncrement$
      .pipe(
        filter(Boolean),
        switchMap(() =>
          createCounter$(this.clientId$.value).pipe(
            takeUntil(
              this.toggleAutoIncrement$.pipe(filter((toggle) => !toggle))
            )
          )
        )
      )
      .subscribe((id) => this.clientId$.next(id));
  }
}
