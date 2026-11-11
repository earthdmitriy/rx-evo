# Skeleton view components

Presentational components of the contest kit whose **template is finished and
whose data is a TODO** (docs/contest/adr.md, ADR-2). The kit fixes what the user
sees (markup, `data-testid`s, the loading wrapper); you decide how the data
arrives.

## Use

1. Copy the component (one `.ts` file, the template is inline) into your stage folder (`make-base`
   does it for you in a stage-1 base) and fix the import path of the block.
2. Replace the props marked `TODO` with whatever fits your approach and change
   the template's bindings to match. Signals (`name()`), observables with the
   `async` pipe, getters, a resource: any of them. Nothing is imposed.
3. Provide the component under its token in your page component:
   `providers: [{ provide: PRODUCT_NAME_FIELD, useValue: ProductNameComponent }]`
   (`PRODUCT_NAME_FIELD` is exported by `shared`).

## Keep

- The selector and the inputs the views set (see the table below).
- The `data-testid`s: `state-block` (comes with `app-spinner-block`) and the one
  of the template (`product-name`, `field-tier`, `field-open-tickets`,
  `field-kpi`, `field-agent-name`, `field-customer-name`,
  `field-shipment-tracking`). The tests read them.
- The `field-block` class on the block: the global stylesheet keeps the block's
  `<div>` inline inside a line or a sentence, so no copy needs a style of its
  own.
- The prefix is shown only together with the value: nothing is rendered while
  the name has not arrived.

## Components

| Component | Token | Inputs | TODO props |
| --- | --- | --- | --- |
| `product-name` | `PRODUCT_NAME_FIELD` | `sku`, `prefix` | `name`, `loading` |
| `customer-tier` | `CUSTOMER_TIER_FIELD` | `customerId` | `tier`, `loading` |
| `open-tickets` | `OPEN_TICKETS_FIELD` | `customerId`, `variant` (`row`/`kpi`/`badge`) | `value`, `loading` |
| `kpi` | `KPI_FIELD` | `customerId`, `kind` (`lifetimeSpend`/`orders`/`avgOrder`/`orderCount`) | `value`, `loading` |
| `agent-name` | `AGENT_NAME_FIELD` | `agentId` | `name`, `loading` |
| `customer-name` | `CUSTOMER_NAME_FIELD` | `customerId`, `prefix` | `name`, `loading` |
| `shipment-tracking` | `SHIPMENT_TRACKING_FIELD` | `orderId` | `tracking`, `loading` |
| `product-price` | `PRODUCT_PRICE_FIELD` | `sku` | `price`, `loading` |
| `line-total` | `LINE_TOTAL_FIELD` | `sku`, `qty` | `total`, `loading` |
| `cart-total` | `CART_TOTAL_FIELD` | `lines` (`CartLineRef[]`) | `total`, `loading` |
| `product-stock` | `PRODUCT_STOCK_FIELD` | `sku` | `stock`, `loading` |
| `hit-add` | `HIT_ADD_FIELD` | `sku`, `onAdd` (callback `(e: { sku, unitPrice }) => void`) | `price`, `stock`, `loading` (+ the enabling rule) |

`hit-add` is an action field: the button is enabled only when the price and the
stock are known and the stock is above 0, and a click calls `onAdd` with the
sku and the current price. It is a callback input because `ngComponentOutlet`
binds inputs only.

## Structure

This folder is a flat catalog, and so is the stub that `make-base` hands out.
That is not a prescription: an implementation may nest its components as it
likes (a component next to its parent, shared ones at the lowest common
ancestor, as the test oracle and the sample do). The kit only needs the selector,
the inputs and the test ids.
