# Support console: shared views

Every implementation builds the page from these views (docs/contest/spec.md
§2.2, §7). They are the **UI contract**, fixed by UX and product: they take
view models (`view-models.ts`) and emit user intents, and never fetch, cache
or hold data. They never import backend types: producing their view models
from the backend's DTOs is the implementation's job. UI-only state (dropdown
open, edited lines, draft texts, the product search text as typed) lives
inside them. Import from `index.ts`.

## Status is not the views' business

The views take **no status input**. With `null` data they show
nothing, with an empty list their empty text. The page wraps every section
view in a **block** (`src/app/components/content/`), which shows the status:

- `app-spinner-block` `[loading]`: dims the content and draws a spinner;
- `app-stateful-block` `[loading]`, `[error]`, `(retry)`: the same; when <!-- @s2-line -->
  `error` is set it shows an `app-generic-error` with a Retry button **in <!-- @s2-line -->
  place of** the view. <!-- @s2-line -->

Every block carries `data-testid="state-block"`. Give each block
`data-section="<section>"` (the section ids of spec §7): the tests find a
section by it, and read the block's `loading` class and error and the <!-- @s2-line -->
section root's `data-content` (`shown`, `empty`, `none`). <!-- @s2-line -->
<!-- @s1-alt
section by it, and read the block's `loading` class and the section
root's `data-content` (`shown`, `empty`, `none`).
-->

- `Part<T>` (`view-models.ts`), per field: `loading` · `ready` (with value) · <!-- @s2-line -->
  `error`. For fields that come from another service than the rest of their <!-- @s2-line -->
  object, and for boxes and rows that load on their own (the agent, the <!-- @s2-line -->
  customer profile, the bell's list, S9 rows, the linked ticket, the product <!-- @s2-line -->
  hits). Helpers `part.loading()`, `part.ready(v)`, `part.error()`. <!-- @s2-line -->
- `app-part` `[part]`, `[width]`, `[retryable]`, `(retry)`: renders one `Part` <!-- @s2-line -->
  around projected content (small skeleton, content, or on error a dash with <!-- @s2-line -->
  a small Retry ↻, or "… unavailable · Retry" for boxes). Host attribute <!-- @s2-line -->
  `data-part-state`. <!-- @s2-line -->
<!-- @s1-alt
- `Part<T>` (`view-models.ts`), per field: `loading` · `ready` (with value). For fields that come from another service than the rest of their object, and for boxes and rows that load on their own (the agent, the customer profile, the bell's list, S9 rows, the linked ticket, the product hits). Helpers `part.loading()`, `part.ready(v)`.
- `app-part` `[part]`, `[width]`: renders one `Part` around projected content (small skeleton, or the content). Host attribute `data-part-state`.
-->
- `ActionState { pending, error }` for writes (`ACTION_IDLE`). <!-- @s2-line -->
<!-- @s1-alt
- `ActionState { pending }` for writes (`ACTION_IDLE`).
-->

## Page

| Selector | Section | Inputs | Outputs |
| --- | --- | --- | --- |
| `app-console-sign-in` | S0 | `state: ActionState` | `signIn: {email, password}` |
| `app-console-frame` | layout | `customerSelected` | — · slots by attribute: `consoleBell`, `consoleAgent`, `consoleList`, `consoleMain`, `consoleRail`, `consolePanel` (put the section's **block** on the slot attribute) |
| `app-console-agent` | S1 | `agent: Part<AgentVm> \| null` | `logout`, `retryProfile` |
| `app-console-notifications` | S2 | `notifications: Part<NotificationVm[]> \| null` (each text a `Part`), `markRead: ActionState` | `markAllRead`, `retryParts`, `openChange: boolean` (dropdown opened or closed) |
| `app-console-customer-list` | S3 | `page: CustomerPageVm \| null` (rows with `tier`, `openTickets` as `Part`s), `query: CustomerListQuery`, `selectedId` | `queryChange: Partial<CustomerListQuery>` (as typed, not debounced), `select: id`, `retryParts` |
| `app-console-customer-header` | S4 | `customer: Part<CustomerHeaderVm> \| null`, `kpis: KpisVm \| null` (each a `Part`) | `clear`, `retryProfile`, `retryParts` |
| `app-console-customer-tabs` | tab card | `active`, `counters: TabCountersVm` (`Part`s) | `activeChange`, `retryParts` · projects the active tab |
| `app-console-orders-tab` | S5 | `orders: OrderRowVm[] \| null`, `customerId` | `openOrder` |
| `app-console-cart-tab` | S6 | `lines: CartLineVm[] \| null` (name, price as `Part`s; total waits for all prices), `customerId` | `retryParts` |
| `app-console-tickets-tab` | S7 | `tickets: TicketRowVm[] \| null`, `customerId` | `openTicket`, `openOrder` |
| `app-console-notes-tab` | S8 | `notes: NoteVm[] \| null` (author as `Part`), `customerId`, `addState` | `add: text`, `retryParts` |
| `app-console-shipments` | S9 | `rows: ShipmentRow[] \| null` (each row's tracking is a `Part`), `customerId` | `openOrder`, `retryRow: orderId` |
| `app-console-activity` | S10 | `entries: ActivityVm[] \| null` (text as `Part`), `customerId` | `retryParts` |
| `app-console-order-panel` | S11 | `orderId`, `order: OrderVm \| null` (line names as `Part`s), `ticket: Part<LinkedTicketVm \| null> \| null` (null or ready `null` hides the box), `editing`, `hits: Part<ProductHitVm[]> \| null` (price, stock as `Part`s), `saveState`, `resendState` | `close`, `editChange`, `search: text` (as typed), `save: {lines, reply?}`, `resend`, `openTicket`, `retryTicket`, `retryHits`, `retryParts` |
| `app-console-ticket-panel` | S12 | `ticketId`, `ticket: TicketThreadVm \| null` (authors as `Part`s), `replyState` | `reply: {text, status}`, `openOrder`, `close`, `retryParts` |

`retryParts` is emitted when the user clicks the Retry (↻) of a failed <!-- @s2-line -->
`Part` of that view; the page then asks the failed sources again, and only <!-- @s2-line -->
those. <!-- @s2-line -->

The panels are `position: fixed` over the page, so the block around them
does not become their positioning context.

Draft texts and edited lines reset when their data changes (a saved note
appears, the thread grows, the order is reloaded or `editing` flips) and
are kept otherwise.

`app-console-controls` is the shell's request panel (speed, counters, Throw
switches); implementations do not use it.
