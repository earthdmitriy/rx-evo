# With Collapse

## Idea
A paged table (same flow as [Pagination](/x/pagination)) whose rows expand into the client card. Details are loaded per row by `statefulObservableFactory`, keyed by `clientId`, and rendered by `app-stateful-block`.

## Good
- Row details are a separate stream per client: loading and error states are local to the expanded row.
- The factory caches by `clientId` with `refCount: false`, so a loaded client stays loaded after its row collapses: expanding it again, even after paging away and back, is instant and sends no request.
- `clientRequestFactory.reset(true)` on destroy cleans the per-row streams.
- The expanded flag lives in the row it belongs to (`isExpanded` signal created in `pipeValue(map(...))`), not in a component-level `Set` of ids: no mutable component state, no collisions when ids are not unique, and the flag is disposed together with the page. A new emission of the page (filter or page change, cached revisit, **Reload**) is a new view, so its rows start collapsed.
- The list itself keeps the Pagination behaviour: `cacheKey`, stale page under the overlay, **Retry**, **Reload** in the header, and a page-size change that starts from page 1.

## Try it
- Click the chevron: the client card loads under the row (up to 5 s).
- Collapse and expand the same row: no new request (the **Client** counter does not move).
- Turn on **Throw** for the Client API and expand a row you have not opened yet: only that row shows the error.
- Expand a row, then press **Next** and **Prev**: the page comes back from the cache (no request) as a new view, with all rows collapsed. Expand the same row again: the card appears at once, the **Client** counter does not move.

## Next step
[Login / Logout](/x/login-logout): session-scoped streams that are wiped on logout with `active: false`.
