# Stage 2: Robust

The console is in production. Incidents show where the baseline is fragile:
a failing API leaves a section loading forever or blank, one failing API blanks too much, Retry reloads everything, the screen
flickers on every reload, abandoned requests keep running, saves refresh
half the page or get lost when the agent clicks away.

Everything of stage 1 still holds.

## Requirements

### Errors

- **R-B2.** **`app-spinner-block` gives way to `app-stateful-block`** around
  every section view (`loading`, `error`, `(retry)`; the error stays above
  the content). A section's failed sources go to `error` as text naming them;
  `(retry)` is the section's Retry. `Part` gains the `error` state
  (`part.error()`), and the rows and boxes that can fail on their own
  (S9 rows, the ticket box, the hits) offer Retry themselves.
- **R-E1.** A failed request shows an error where its data would be: in the
  section (`app-generic-error`, through the block's `error`) or, for a field
  that comes from another service, in that field's `Part` (`error`). No
  section and no `Part` stays loading forever, whichever source failed:
  including `tiers`, `ticketCounts`, `orderStats`, `products`, `prices`,
  `stock`, `agents` and the `customer` look-ups of sentences and authors.
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
  place of the view, and every other section keeps working.
- **R-G2.** The block's error names the failed source (`error` text such as
  "Couldn't load orders.").
- **R-G3.** **Partial sections degrade in place:**
  - S9: a failed `shipment` turns only its row into "Tracking unavailable ·
    Retry"; the other rows stay.
  - S11: a failed `ticketsByOrder` turns only the ticket box into an error;
    the order stays readable and editable.
  - S1: a failed `profile` shows "Profile unavailable · Retry" in the top
    bar (the agent is a `Part`); Log out and the console work.
  - S4: a failed `customer` affects only the profile part of the header
    (a `Part`, "Profile unavailable · Retry"); the KPIs, the tabs, S9 and
    S10 work (they need only the customer id).
  - S2: a failed `notifications` shows an error mark on the bell and, in
    the dropdown, "Notifications unavailable · Retry" (a `Part`).
- **R-G4.** **Polled sources keep their data on failure.** A failed poll of
  `activity` or `notifications` keeps the last list, shown as before, with
  no error and no empty section; the next successful poll replaces it.
- **R-G6.** **A failed enrichment source degrades in place.** A field that
  comes from another service (a `Part`) shows `error` when its service
  failed; **everything else in the section stays shown and working**. The
  failed field shows a dash with a small **Retry** (↻); the view tells the
  page with `retryParts`. The section's block shows no error. Per source:

  | Failed | Parts in `error` | Still shown and working |
  | --- | --- | --- |
  | `tiers` | S3 row tier badges | rows (name, email), open-tickets badges, paging, selection |
  | `ticketCounts` | S3 row open-tickets badges; S4 open-tickets KPI; Tickets badge | rows, tier badges, the other KPIs |
  | `orderStats` | S4 spend, orders, average; Orders badge | the profile, open-tickets KPI, tabs, S9, S10 |
  | `products` | line names (S6, S11); `Viewed …` sentences (S10) | skus, qty, prices, totals, Edit items and Save, the rest of S10 |
  | `prices` | cart prices, line totals, cart total (S6) | names, qty |
  | `prices` or `stock` (hits) | the hits' price or stock | hit names, the order's lines, qty, remove, Save; **Add is disabled** for a hit without both |
  | `agents` | authors of notes (S8) and of agent messages (S12) | texts, dates, customer authors, the reply box |
  | `customer` (look-up) | customer authors (S12); `ticket-reply` sentences (S2) | everything else |

### Recovery

- **R-G5.** Retry (the block's, a row's or box's, or a failed field's)
  refetches **only the failed source(s)** of that section,
  never a healthy one, and **only the failed batch**, not the main source
  (Retry in S6 after a `products` failure: `products` asked again for the
  failed skus; no `cart`, no `prices`; Retry in S3 after `tiers` failed: `tiers`
  asked again for the failed ids; no `customers`, no `ticketCounts`).

### Reloads

- **R-C3.** **Same key, stale kept.** A reload of the same key (Retry, poll,
  refetch after a write, another page of the customer list) keeps the
  current content visible, inside the loading overlay, until the new data
  arrives. (Switching customer still never shows the previous customer:
  R-C2.)
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
  re-requests on show satisfies this as is).

  | Write | Affected keys | Not requested |
  | --- | --- | --- |
  | `updateOrder` | `order(id)`, `orders(customer)`, `orderStats(customer)`, `stock` of the touched skus; with reply also `ticket(id)`, `tickets(customer)`, `ticketsByOrder(order)`, `ticketCounts(customer)` | `customer`, `customers`, `tiers`, `cart`, `notes`, `activity`, `agents`; without reply also `ticketCounts`, `tickets`, `ticketsByOrder`, `ticket` |
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
| A9 | Sign in; fail `profile`. | S1's agent `Part` shows "Profile unavailable · Retry" and Log out works; S2 and S3 work. Retry: `profile` 1, nothing else. |

### B. Reloads and cancellation

| ID | Scenario | Expected |
| --- | --- | --- |
| B1 | Select A, then B; release B's requests, then A's. | A's pending reads counted cancelled. |
| B3 | Select A, release all. Save an order edit in S11 (release `updateOrder`), hold the `orders` refetch. | S5 keeps the old rows inside `.loading` until released; then the new total. |
| B8 | Open order O1, then O2 before O1 is released. | The `order` read of O1 counted cancelled. |

