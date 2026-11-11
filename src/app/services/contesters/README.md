# Support console: fake backend

The servers the contesters talk to (`docs/contest/spec.md`
§2.1, §4). Import from `index.ts` only.

```
index.ts                  public surface: types + one client per service
console.types.ts          data types (ids for other services' entities, no joined shapes)
api/                      client-side endpoints, one per backend service
  session-api            login · logout · profile
  agents-api             agent(id)                         agent directory (one per call)
  notifications-api      notifications · markNotificationsRead · push$ (hot)
  customers-api          searchCustomers · customer · tiers(ids)   search + CRM
  orders-api             orders · orderStats · order · updateOrder · resendConfirmation
  shipments-api          shipment(orderId)
  cart-api               cart(customerId)
  products-api           ProductsApi: product(sku) · searchProducts(text)
                         PricingApi: prices(skus) (batch) · InventoryApi: stock(sku)
  tickets-api            tickets · ticketsByOrder · ticketCounts(ids) · ticket · replyTicket
  notes-api              notes · addNote
  activity-api           activity(customerId)
backend/                  the server side, not for data layers
  seed.ts                tables generated from a seed
  fake-backend.service   tables, session, every service's queries and writes, push timer
  fake-transport.service latency, faults, 401 check, counters, manual release
  http-error.ts          HttpErrorResponse factory, JSON copy
  api-keys.ts            one key per call
harness/test-hook.ts      window.__api for the e2e suite
```

## Shape of the data

A set of services, no backend-for-frontend: responses carry ids of other
services' entities, nothing is joined on the server. Only three calls are batch
endpoints (`tiers`, `ticketCounts`, `prices`: the entities asked for most
often); they take at most `MAX_BATCH` (20) ids. `agent`, `product` and `stock`
take one id per call. There is no whole-catalog call. Order lines carry a sku
and the price they were sold at; ticket messages and notes carry author ids;
activity entries and notifications carry a kind and references, no text;
customer search hits carry id, name and email only; `customer(id)` has no
counters (`orderStats`, `ticketCounts`); orders do not know their ticket
(`ticketsByOrder`).

## Behaviour

- **Seeded:** `?seed=<n>` (default 1) gives the same customers, orders,
  tickets… on every run. 120 customers, 60 products, 5 agents.
- **Latency:** `?latency=slow|fast|manual` (default slow, up to 5 s; fast up
  to 0.3 s). `manual` keeps each request pending until
  `FakeTransport.pendingCalls()[i].release()` or `.fail()`.
- **Session:** any non-empty email and password sign in; the email picks one
  of the agents. User-scope calls fail with 401 while signed out. Products,
  prices and stock are public.
- **Reads vs writes:** unsubscribing cancels a read before it reaches the
  server; a write always reaches it (only the answer is dropped).
- **Errors** are `HttpErrorResponse`: 400 bad input or a batch over 20 ids,
  401 signed out, 404 unknown id, 409 order already shipped or out of stock,
  500 fault switch.
- **Live changes:** `activity` adds an entry on every call after the first;
  `push$` emits every 25 s while signed in (stored notification, and a
  ticket reply or a delivered order applied on the server); `?push=off`
  stops the timer.
- **Counters** per key: `FakeTransport.stats()` (`total`, `ok`, `errors`,
  `cancelled`, `inFlight`), `resetStats()`, fault switches `setFault(key, on)`.

The test harness (`window.__api`, not built yet) and the Requests panel go
on top of `FakeTransport`; data layers never use it.
