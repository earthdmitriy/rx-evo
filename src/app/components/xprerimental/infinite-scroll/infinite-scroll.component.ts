import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  distinctUntilChanged,
  map,
  scan,
  shareReplay,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { IntersectionobserverDirective } from '../../../directives/intersectionobserver.directive';
import {
  Client,
  ClientApiService,
} from '../../../services/api/ClientApi.service';
import { statefulObservable } from '../../../submodules/stateful-observable/src';
import {
  ClientsFilterFormComponent,
  ClientsFilterFormValue,
} from '../../content/clients-filter-form/clients-filter-form.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

type Accumulated = {
  readonly data: readonly Client[];
  readonly page: number;
  readonly totalPages: number;
};

const EMPTY: Accumulated = { data: [], page: 0, totalPages: 1 };

@Component({
  selector: 'app-infinite-scroll',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericErrorComponent,
    ClientsFilterFormComponent,
    IntersectionobserverDirective,
  ],
  templateUrl: './infinite-scroll.component.html',
  styleUrl: './infinite-scroll.component.less',
})
export class InfiniteScrollComponent {
  private readonly clientApiService = inject(ClientApiService);

  public readonly formValue$ = new Subject<ClientsFilterFormValue>();
  /** Page requests from the sentinel ("load page N"). */
  public readonly pageRequest$ = new Subject<number>();

  /**
   * One emission per change: new filters restart from page 1, a page request
   * is accepted only if it is the next page for the current filters.
   */
  private readonly query$ = this.formValue$.pipe(
    switchMap((filters) =>
      this.pageRequest$.pipe(
        scan(
          (page, requested) => (requested === page + 1 ? requested : page),
          1,
        ),
        startWith(1),
        distinctUntilChanged(),
        map((page) => ({ filters, page })),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** The requested page: tells a first-page load from a "load more". */
  public readonly page$ = this.query$.pipe(map(({ page }) => page));

  public readonly stream = statefulObservable({
    input: this.query$,
    cacheKey: ({ filters, page }) => [
      filters.name,
      filters.email,
      filters.registeredAfter,
      filters.registeredBefore,
      page,
    ],
    loader: ({
      filters: { name, email, registeredAfter, registeredBefore },
      page,
    }) =>
      this.clientApiService.searchClientsPaged$({
        name,
        email,
        registeredBefore: registeredBefore
          ? new Date(registeredBefore)
          : undefined,
        registeredAfter: registeredAfter
          ? new Date(registeredAfter)
          : undefined,
        page,
        pageSize: 10,
      }),
  }).pipeValue(
    // errors bypass pipeValue, so accumulated pages survive a failed page
    scan(
      (acc: Accumulated, curr): Accumulated => ({
        data: curr.page === 1 ? curr.data : [...acc.data, ...curr.data],
        page: curr.page,
        totalPages: curr.totalPages,
      }),
      EMPTY,
    ),
  );
}
