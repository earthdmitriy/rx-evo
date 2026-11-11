# Stage 2: Robust

The console is in production. Incidents show where the baseline is fragile:
a failing API leaves a section loading forever or blank, one failing API blanks too much, Retry reloads everything, the screen
flickers on every reload, abandoned requests keep running, saves refresh
half the page or get lost when the agent clicks away.

Everything of stage 1 still holds.

## Requirements

### Errors

- **R-B2.** **`app-spinner-block` gives way to `app-view-block`** around
  every section view (`loading`, `error`, `(retry)`; the error is shown in
  place of the view). A section's failed sources go to `error` as text naming
  them; `(retry)` is the section's Retry. Nothing below a section has a state
  or a Retry of its own: a lookup (or counter) of the view that fails stays
  without its entry, an empty space (R-G6).
- **R-E1.** A failed request shows an error where its data would be: in the
  section (`app-generic-error`, through the block's `error`) or, for a
  lookup that comes from another service, as an empty space in its place
  (R-G6). No
  section is stuck loading and no page part is lost, whichever source failed:
  including `tiers`, `ticketCounts`, `orderStats`, `product`, `prices`,
  `stock`, `agent` and the `customer` look-ups of sentences and authors.
- **R-E2.** A new input recovers without reloading the page: selecting
  another customer, tab, order, ticket or query loads it afresh.
- **R-E3.** Each write (`updateOrder`, `replyTicket`, `addNote`,
  `markNotificationsRead`, `resendConfirmation`) shows its error on the
  control that started it, and a failed write changes nothing on the page
  except that error.

### Graceful degradation

- **R-G1.** A failed **main source** of a section (`customers`, `orders`,
  `cart`, `tickets`, `notes`, `activity`, `order`, `ticket`) affects only
  the sections that need it: the block shows the error with **Retry** in
  place of the view, and every other section keeps working. The same holds
  for the sources of S1, S2 and S4's profile (`profile`, `notifications`,
  `customer`): their blocks show the error in place of their view.
- **R-G2.** The block's error names the failed source (`error` text such as
  "Couldn't load orders.").
