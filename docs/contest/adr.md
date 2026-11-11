# Contest kit: architecture decision records

Decisions about the shared views of the contest kit. Every record has four
parts: **context**, **problem statement**, **considered options** and
**solution**. Both records are one lesson: a shape fixed for the tests also
steers every implementation, so a shape may fix what the user sees and must
not fix how data arrives.

## ADR-1: Shape of data, loading and error state in the UI

**Context.** The shared views were designed by the agent that built the kit.
Fields that come from another service were typed `Part<T>`
(`loading | ready | error`), with `app-part`, `data-part-state`, a per-field
Retry and `retryParts`. It looked convenient for the tests. The problems below
were found in review, not by the tests.

**Problem statement.** The `Part<T>` shape caused:
1. **Steering towards loading and error handling.** Stage 1 implementers saw
   `error` states, `retry` outputs and a "stateful" block type before they were
   asked for any of it. Stage markers strip text, not shape.
2. **Mappers to adjust the data layer to `Part<T>`.** Every approach (the
   library, resources, stores) had to write wrappers, bridges and mappers whose
   only purpose was to produce a status per field.
3. **Wiping behaviour forced as the correct one.** A field turned to "loading"
   whenever a request was on its way, even with valid data on screen. The
   library keeps `pending$` and `value$` apart on purpose, to avoid exactly
   that.

Side effect: some view models had `Part<>` fields, which made the status
impossible to ignore. An implementation could not leave loading or error out
even where the stage did not ask for it.

**Considered options.**
1. Keep `Part<T>` and let each data layer map into it.
2. Keep status in the model, but never reset a field that already has a value.
3. View models carry data only. Loading and error are separate inputs of
   separate components.

**Solution.** Option 3. A view model holds data only. A field that has not
arrived is `undefined`; `null` is real data. State is shown by a set of
components, each with its own individual inputs for **loading** and for
**error** (and an output for retry): a spinner block in stage 1, a stateful
block from stage 2, wrapped around a section by the page. The views know
nothing about either. Later-stage inputs are stripped from the stage-1 base
by the stage markers and checked by `validate-base`.

## ADR-2: Other-service values and lookups in the view models

**Context.** The same agent-designed shapes carried values of other services
(tier, KPIs, product name, author, tracking) as fields of rows, lines and
messages, and later as lookup arrays and records that the page had to provide
(`tiers`, `names`, `prices`, `authors`).

**Problem statement.** Both forms force the implementer to do the lookups: to
join rows with the streams of other services, or to assemble a record from
per-key streams (`combineStatefulObservables`, a batch call, a helper such as
`lookupOf`), and to decide what a row shows before a value arrives. The
approaches are then compared on how well they fit that join, not on how they
solve the problem.

The first pilot of the replacement (an abstract class plus a shared template,
`ProductNameField`) repeated the mistake in a smaller form: it forced signals
(`name()`), had no `data-testid`s and no reference to async data, so a field
had no loading state.

**Considered options.**
1. Keep joined fields in the models.
2. Lookup record inputs, `Readonly<Record<string, V>>` per source.
3. A `Subscribable` accessor per key.
4. A pipe in the shared template (`id | productName | async`).
5. Render slots: a `TemplateRef` with the key as context.
6. Presentational components with templates but without the view model or the
   data stream, left as TODO for the agent.

**Solution (draft).** Option 6, as a **skeleton folder**
(`contesters/skeleton`): presentational view components with a finished
template and hardcoded props marked TODO. The templates carry the
`data-testid`s and the loading wrapper; during implementation the TODO props
are replaced with a signal, an observable with the `async` pipe, or whatever
fits. The views render the component through a token (`PRODUCT_NAME_FIELD`)
that only fixes the inputs they set; nothing is imposed on the data side.
`make-base` copies the skeleton into the stage folder. The pilot was
`ProductName`; the fields converted with it are `CustomerTier`, `OpenTickets`,
`Kpi`, `AgentName`, `CustomerName` and `ShipmentTracking` (tokens in
`shared/fields.ts`, inputs and visible text in the spec).

Prices, stock and the values computed from them are settled the same way: the
price, the line total and the cart total, a hit's stock and its Add button are
display and action field components (`PRODUCT_PRICE_FIELD`,
`LINE_TOTAL_FIELD`, `CART_TOTAL_FIELD`, `PRODUCT_STOCK_FIELD`,
`HIT_ADD_FIELD`). The business rules stay (a total is `qty × current price`
and waits for every price, Add needs price and stock above 0), but they run in
the component the implementation supplies, which hands the view only what it
needs: the Add component calls `onAdd({ sku, unitPrice })` and the view puts
the line into the draft with that price. No view takes a lookup input.
