# Pagination

## Idea
The filter form and a page form are combined into one `statefulObservable` input; `debounceTime(0)` merges the two emissions into one request. Every filter change creates a new page form, so the page goes back to 1 without extra code. `cacheKey` includes filters, page and page size.

## Good
- Filters and page live in the input stream: no `ngOnChanges`, no manual refetch.
- New filter value → new `FormGroup` for the page → page 1. The reset is a consequence of the data flow, not a handler.
- `cacheKey` makes a revisited page instant: no request and no spinner.
- While the next page loads, the previous one stays visible under the `.loading` overlay.
- The error state has a **Retry** button wired to `stream.reload()`.
- `trackInReduxDevTools` shows `Loading...` / `Value` / `Error` actions for the stream.
- **Reload** in the table header calls `stream.reload()`: it refetches the current page, bypassing the cache.

## Try it
- Press **Next** and then **Prev**: the second visit to a page is instant, and the **Client** request counter does not move.
- Turn on **Throw** for the Client API and change a filter: the table is replaced by the error box. Turn it off and press **Retry**.
- Type in **Name** or **Email**: after the 300 ms debounce the table dims, the page indicator returns to `Page 1`.
- Go to page 3 and change **Page size**: the page resets to 1 in the same patch, so only one request is sent.
- Open Redux DevTools (if the extension is installed) and look at the `PaginationComponent Stream` actions.

## Next step
[Infinite Scroll](/x/infinite-scroll): the same list, but pages are appended as you scroll instead of replaced.
