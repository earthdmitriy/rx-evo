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
  public readonly throwClientApiError$ = new BehaviorSubject(false);
  public readonly throwBucketApiError$ = new BehaviorSubject(false);
  public readonly throwProductApiError$ = new BehaviorSubject(false);
  public readonly loggedIn$ = new BehaviorSubject(true);

  constructor() {
    this.toggleAutoIncrement$
      .pipe(
        filter(Boolean),
        switchMap(() =>
          createCounter$(this.clientId$.value).pipe(
            takeUntil(
              this.toggleAutoIncrement$.pipe(filter((toggle) => !toggle)),
            ),
          ),
        ),
      )
      .subscribe((id) => this.clientId$.next(id));
  }
}
