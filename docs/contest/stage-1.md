# Stage 1: Baseline

The first shippable version of the console: every section shows the right
data, **correctly joined from the services that own it**, nothing of another
session or customer is ever visible, the latest input always wins, writes
work and their results show.

**Failures are out of scope.** The baseline has no error handling: what
the page does when a request fails (an endless skeleton, a blank section) is
not specified and not tested. In a real application a failure is reported
by application-wide error tracking (an HTTP interceptor); the fake API
makes that out of scope here. Error display, isolation and recovery are
stage 2.

Section ids (S0–S12), inputs, the backend services and the view contract are
in `spec.md`. Scenario notation: `spec.md` §6.

## Requirements

### Session

- **R-S1.** Signed out, the page shows only the sign-in screen (S0).
- **R-S2.** After sign-in, S1 shows the agent, S2 the notifications (badge
  and list), S3 the customer list. S4–S10 appear once a customer is
  selected, S11 / S12 when their panel is opened.
- **R-S3.** On logout every user-scope view disappears at once. A response
  that arrives after logout changes nothing on screen.
- **R-S4.** **No data of a previous session is ever visible**, at any moment
  of a new session, not even dimmed while the new data loads.
- **R-S5.** Navigating to another sample and back keeps the session and the
  tab preference (the next customer selected opens on the tab last active, not
  back to Orders). The selected customer and the open panel are page state,
  not required to survive: keeping them would mean holding the whole page
  (which record is open) somewhere that outlives the page component, which is
  the global-state shape this contract otherwise avoids. A tab is a display
  preference, not a record, so remembering it is a small exception.

### Data

- **R-D1.** Every section shows the backend's data for its key, as described
  in `spec.md` §3: search, filter, sort and paging of S3; the header and its
  KPIs; each tab; the shipments of in-flight orders; activity; both panels;
  the order editor with the product search.
- **R-D2.** Polls: S2's notifications refresh every 30 s while signed in;
  S10's activity every 20 s while a customer is selected. New data appears
  without user action.

### Status

- **R-B1.** **Every section view is wrapped in `app-spinner-block`** (spec
  §2.2, §7) with `data-section="<section>"`, whose `loading` is true while
  a request for that section is on its way. Views take `null` data until there is some. No other status
  vocabulary exists at this stage.

### Joined data

The backend returns ids; the page shows names, prices and sentences. Each
service owns one piece, and the page hands each piece to the view as its own
input (a lookup by id, or a counter), so nothing is joined into the rows.

- **R-J1.** **Nothing is shown unresolved.** Where the UX shows a name, the
  name is shown, never an id: product names (cart lines, order lines,
  activity, editor hits), authors (thread messages, notes), notification
  and activity sentences, the tier badge, the KPIs and tab badges. A piece
  still on its way is left out (its field component shows nothing, or its
  price, line total or stock field shows nothing: an empty space), never shown
  as a raw id or a zero.
- **R-J2.** **The right piece for the right thing.** A name, price, stock,
  tier, count or author is the one of *its* sku, customer or agent: batch
  answers (`prices`, `tiers`, `ticketCounts`) are matched by id (a batch answer
  may come back in another order or with fewer items than asked), and nothing of another entity leaks in.
- **R-J3.** **Batch calls respect the limit.** The three batch endpoints,
  `prices`, `tiers` and `ticketCounts`, take at most 20 ids; a list that is
  longer is split (a cart of 24 lines shows all 24 prices). `product`, `stock`
  and `agent` take one id per call (a cart of 24 lines asks 24 names).
  A stage-1 page may use one call per id, or any split, as long as no call is
  refused.
- **R-J4.** **Which price.** Cart lines and editor hits show the **current**
  price (the price field, from `prices`); order lines show the price the line was **sold at**
  (`order.lines[].unitPrice`). A line added in the editor is shown at the
  current price; after Save the order shows what the server stored.
- **R-J5.** **The linked ticket of an order** is found through
  `ticketsByOrder`: the order's open ticket (status not Solved), else the
  most recently updated one; none: no ticket box.
