# Stage 3: Efficient

The console works and survives failures, but it is slow and heavy: it
requests what nobody looks at, asks for the same thing several times, asks
one id at a time, reloads what it already has, and makes the agent wait for
everything before showing anything.

Everything of stages 1 and 2 still holds.

## Requirements

### Laziness

- **R-L1.** Signed out, the page sends **no request**; polls stop at logout.
- **R-L2.** A source is requested only when a visible section needs it:
  - `cart`, `tickets`, `notes` only when their tab is shown;
  - `order` / `ticketsByOrder` / `ticket` only when their panel is open;
  - `searchProducts`, `prices` and `stock` of hits only in the order editor,
    and only for a search text (an empty box requests nothing);
  - `product` only for the skus a visible section shows by name (cart
    lines, order lines, viewed-product sentences);
  - `agent` only for notes and thread authors on screen; `tiers` and
    `ticketCounts` only for the rows of the page shown (and the selected
    customer's open-tickets KPI);
  - `shipment` only for orders whose status is in flight
    (`Processing`, `Shipped`);
  - `activity` and `orderStats` only while a customer is selected.
- **R-L3.** One request per key, however many sections show it:
  - `orders` serves S5 and S9;
  - `notifications` serves the badge and the dropdown;
  - `ticketCounts` of a customer serves its S3 row, the S4 KPI and the Tickets
    badge; `orderStats` serves the KPIs and the Orders badge.
- **R-L4.** The search is debounced (300 ms): typing sends one request per
  pause, not one per keystroke. A text, filter or sort change resets to
  page 1 in **one** request. The same goes for the editor's product search.
- **R-L11.** **Lazy sentences.** The notification sentences need the customer
  of every `ticket-reply`; those `customer` look-ups happen **only while the
  dropdown is open**. The bell badge needs only `notifications`.

### Batching and sharing

- **R-L9.** **Batch services are asked in batches.** All ids needed at the
  same moment go out together: one `tiers` and one `ticketCounts` request per
  customer-list page (not per row); one `prices` request for a hit list (and
  for a cart); a cart with more than 20 distinct skus costs ⌈n/20⌉ `prices`
  requests, none with more than 20 ids. `product`, `stock` and `agent` have no
  batch endpoint: one call per id, never twice for the same id.
- **R-L10.** **One entity, one request.** An id that is loaded (or in
  flight) is not requested again by another section: a sku shown in the
  cart, in an order's lines, in the activity and among hits costs one
  `product` request while cached; a customer's counters, tier or profile
  fetched for one section serve all of them (the S3 row's `ticketCounts` is
  the S4 KPI's; the `customer` look-up of a sentence is the S4 profile).
  The caches are shared across sections.

### Cache and hold state

- **R-L5.** Within one session, a key that was loaded is served from cache
  when shown again: switching tabs back, reopening the same order or ticket,
  going back to a customer, returning to a page of the customer list with
  the same query, repeating a product search, navigating to another sample
  and back. No request, no loading state.
- **R-L6.** Products, prices and stock are public: requested once per sku
  per app, kept across logout and sign-in (the cached values may be stale;
  a write that changes stock marks it outdated, R-L7).
- **R-L7.** A cached key is refetched only when a write invalidates it
  (stage 2, R-W10), on Retry, or by its poll.
- **R-L8.** Polls run only while their view exists: `notifications` while
  signed in, `activity` while a customer is selected.

### Progressive loading

- **R-P1.** Independent sources start in parallel and each section renders
  as soon as its own data arrives. On sign-in: `profile`, `notifications`,
  `customers`. On customer selection: `customer`, `orderStats`,
  `ticketCounts`, S5 (or the active tab), S9 and S10. None waits for another.
- **R-P2.** S9 lists the in-flight orders as soon as `orders` arrives; each
  row shows its own tracking when its `shipment` arrives (rows fill in one by
  one).
- **R-P3.** S11 shows the order as soon as `order` arrives (the line names are
  a lookup that follows); the linked ticket box appears when `ticketsByOrder`
  (and not later) arrives. In the editor, pending hits block only the hits
  area, not the lines; a hit's name shows when `searchProducts` arrives, its
  price and stock when theirs do.
- **R-P4.** Dependent requests start as soon as, and no earlier than, their
  input exists, and never wait for anything else:
  - `orders → shipment`; `customers → tiers, ticketCounts`;
  - `cart → products, prices`; `order → products`; `activity → products`;
  - `searchProducts → prices, stock`; `ticket → agents, customer`;
    `notes → agents`; `notifications → customer` (R-L11);
  - `ticketsByOrder` needs only the order id: it starts with `order`, in
    parallel.
- **R-P5.** A section whose input is not there yet shows no data and no
  loading indicator: loading means a request is in flight for that section.
- **R-P6.** A lookup that comes from another service loads on its own: a cart
  line shows its name while its price is on the way and the other way round;
  a list row shows its name before its badges. Each lookup reaches its view
  as soon as its own service answers, never held back for another one.

## Scenarios

### A. Session

| ID | Scenario | Expected |
| --- | --- | --- |
| A1 | Open the page signed out. | Requests: none. |
| A2 | Sign in; release all. | Requests: `profile` 1, `notifications` 1, `customers` 1, all started before any is released; then `tiers` 1, `ticketCounts` 1 (after `customers`); `customer` 0. |
| A6 | Signed out, advance the clock 2 min. | Requests: none. |
| A7 | Session 1: select a customer, open the Cart tab, release all. Log out, sign in, select the same customer, open the Cart tab. | Requests in session 2: `product` 0, `prices` 0 (public, kept); `cart` 1. |
| A8 | Signed in with a customer, order panel open and the Cart tab active, all released; go to another sample and back, release all; select the same customer. | The customer opens on the Cart tab, and (R-L5) its cart, tier and counter come from cache, not a new request. |

### B. Debounce and paging

| ID | Scenario | Expected |
| --- | --- | --- |
| B4 | Type 5 characters in the search within 300 ms; release all. | `customers` 1; `tiers` ≤ 1, `ticketCounts` ≤ 1. |
| B5 | Go to page 3; change the filter chip. | `customers` 1, with page 1. |
| B10 | In the editor type 5 characters within 300 ms; release all. | `searchProducts` 1; `prices` ≤ 1; `stock` once per hit (one call per sku, none twice). |

### C. Laziness and cache

| ID | Scenario | Expected |
| --- | --- | --- |
| C1 | Sign in, select a customer (visible in the list), release all; stay on the Orders tab. | Requests: `customer` 1, `orderStats` 1, `orders` 1 (shared by S5 and S9), `activity` 1, `shipment` 1 per in-flight order, `product` once per viewed product (none twice). `ticketCounts` 0, `tiers` 0 (the list loaded them); `cart`, `tickets`, `notes`, `order`, `ticketsByOrder`, `ticket`, `agent`, `prices`, `stock`, `searchProducts`: 0. |
| C2 | Open Cart, release; open Tickets, release; open Cart again. | Second Cart visit: no request, no loading state. |
| C3 | Select A, release all; select B, release all; select A again. | Requests for A: none; S4–S10 show A at once. |
| C4 | Page 1 → 2 → 1 with the same query. | Second visit to page 1: no request (`customers`, `tiers`, `ticketCounts` 0). |
| C5 | Open the bell dropdown; close; open. | `notifications`: 0 new. |
| C6 | Open S11 for O1, release; close; open O1 again. | `order` 0, `ticketsByOrder` 0, `product` 0. |
| C7 | Select a customer, open an order, Edit items. | Nothing is requested for the editor until a text is typed (`searchProducts`, `prices`, `stock` 0). Type a text, release: one request each; type another text, then the first again: no request for the first. |
| C8 | Select a customer whose orders are all Delivered. | `shipment`: 0; S9 "Nothing on the way." |
| C9 | Signed in, no customer selected; advance the clock 1 min. | `activity`: 0, `orderStats`: 0; `notifications`: 2. |
| C10 | Sign in, release all; open the bell. | Before opening: `customer` 0. Opening: one `customer` request per distinct customer in the `ticket-reply` notifications (each of those customers once); sentences show the names after release. Close and open again: 0 new. |
| C11 | Sign in; release all (8 rows). | `tiers` 1 and `ticketCounts` 1, each with the 8 ids of the page. |
| C12 | Select the customer with the 24-line cart; release all; open Cart; release all. | `prices` 2 for the cart's skus (⌈24/20⌉), none with more than 20 ids, `errors` 0; `product` once per sku (24 calls, none twice; fewer if some names were cached), `errors` 0. |
| C13 | Select a customer whose cart shares a sku with one of its orders; release all; open Cart, release; open that order, release. | No sku is asked of `product` twice in the whole flow (the viewed products of the activity included). |
| C14 | Open the bell, release; select, from the list, a customer named in a notification. | `customer` 1 for that id in total (the look-up is the header's profile); `ticketCounts` 0 (the S3 row's). |
| C15 | Select customer A, release all; select customer B, release all; advance the clock 1 min. | Every `activity` request is for B (at least one); none for A (R-L8). |
| C16 | As G11 up to Save (add a product); Save, release all; Edit items again and search the same text; release all. | From Save on, `stock` is asked for the added sku, now or when shown again, and only for the skus R-W10 lists for `updateOrder`; the other hits come from cache (R-L7). The hit shows the new stock. |

### D. Progressive loading

| ID | Scenario | Expected |
| --- | --- | --- |
| D1 | Select a customer; release only `activity`. | S10 ready; S4, S5, S9 still loading. |
| D2 | Release only `orders`. | S5 ready; S9 lists in-flight orders, each row's tracking empty; `shipment` requests start only now. |
| D3 | Release the `shipment` of the second in-flight order only. | That row shows tracking; the first row's tracking is still empty. |
| D4 | Open S11 for an order with a linked ticket; hold `order`, release `ticketsByOrder`. | The ticket box shows the ticket while the order still loads; `ticketsByOrder` was requested together with `order`. |
| D5 | Open S11 for an order with a linked ticket; release only `order`. | Lines, total and status shown; line names empty, then shown after `product`; the ticket box empty. |
| D6 | In S11 press Edit items, type a text; hold `searchProducts`. | Qty and remove work at once; the hits area is empty meanwhile. |
| D7 | Release `searchProducts`; release only `prices`. | Hits shown by name; prices shown, stock empty; Add disabled until `stock` arrives. |
| D8 | Select a customer with a viewed product; release only `activity`. | Entries shown; `Placed order …` shown; the text of `Viewed …` empty; `product` requested only now. |
| D9 | Open Cart; release `cart`, then only `prices`. | Lines shown with qty; prices shown, names empty; the cart total shown. Then release `product`: names shown. |
| D10 | Sign in; release only `customers`. | The 8 rows with names; tier and open-tickets badges empty; `tiers` and `ticketCounts` both pending (started together, after `customers`). |
