import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling'; // Import ScrollingModule
import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import {
  map,
  mergeMap,
  of,
  ReplaySubject,
  scan,
  startWith,
  switchMap,
} from 'rxjs';
import {
  Client,
  ClientApiService,
} from '../../../services/api/ClientApi.service';
import { statefulObservable } from '../../../submodules/stateful-observable/src';

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);
const getEmptyAcc = () =>
  ({ data: [], page: 0, totalPages: 0 }) as {
    data: (Client | undefined)[];
    page: number;
    totalPages: number;
  };

@Component({
  selector: 'app-virtual-scroll',
  imports: [ScrollingModule, DatePipe, AsyncPipe, ],
  host: {
    class: 'w-full h-full block flex-1 flex flex-col',
  },
  templateUrl: './virtual-scroll.component.html',
  styleUrl: './virtual-scroll.component.less',
})
export class VirtualScrollComponent {
  private readonly clientApiService = inject(ClientApiService);

  protected readonly viewport$ = new ReplaySubject<CdkVirtualScrollViewport>(1);
  @ViewChild('viewport', { static: true })
  protected set viewportRef(value: CdkVirtualScrollViewport) {
    this.viewport$.next(value);
  }

  private readonly pageSize = 10;
  protected readonly itemHeight = 52; // px

  protected readonly visiblePages$ = this.viewport$.pipe(
    switchMap((v) => v.renderedRangeStream),
    map(({ start, end }) => [
      Math.floor(start / this.pageSize),
      Math.ceil(end / this.pageSize),
    ]),
    mergeMap(([start, end]) => of(...range(start, end))), // produce page indexes as separate events
    startWith(0), // trigger first page load
  );

  public readonly stream = statefulObservable({
    input: this.visiblePages$,
    loader: (page) =>
      this.clientApiService.searchClientsPaged$({
        page,
        pageSize: this.pageSize,
      }),
    mapOperator: mergeMap, // just merge all responses, order doesn't matter
    cacheKey: (page) => [page],
  }).pipeValue(
    scan((acc, curr) => {
      if (!acc.totalPages) {
        acc.totalPages = curr.totalPages;
        // fill with empty array
        acc.data = Array.from<Client | undefined>({
          length: curr.totalResults,
        });
      }

      // put data onto corresponding indexes
      acc.data.splice(
        (curr.page - 1) * this.pageSize,
        this.pageSize,
        ...curr.data,
      );

      acc.page = curr.page;
      acc.totalPages = curr.totalPages;
      return acc;
    }, getEmptyAcc()),
    map((x) => x.data),
  );
}