- **R-J6.** **Sentences.** Written by the shared views from a kind, the
  references and the one name they need (the customer name field for a reply, the
  product name field for a viewed product); your part is to supply that name by
  the right id. Exact wording (tests read
  it):

  | Source | Sentence |
  | --- | --- |
  | notification `ticket-reply` | `<ticketId>: new message from <customer name>` |
  | notification `ticket-escalated` | `<ticketId> escalated to you` |
  | notification `order-delivered` | `<orderId> delivered` |
  | activity `order-placed` | `Placed order <orderId>` |
  | activity `order-changed` | `Changed order <orderId>` |
  | activity `order-delivered` | `Order <orderId> delivered` |
  | activity `ticket-opened` | `Opened ticket <ticketId>` |
  | activity `product-viewed` | `Viewed <product name>` |

- **R-J7.** **Counters have one owner each.** KPIs lifetime spend, orders and
  average order, and the Orders tab badge, come from `orderStats`; the
  open-tickets KPI, the Tickets tab badge and the open-tickets badge of a
  list row come from `ticketCounts`; the tier badge of a row from `tiers`
  and the header's tier from `customer`. They are never derived from another
  list (not from `orders`, `tickets`, or the visible rows).

### Change awareness

- **R-C1.** The view always ends on the latest input. An older response
  never replaces a newer one, for every keyed source: `customers`,
  `customer`, `orders`, `orderStats`, `cart`, `tickets`, `notes`,
  `activity`, `order`, `ticketsByOrder`, `ticket`, `shipment`,
  `searchProducts`.
- **R-C2.** **Switching customer never leaves the previous customer's data
  as current.** Once a section's block has stopped loading, it shows only data
  of the current customer (KPIs, badges and names included). While the block
  loads, the previous customer's data may stay visible under the spinner: the
  spinner says it is not current. Reason: the agent acts on what is shown; an
  action on the wrong customer is an incident.

### Writes

- **R-W1.** Each write (`updateOrder`, `replyTicket`, `addNote`,
  `markNotificationsRead`, `resendConfirmation`) shows its pending state on
  the control that started it.
- **R-W2.** No double submission: the control is disabled while its write is
  pending.
