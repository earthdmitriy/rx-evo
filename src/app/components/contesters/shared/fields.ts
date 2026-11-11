import { Component, InjectionToken, input, Type } from '@angular/core';

/** What the Add action of a search hit hands to the view: the sku and the current price to put on the new line. */
export type HitAdded = { sku: string; unitPrice: number };
/** The line of a cart the total is made of. */
export type CartLineRef = { sku: string; qty: number };

/**
 * Field components: values the views show by an id and that come from another
 * service than the rest of the view (docs/contest/spec.md §2.2). The kit ships a
 * finished template with a TODO data part (`contesters/skeleton`); the
 * IMPLEMENTATION supplies the component and decides how the value is fetched
 * (a cached lookup, an independent stream per id, a pipe, a resource ...). The
 * views only render it, with `ngComponentOutlet` and the inputs listed below.
 * Nothing else is imposed: no signal, no base class.
 *
 * Every field component is a standalone component that renders its value as
 * inline content and NOTHING while the value has not arrived.
 *
 * Provide them in the page component:
 *   providers: [{ provide: PRODUCT_NAME_FIELD, useValue: ProductNameComponent }, ...]
 *
 * | Token                    | Inputs                                | Shown in |
 * | ------------------------ | ------------------------------------- | -------- |
 * | `PRODUCT_NAME_FIELD`     | `sku`, `prefix`                       | cart line, order line, activity sentence |
 * | `CUSTOMER_TIER_FIELD`    | `customerId`                          | list row |
 * | `OPEN_TICKETS_FIELD`     | `customerId`, `variant` (`row`/`kpi`/`badge`) | list row, header KPI, Tickets tab badge |
 * | `KPI_FIELD`              | `customerId`, `kind` (`lifetimeSpend`/`orders`/`avgOrder`/`orderCount`) | header KPIs, Orders tab badge |
 * | `AGENT_NAME_FIELD`       | `agentId`                             | note author, agent message author |
 * | `CUSTOMER_NAME_FIELD`    | `customerId`, `prefix`                | customer message author, bell sentence |
 * | `SHIPMENT_TRACKING_FIELD`| `orderId`                             | shipments rail |
 * | `PRODUCT_PRICE_FIELD`    | `sku`                                 | cart line price, search hit price |
 * | `LINE_TOTAL_FIELD`       | `sku`, `qty`                          | cart line total |
 * | `CART_TOTAL_FIELD`       | `lines` (`CartLineRef[]`)              | cart total |
 * | `PRODUCT_STOCK_FIELD`    | `sku`                                 | search hit stock |
 * | `HIT_ADD_FIELD`          | `sku`, `onAdd` (`(e: HitAdded) => void`) | search hit Add button |
 *
 * `HIT_ADD_FIELD` is an ACTION field: it renders the Add button of a search hit,
 * enabled only when the price and the stock of the sku are known and the stock
 * is above 0, and calls `onAdd({ sku, unitPrice })` when it is clicked. It is a
 * callback input and not an `output()` because `ngComponentOutlet` binds inputs
 * only.
 *
 * `prefix` is text rendered before the value, only together with it (the
 * activity sentence "Viewed <name>" and the bell sentence "<ticket>: new
 * message from <name>" are empty until the name is there).
 */

/** What an implementation gets when it provides nothing: always "not arrived". */
@Component({ selector: 'app-product-name-empty', template: '' })
export class EmptyProductName {
  public readonly sku = input.required<string>();
  public readonly prefix = input('');
}

@Component({ selector: 'app-customer-tier-empty', template: '' })
export class EmptyCustomerTier {
  public readonly customerId = input.required<number>();
}

@Component({ selector: 'app-open-tickets-empty', template: '' })
export class EmptyOpenTickets {
  public readonly customerId = input.required<number>();
  public readonly variant = input<'row' | 'kpi' | 'badge'>('row');
}

@Component({ selector: 'app-kpi-empty', template: '' })
export class EmptyKpi {
  public readonly customerId = input.required<number>();
  public readonly kind = input.required<
    'lifetimeSpend' | 'orders' | 'avgOrder' | 'orderCount'
  >();
}

@Component({ selector: 'app-agent-name-empty', template: '' })
export class EmptyAgentName {
  public readonly agentId = input.required<number>();
}

@Component({ selector: 'app-customer-name-empty', template: '' })
export class EmptyCustomerName {
  public readonly customerId = input.required<number>();
  public readonly prefix = input('');
}

@Component({ selector: 'app-shipment-tracking-empty', template: '' })
export class EmptyShipmentTracking {
  public readonly orderId = input.required<string>();
}

@Component({ selector: 'app-product-price-empty', template: '' })
export class EmptyProductPrice {
  public readonly sku = input.required<string>();
}

@Component({ selector: 'app-line-total-empty', template: '' })
export class EmptyLineTotal {
  public readonly sku = input.required<string>();
  public readonly qty = input.required<number>();
}

@Component({ selector: 'app-cart-total-empty', template: '' })
export class EmptyCartTotal {
  public readonly lines = input.required<CartLineRef[]>();
}

@Component({ selector: 'app-product-stock-empty', template: '' })
export class EmptyProductStock {
  public readonly sku = input.required<string>();
}

/** Nothing known: the Add button is there and disabled. */
@Component({
  selector: 'app-hit-add-empty',
  template: `<button
    type="button"
    class="btn btn-secondary btn-sm"
    [attr.data-testid]="'add-' + sku()"
    disabled
  >
    Add
  </button>`,
})
export class EmptyHitAdd {
  public readonly sku = input.required<string>();
  public readonly onAdd = input<(added: HitAdded) => void>(() => undefined);
}

const field = (name: string, empty: Type<unknown>) =>
  new InjectionToken<Type<unknown>>(name, {
    providedIn: 'root',
    factory: () => empty,
  });

export const PRODUCT_NAME_FIELD = field('productNameField', EmptyProductName);
export const CUSTOMER_TIER_FIELD = field(
  'customerTierField',
  EmptyCustomerTier,
);
export const OPEN_TICKETS_FIELD = field('openTicketsField', EmptyOpenTickets);
export const KPI_FIELD = field('kpiField', EmptyKpi);
export const AGENT_NAME_FIELD = field('agentNameField', EmptyAgentName);
export const CUSTOMER_NAME_FIELD = field(
  'customerNameField',
  EmptyCustomerName,
);
export const SHIPMENT_TRACKING_FIELD = field(
  'shipmentTrackingField',
  EmptyShipmentTracking,
);
export const PRODUCT_PRICE_FIELD = field(
  'productPriceField',
  EmptyProductPrice,
);
export const LINE_TOTAL_FIELD = field('lineTotalField', EmptyLineTotal);
export const CART_TOTAL_FIELD = field('cartTotalField', EmptyCartTotal);
export const PRODUCT_STOCK_FIELD = field(
  'productStockField',
  EmptyProductStock,
);
export const HIT_ADD_FIELD = field('hitAddField', EmptyHitAdd);
