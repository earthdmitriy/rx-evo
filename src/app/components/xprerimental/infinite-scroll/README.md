# Infinite Scroll

## Idea
**Purpose:** check how `statefulObservable` fits the infinite-scroll pattern. If the usual problems cannot be fixed in a few lines of dataflow, that is a design flaw signal for the library.

The input is one query stream: a filter change starts a fresh page sequence (`switchMap`), and a page request from the sentinel is accepted only if it is the next page. Pages are loaded through `statefulObservable` with a `cacheKey` per filters + page and accumulated by an immutable `scan` inside `pipeValue`.

## Good
- It fits without extra API: the page is just part of the input, accumulation is a plain `scan` in `pipeValue`.
- Errors bypass `pipeValue`, so a failed page does not reset the accumulator: the list stays, the error is shown below it, and **Retry** (`reload()`) loads exactly the failed page and appends it.
- One emission per change: a filter change restarts from page 1 directly, with no extra cancelled request and no `debounceTime(0)`.
- Page requests are guarded twice: the sentinel exists only while nothing is loading, and the query stream accepts only the next page number, so a duplicate or out-of-order request (e.g. a late one from the old list during a filter change) cannot skip a page or append it to the wrong list.
- `cacheKey` per filters + page: going back to earlier filters rebuilds already-seen pages from the cache without requests (a cache hit emits no loading state).
- The first page dims the table; later pages show "Loading more ..." below the list.
- A new sentinel is rendered for every loaded page, so its first intersection check loads the next page even when the list is too short to push it out of view.

## Try it
- Scroll down: "Loading more ..." appears and a page of 10 is appended; the **Client** counter grows by one per page.
- On a tall screen the list keeps loading until it fills the viewport.
- Scroll a few pages, type in **Name**, then clear it and scroll again: the earlier pages come back from the cache, the **Client** counter does not move until you pass them.
- Scroll a few pages, turn on **Throw** for the Client API and scroll on: the list stays and an error with **Retry** appears below it. Turn **Throw** off and press **Retry**: only the failed page is requested and appended.

## Next step
[Virtual Scroll](/x/virtual-scroll): render only the visible rows and load pages by their index.
