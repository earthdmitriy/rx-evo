# Virtual Scroll

## Idea
The CDK viewport reports the rendered range; it is turned into the set of 1-based pages under it. Each page is its own stream from a `statefulObservableFactory` (`refCount: false`, so a page stays loaded after it scrolls out). The visible pages are combined with `combineStatefulObservables`, and a `statefulConnection` gives the template one stable handle that is switched to every new range. A `scan` in `pipeValue` places pages into a sparse array of `totalResults` rows; rows that are not loaded yet are `undefined` and render as skeletons.

## Good
- Built from library parts without new API: factory per page, combine per range, connection as the stable handle.
- Each page is requested once: a range that moves within pages already requested (even still in flight) sends no new request, and pages seen before come back instantly.
- Page numbers match the API (1-based) and the exclusive range end, so no page is requested twice and no extra page is loaded.
- The `scan` is immutable: every emission is a new array.
- A failed page affects only its rows; the error box appears above the list, and **Retry** reloads only the failed pages (`reload({ onlyFailed: true })` on the combined stream).
- The scrollbar has the full height from the first response (`Total` in the footer), and only the visible rows are in the DOM (`Rendered rows`).

## Bad
- A connection's `reload()` is a no-op, so Retry cannot be called on the handle the template holds: the component keeps the current combined stream and routes a `retry$` subject to it.

## Try it
- Scroll fast to the middle: rows show skeletons until their pages arrive; the **Client** counter grows by the number of new pages, not by scroll events.
- Scroll back to rows you have seen: they appear instantly and the counter does not move.
- Turn on **Throw** for the Client API and scroll to new rows: an error box with **Retry** appears above the list; loaded rows stay. Turn **Throw** off, **Reset counters** and press **Retry**: only the failed pages are requested.

## Next step
[With Collapse](/x/with-collapse): rows that expand into a client card loaded on demand.