- **R-W3.** After a successful write, its result is visible everywhere the
  changed data appears, **including the counters other services keep**:
  - `updateOrder`: S11 (lines, total, the new line's name), the S5 row
    (items, total), S4 KPIs (`orderStats`: spend, orders, average) and the
    Orders badge; with a reply, also the S12 thread, the S7 row, S4's
    open-tickets KPI, the Tickets badge and the S3 row's open-tickets badge
    (`ticketCounts`);
  - `replyTicket`: the S12 thread and status, the S7 row, S4's open-tickets
    KPI, the Tickets badge and the S3 row's badge;
  - `addNote`: S8 (the author shown by name);
  - `markNotificationsRead`: S2's badge and list.
- **R-W5.** The result of a write never appears in a later session.
- **R-W6.** Shipped orders cannot be edited: S11 offers **Create return**
  instead of **Edit items**.
- **R-W7.** Optimistic display is optional. If used, it rolls back on failure
  and is replaced by the server data on success.

## Scenarios

### A. Session

| ID | Scenario | Expected |
| --- | --- | --- |
| A1 | Open the page signed out. | S0 only. |
| A2 | Sign in; release all. | S1 shows the agent, S2 the badge, S3 page 1. S4–S10 absent; the main column says "Select a customer". |
| A3 | Select a customer, open an order, release all; Log out. | S0 at once. No element with that customer's `data-customer-id` or `data-order-id`, or the agent's `data-user-id`, remains. |
| A4 | Select a customer; hold `orders`; Log out; release `orders`. | The page stays S0. |
| A5 | Session 1: select customer X, release all, Log out. Session 2: sign in as another agent; hold everything. | Until released, no element shows X or agent 1. |
| A8 | Signed in with a customer, order panel open and the Cart tab active; go to another sample and back, release all; select a customer. | Still signed in; the selected customer opens on the Cart tab, not Orders (the customer and the panel from before are page state, not asserted either way). |

### H. Joined data

All values are compared with what the backend holds (`window.__api.truth`),
after "release all".

| ID | Scenario | Expected |
| --- | --- | --- |
| H1 | Sign in; release all. | Every S3 row (8): name and email as searched; tier badge from `tiers` (the tier name); open-tickets badge from `ticketCounts` (the count, `0` for none). Every badge shows text. |
| H2 | Select a customer; release all. | S4: name, tier, city from `customer`; KPIs spend, orders, average from `orderStats`; open tickets from `ticketCounts`; the Orders and Tickets badges show the same numbers. |
| H3 | Open Cart. | Each line: product name from `product`, **current** price from `prices`, line total = qty × price; cart total = their sum. |
| H4 | Open an order with several lines. | Each line shows its product name, qty, and the unit price **stored in the order**. |
| H5 | Open a ticket that has agent replies. | Each message shows its author's name: the customer's from the CRM, an agent's from the agent directory. |
| H6 | Open Notes of a customer with notes. | Each note shows its author agent's name. |
| H7 | Select a customer. | S10: each sentence as in R-J6; a viewed product shows its name (`Viewed <name>`). |
| H8 | Open the bell. | Each sentence as in R-J6; a `ticket-reply` names the customer of its `customerId`. |
| H9 | Edit items; type a product name in the search. | Up to 10 hits, each with its name, current price and stock (`out of stock` for 0); Add is disabled for 0 stock. |
| H10 | Open an order that has a ticket. | The ticket box shows the open ticket of that order (R-J5): id, subject, status. An order without tickets shows no box. |
| H11 | Select customer A, open Cart; select customer B (same tab); release all. | A block that is not loading leaves no name, price or counter of A; lines and names of B only. (While a block loads, A may stay under the spinner.) |
| H12 | Select the customer with the 24-line cart; open Cart. | All 24 lines show name and price; no request failed (`errors` 0 on `product`, `prices`). |

### B. Change awareness

| ID | Scenario | Expected |
| --- | --- | --- |
| B1 | Select A, then B; release B's requests, then A's. | S4–S10 show B. A's responses never appear. |
| B2 | Select A, release all; select B, hold. | In the main column and the rail, no element with A's `data-customer-id` outside a block that is loading. |
| B4 | Type 5 characters in the search quickly; release all. | S3 shows the results for the whole text, page 1. |
| B5 | Go to page 3; change the filter chip; release all. | S3 shows page 1 of the new filter. |
| B6 | Change the sort while a `customers` request is held; release the new one, then the old one. | S3 shows the new order; the old response never appears. |
| B7 | Open order O1, then (before release) order O2 from the list; release O2, then O1. | S11 shows O2. |
| B9 | Select A, then B; release B's `orderStats` and `ticketCounts`, then A's. | The KPIs and badges show B's numbers. |

### P. Polls

| ID | Scenario | Expected |
| --- | --- | --- |
| P1 | Signed in; advance the clock 30 s; release. | `notifications` requested again; S2 shows the new list. |
| P2 | A customer selected; advance the clock 20 s; release. | `activity` requested again; S10 shows the new entry on top, with its sentence resolved. |

### G. Writes

| ID | Scenario | Expected |
| --- | --- | --- |
| G1 | Ticket T asks to add a product to order O (Processing). Open T in S12, follow the link to S11, Edit items, search and add the product, **Save and reply on T**; release all. | Save shows pending, then S11 shows the saved order with the new line's **name**. The S5 row total, S4 lifetime spend and orders (`orderStats`), S4 open-tickets KPI (`ticketCounts`), the S3 row's badge, the S12 thread and the S7 row show the change. |
| G3 | Double-click Save. | `updateOrder` 1. |
| G5 | Open an order that has shipped. | No Edit items; Create return shown. |
| G6 | Reply on ticket T with status Solved; release all. | Thread shows the reply with the agent's name; S7 row Solved; the open-tickets KPI, the Tickets badge and the S3 row's badge show the new count; the reply box is gone. |
| G8 | Add a note; release all. | The note is on top of S8, with the agent's name. |
| G9 | Mark all notifications read; release all. | The badge disappears. |
| G10 | Save an order edit; Log out before it returns; sign in again; release all. | The result never appears in the new session. |
