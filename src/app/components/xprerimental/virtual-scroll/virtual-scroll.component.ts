import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  distinctUntilChanged,
  map,
  Observable,
  ReplaySubject,
  shareReplay,
  Subject,
  scan,
  startWith,
  switchMap,
  withLatestFrom,
} from 'rxjs';
import {
  Client,
  ClientApiService,
} from '../../../services/api/ClientApi.service';
import {
  combineStatefulObservables,
  statefulConnection,
  statefulObservableFactory,
} from '../../../submodules/stateful-observable/src';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

const resizeOf = (element: Element) =>
  new Observable<void>((subscriber) => {
    const observer = new ResizeObserver(() => subscriber.next());
    observer.observe(element);
    return () => observer.disconnect();
  });

type PageResult = {
  readonly data: readonly Client[];
  readonly page: number;
  readonly totalResults: number;
};

/** 1-based page numbers covering `[start, end)` rows (at least page 1). */
const pagesFor = (start: number, end: number, pageSize: number): number[] => {
  const first = Math.floor(start / pageSize) + 1;
  const last = Math.max(first, Math.ceil(end / pageSize));
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
};

/** Puts every page at its place in a sparse array of `totalResults` rows. */
const placePages = (
  rows: readonly (Client | undefined)[],
  pages: readonly PageResult[],
  pageSize: number,
): (Client | undefined)[] => {
  const next =
    rows.length || !pages.length
      ? [...rows]
      : Array.from<Client | undefined>({ length: pages[0].totalResults });
  for (const { page, data } of pages) {
    next.splice((page - 1) * pageSize, data.length, ...data);
  }
  return next;
};

@Component({
  selector: 'app-virtual-scroll',
  imports: [ScrollingModule, DatePipe, AsyncPipe, GenericErrorComponent],
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

  /** One stream per page, kept after it scrolls out (`refCount: false`). */
  private readonly pages = statefulObservableFactory({
    loader: (page: number) =>
      this.clientApiService.searchClientsPaged$({
        page,
        pageSize: this.pageSize,
      }),
    cacheSize: 200,
    refCount: false,
  });

  /** Pages under the rendered range, emitted only when the set changes. */
  private readonly visiblePages$ = this.viewport$.pipe(
    switchMap((v) => v.renderedRangeStream),
    map(({ start, end }) => pagesFor(start, end, this.pageSize)),
    startWith([1]),
    distinctUntilChanged((a, b) => a.join() === b.join()),
  );

  /** The visible pages combined into one stateful stream per range. */
  private readonly visibleCombined$ = this.visiblePages$.pipe(
    map((pages) =>
      combineStatefulObservables(
        pages.map((page) => this.pages.get(page)),
        (results) => results,
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Stable handle for the template; switched to every new range. */
  public readonly stream = statefulConnection<PageResult[]>({
    name: 'visiblePages',
  });

  /**
   * Retry requests. A connection's own `reload()` is a no-op, so the retry is
   * sent to the currently connected combined stream: only failed pages reload.
   */
  public readonly retry$ = new Subject<void>();

  public readonly rows$ = this.stream.pipeValue(
    scan(
      (rows: (Client | undefined)[], pages: PageResult[]) =>
        placePages(rows, pages, this.pageSize),
      [],
    ),
  ).value$;

  constructor() {
    // CDK measures the viewport only on init and window resize; re-measure
    // when the element itself changes size (layout settling after load).
    this.viewport$
      .pipe(
        switchMap((viewport) =>
          resizeOf(viewport.elementRef.nativeElement).pipe(map(() => viewport)),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((viewport) => viewport.checkViewportSize());
    this.visibleCombined$
      .pipe(takeUntilDestroyed())
      .subscribe((combined) => this.stream.connect(combined));
    this.retry$
      .pipe(withLatestFrom(this.visibleCombined$), takeUntilDestroyed())
      .subscribe(([, combined]) => combined.reload({ onlyFailed: true }));
  }
}
