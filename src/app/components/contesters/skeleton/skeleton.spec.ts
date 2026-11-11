import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AgentNameComponent } from './agent-name.component';
import { CartTotalComponent } from './cart-total.component';
import { CustomerNameComponent } from './customer-name.component';
import { CustomerTierComponent } from './customer-tier.component';
import { HitAddComponent } from './hit-add.component';
import { KpiComponent } from './kpi.component';
import { LineTotalComponent } from './line-total.component';
import { OpenTicketsComponent } from './open-tickets.component';
import { ProductNameComponent } from './product-name.component';
import { ProductPriceComponent } from './product-price.component';
import { ProductStockComponent } from './product-stock.component';
import { ShipmentTrackingComponent } from './shipment-tracking.component';

/**
 * The skeletons are not imported by the app, so nothing else compiles them
 * with the rest of the build (a base or an implementation does). This keeps
 * them compiling and keeps their promise: with the TODO props untouched they
 * render the block and nothing else.
 */
const skeletons: [string, Type<unknown>, Record<string, unknown>][] = [
  ['product-name', ProductNameComponent, { sku: 'sku-1', prefix: 'Viewed ' }],
  ['customer-tier', CustomerTierComponent, { customerId: 1 }],
  ['open-tickets', OpenTicketsComponent, { customerId: 1, variant: 'row' }],
  ['kpi', KpiComponent, { customerId: 1, kind: 'orders' }],
  ['agent-name', AgentNameComponent, { agentId: 1 }],
  ['customer-name', CustomerNameComponent, { customerId: 1, prefix: '' }],
  ['shipment-tracking', ShipmentTrackingComponent, { orderId: 'SO-1' }],
  ['product-price', ProductPriceComponent, { sku: 'sku-1' }],
  ['line-total', LineTotalComponent, { sku: 'sku-1', qty: 2 }],
  ['cart-total', CartTotalComponent, { lines: [{ sku: 'sku-1', qty: 2 }] }],
  ['product-stock', ProductStockComponent, { sku: 'sku-1' }],
];

describe('skeleton view components', () => {
  for (const [name, component, inputs] of skeletons) {
    it(`${name} renders its block and nothing else while the data is a TODO`, () => {
      const fixture = TestBed.createComponent(component);
      for (const [key, value] of Object.entries(inputs))
        fixture.componentRef.setInput(key, value);
      fixture.detectChanges();
      const host: HTMLElement = fixture.nativeElement;
      expect(host.querySelector('[data-testid="state-block"]')).not.toBeNull();
      expect(host.textContent?.trim()).toBe('');
    });
  }

  it('hit-add renders its block and a disabled Add button while the data is a TODO', () => {
    const fixture = TestBed.createComponent(HitAddComponent);
    fixture.componentRef.setInput('sku', 'sku-1');
    fixture.componentRef.setInput('onAdd', () => undefined);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('[data-testid="state-block"]')).not.toBeNull();
    const button = host.querySelector<HTMLButtonElement>(
      '[data-testid="add-sku-1"]',
    );
    expect(button?.disabled).toBe(true);
  });
});