- **R-G3.** **A failure stays where it happens:**
  - S9: a failed `shipment` leaves only that row's tracking empty; the other
    rows stay.
  - S11: a failed `ticketsByOrder` leaves only the ticket box empty; the
    order stays readable and editable.
  - S1: a failed `profile` makes the agent block show its error with
    **Retry** in the top bar; Log out (the frame's button) and the console
    work.
  - S4: a failed `customer` makes the header block show its error with
    **Retry** in place of the header (profile and KPIs); the tabs, S9 and S10
    work (they need only the customer id).
  - S2: a failed `notifications` makes the bell's block show its error with
    **Retry**; the rest works.
- **R-G4.** **Polled sources keep their data on failure.** A failed poll of
  `activity` or `notifications` keeps the last list, shown as before, with
  no error and no empty section; the next successful poll replaces it.
- **R-G6.** **A failed enrichment source degrades in place.** A lookup that
  comes from another service stays empty (or a counter input `null`) when
  its service failed, so the view shows an empty space in its place; **everything else in the
  section stays shown and working**. The section's block shows no error, and
  there is no per-field Retry (the field recovers when the section loads
  afresh, e.g. another customer, F5). Per source:

  | Failed | Fields left empty | Still shown and working |
  | --- | --- | --- |
  | `tiers` | S3 row tier badges | rows (name, email), open-tickets badges, paging, selection |
  | `ticketCounts` | S3 row open-tickets badges; S4 open-tickets KPI; Tickets badge | rows, tier badges, the other KPIs |
  | `orderStats` | S4 spend, orders, average; Orders badge | the profile, open-tickets KPI, tabs, S9, S10 |
  | `product` | line names (S6, S11); `Viewed …` sentences (S10) | skus, qty, prices, totals, Edit items and Save, the rest of S10 |
  | `prices` | cart prices, line totals, cart total (S6) | names, qty |
  | `prices` or `stock` (hits) | the hits' price or stock | hit names, the order's lines, qty, remove, Save; **Add is disabled** for a hit without both |
  | `agent` | authors of notes (S8) and of agent messages (S12) | texts, dates, customer authors, the reply box |
  | `customer` (look-up) | customer authors (S12); `ticket-reply` sentences (S2) | everything else |

### Recovery

- **R-G5.** Retry (the block's) refetches **only the failed source(s)** of
  that section, never a healthy one (Retry in S4 after `customer` failed:
  `customer` asked again; no `orders`, no `orderStats`, no `ticketCounts`;
  Retry on the agent after `profile` failed: `profile` only).

### Reloads

- **R-C3.** **Same key, stale kept.** A reload of the same key (Retry, poll,
  refetch after a write, another page of the customer list) keeps the
  current content visible, inside the loading overlay, until the new data
  arrives. (Switching customer: the previous customer's data may stay under
  the spinner while the block loads, never after it stopped: R-C2.)
- **R-C4.** A superseded read is **cancelled**, not only ignored: a new key
  for the same section, a closed panel, a logout. The request is counted as
  cancelled.

### Writes

- **R-W8.** A write is never cancelled by navigation inside the page:
  switching customer, closing the panel or the tab lets it finish. Its
  result updates only the data of the key it was made for.
- **R-W9.** On failure, the user's input is kept: edited lines, reply text,
  note text.
- **R-W10.** On success, exactly the affected keys refresh (or are updated
  from the response), and nothing else is requested. A refresh is requested
  now if its section is shown; otherwise the key is only marked outdated and
  asked for when it is next shown (stage 3 caches; a stage-2 page that
  re-requests on show satisfies this as is). Refreshing such a key now
  instead is also allowed: it is one of the affected keys, only early.

  | Write | Affected keys | Not requested |
  | --- | --- | --- |
  | `updateOrder` | `order(id)`, `orders(customer)`, `orderStats(customer)`, `stock` of the order's skus before and after the change (a dropped line frees its stock); with reply also `ticket(id)`, `tickets(customer)`, `ticketsByOrder(order)`, `ticketCounts(customer)` | `customer`, `customers`, `tiers`, `cart`, `notes`, `activity`, `agent`; without reply also `ticketCounts`, `tickets`, `ticketsByOrder`, `ticket` |
  | `replyTicket` | `ticket(id)`, `tickets(customer)`, `ticketCounts(customer)`, `ticketsByOrder(order)` | `orders`, `order`, `orderStats`, `cart`, `notes` |
  | `addNote` | `notes(customer)` | everything else |
  | `markNotificationsRead` | `notifications` | everything else |
  | `resendConfirmation` | nothing | everything |

  (A key that two sections show, e.g. `ticketCounts(c)` in the S3 row and in
  S4, may be asked by each of them; sharing it is stage 3.)

## Scenarios

### A. Session

| ID | Scenario | Expected |
| --- | --- | --- |
| A4 | Select a customer; hold `orders`; Log out; release `orders`. | `orders` counted cancelled. |
| A9 | Sign in; fail `profile`. | S1's block shows the error and Log out works; S2 and S3 work. Retry: `profile` 1, nothing else. |

### B. Reloads and cancellation

| ID | Scenario | Expected |
| --- | --- | --- |
| B1 | Select A, then B; release B's requests, then A's. | A's pending reads counted cancelled. |
| B3 | Select A, release all. Save an order edit in S11 (release `updateOrder`), hold the `orders` refetch. | S5 keeps the old rows inside `.loading` until released; then the new total. |
| B8 | Open order O1, then O2 before O1 is released. | The `order` read of O1 counted cancelled. |

### E. Graceful degradation

| ID | Scenario | Expected |
| --- | --- | --- |
| E1 | Fail `customer`. | S4's block shows the error with Retry in place of the header; S5, S9, S10 ready. |
| E2 | Fail `orders`. | S5 and S9 error (`orders`); S4, S10 ready. |
| E3 | Two in-flight orders; fail one `shipment`. | S9 stays ready; that row's tracking is empty; the other row shows tracking. |
| E4 | Open Cart; release `cart`, fail `product`. | S6 stays ready; names empty, prices and the cart total shown; other sections ready. |
| E5 | Open S11 for an order with a linked ticket; release `order`, fail `ticketsByOrder`. | S11 stays ready, order shown and editable; only the ticket box is empty. |
| E6 | In edit mode, type a search; fail `searchProducts`. | S11 stays ready; no hits; qty and remove still work; Save works. |
| E7 | `activity` released once; fail the next poll. | S10 keeps the old entries, with no error; the next successful poll updates it. |
| E8 | Fail `notifications`. | The bell's block shows the error with Retry; the rest works (Log out too). |
| E9 | Fail `customers`. | S3 error with Retry; a selected customer's sections keep working. |
| E10 | Fail `tiers`. | S3 stays ready; the 8 rows shown, tier badges empty, open-tickets badges shown. |
| E11 | Fail `ticketCounts` (list page). | S3 stays ready; rows shown, open-tickets badges empty, tier badges shown. |
| E12 | Select a customer; fail `orderStats`. | S4 stays ready; the profile (name) shown; spend, orders, average and the Orders badge empty; open-tickets KPI shown; S5, S9, S10 ready. |
| E13 | Open Cart; fail `prices`. | S6 stays ready; prices and the cart total empty; names shown. |
| E14 | Open an order; fail `product`. | S11 stays ready; line names empty; qty, unit prices, total, address shown; Edit items works. |
| E15 | Open a ticket with an agent reply; fail `agent`. | S12 stays ready; the agent's author empty; customer authors shown; texts shown; the reply box works. |
| E16 | Open Notes of a customer with notes; fail `agent`. | S8 stays ready; authors empty; texts shown; Add note works. |
| E17 | Edit items, search; fail `prices`. | Hits shown by name; price empty; stock shown; Add disabled on every hit. |
| E18 | Edit items, search; fail `stock`. | Hits shown by name; stock empty; price shown; Add disabled on every hit. |
| E19 | Select a customer; release `activity`, fail `product`. | S10 stays ready; sentences with a product name empty; the others (`Placed order …`) shown. |
| E20 | Open the bell; fail the `customer` look-ups. | The list is still shown; the `ticket-reply` sentences empty; the bell still opens and closes. |

### F. Recovery

| ID | Scenario | Expected |
| --- | --- | --- |
| F1 | After E1, Retry in S4. | `customer` 1; nothing else. |
| F5 | After any failure in S4–S10, select another customer; release all. | All sections show the new customer, no reload of the page. |
| F6 | After E7, wait for the next poll (release it). | S10 updated, no Retry needed. |

### G. Writes

| ID | Scenario | Expected |
| --- | --- | --- |
| G1 | As in stage 1 (add a product for ticket T, Save and reply on T; release all). | Requested: `orders`, `orderStats`, `ticketCounts`, `tickets`, `ticketsByOrder` (their sections are shown). Not requested: `customer`, `customers`, `tiers`, `cart`, `notes`, `activity`, `agent`. |
| G2 | Same as G1, fail `updateOrder`. | Error on the Save button; S5, S4 and S12 unchanged; the edited lines are kept in the editor. |
| G4 | Save, then select another customer before `updateOrder` returns; release all. | The write completes (`updateOrder` not cancelled); the new customer's sections never show the change; going back to the first customer shows the saved order. |
| G6 | Reply on ticket T with status Solved; release all. | Requested: `ticketCounts`, `tickets` (shown). Not requested: `orders`, `order`, `orderStats`, `cart`, `notes`. |
| G7 | Reply; fail `replyTicket`. | Error on Send; the thread unchanged; the text stays in the box. |
| G8 | Add a note; release all. | Only `notes` requested (or nothing, if updated from the response). |
| G9 | Mark all notifications read; release all. | Only `notifications` requested (or nothing). |
| G11 | As G1 with the reply text emptied (Save without reply). | Requested: `orders`, `orderStats`. Not requested: `ticketCounts`, `tickets`, `ticketsByOrder`, `ticket`, `customer`. |