### E. Graceful degradation

| ID | Scenario | Expected |
| --- | --- | --- |
| E1 | Fail `customer`. | S4's profile (`Part`) shows the error with Retry; the KPIs, S5, S9, S10 ready. |
| E2 | Fail `orders`. | S5 and S9 error (`orders`); S4, S10 ready. |
| E3 | Two in-flight orders; fail one `shipment`. | That row "Tracking unavailable · Retry"; the other row shows tracking. |
| E4 | Open Cart; release `cart`, fail `products`. | S6 works; names `error`, prices and totals `ready`; other sections ready. |
| E5 | Open S11 for an order with a linked ticket; release `order`, fail `ticketsByOrder`. | Order shown and editable; only the ticket box shows the error. |
| E6 | In edit mode, type a search; fail `searchProducts`. | The hits area shows the error; qty and remove still work; Save works. |
| E7 | `activity` released once; fail the next poll. | S10 keeps the old entries, with no error; the next successful poll updates it. |
| E8 | Fail `notifications`. | Bell shows an error mark; the dropdown shows error with Retry; the rest works. |
| E9 | Fail `customers`. | S3 error with Retry; a selected customer's sections keep working. |
| E10 | Fail `tiers`. | S3 works; the 8 rows shown, tier badges `error`, open-tickets badges `ready`. |
| E11 | Fail `ticketCounts` (list page). | S3 works; rows shown, open-tickets badges `error`, tier badges `ready`. |
| E12 | Select a customer; fail `orderStats`. | S4 works; the profile (name) shown; spend, orders, average and the Orders badge `error`; open-tickets KPI `ready`; S5, S9, S10 ready. |
| E13 | Open Cart; fail `prices`. | S6 works; prices, line totals and the cart total `error`; names `ready`; qty shown. |
| E14 | Open an order; fail `products`. | S11 works; line names `error`; qty, unit prices, total, address shown; Edit items works. |
| E15 | Open a ticket with an agent reply; fail `agents`. | S12 works; the agent's author `error`; customer authors `ready`; texts shown; the reply box works. |
| E16 | Open Notes of a customer with notes; fail `agents`. | S8 works; authors `error`; texts shown; Add note works. |
| E17 | Edit items, search; fail `prices`. | Hits shown by name; price `error`; stock `ready`; Add disabled on every hit. |
| E18 | Edit items, search; fail `stock`. | Hits shown by name; stock `error`; price `ready`; Add disabled on every hit. |
| E19 | Select a customer; release `activity`, fail `products`. | S10 works; sentences with a product name `error`; the others (`Placed order …`) `ready`. |
| E20 | Open the bell; fail the `customer` look-ups. | Dropdown works; the `ticket-reply` sentences `error`; the list is still shown; the bell still opens and closes. |

### F. Recovery

| ID | Scenario | Expected |
| --- | --- | --- |
| F1 | After E1, Retry in S4. | `customer` 1; nothing else. |
| F2 | After E3, Retry on the failed row. | `shipment` 1 for that order; `orders` 0. |
| F3 | After E4, Retry in S6. | `products` asked again (the failed skus); `prices` 0, `cart` 0. |
| F4 | After E5, Retry in the ticket box. | `ticketsByOrder` 1, `order` 0. |
| F5 | After any failure in S4–S10, select another customer; release all. | All sections show the new customer, no reload of the page. |
| F6 | After E7, wait for the next poll (release it). | S10 updated, no Retry needed. |
| F7 | After E10, Retry in S3. | `tiers` asked again (the failed ids); `customers` 0, `ticketCounts` 0. Badges `ready`. |
| F8 | After E11, Retry in S3. | `ticketCounts` asked again; `customers` 0, `tiers` 0. |
| F9 | After E12, Retry in S4. | `orderStats` 1; `customer` 0, `ticketCounts` 0. KPIs `ready`. |
| F10 | After E15, Retry in S12. | `agents` asked again; `ticket` 0. |
| F11 | After E17, Retry in the hits area. | `prices` asked again; `searchProducts` 0, `stock` 0. Add enabled where stock > 0. |

### G. Writes

| ID | Scenario | Expected |
| --- | --- | --- |
| G1 | As in stage 1 (add a product for ticket T, Save and reply on T; release all). | Requested: `orders`, `orderStats`, `ticketCounts`, `tickets`, `ticketsByOrder` (their sections are shown). Not requested: `customer`, `customers`, `tiers`, `cart`, `notes`, `activity`, `agents`. |
| G2 | Same as G1, fail `updateOrder`. | Error on the Save button; S5, S4 and S12 unchanged; the edited lines are kept in the editor. |
| G4 | Save, then select another customer before `updateOrder` returns; release all. | The write completes (`updateOrder` not cancelled); the new customer's sections never show the change; going back to the first customer shows the saved order. |
| G6 | Reply on ticket T with status Solved; release all. | Requested: `ticketCounts`, `tickets` (shown). Not requested: `orders`, `order`, `orderStats`, `cart`, `notes`. |
| G7 | Reply; fail `replyTicket`. | Error on Send; the thread unchanged; the text stays in the box. |
| G8 | Add a note; release all. | Only `notes` requested (or nothing, if updated from the response). |
| G9 | Mark all notifications read; release all. | Only `notifications` requested (or nothing). |
| G11 | As G1 with the reply text emptied (Save without reply). | Requested: `orders`, `orderStats`. Not requested: `ticketCounts`, `tickets`, `ticketsByOrder`, `ticket`, `customer`. |
