import { OrderStatusVm, ShipmentVm } from '../../shared';

/**
 * What a section shows, inside the reference only: the data layer's own
 * status. The page maps it to a block's `loading` and `error` (see
 * `reference-console.component.ts`); the shared views do not know it.
 */
export type ViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; reloading: boolean }
  | { kind: 'error'; failed: string[]; stale: boolean }
  | { kind: 'empty' };

export const IDLE: ViewState = { kind: 'idle' };

/** One in-flight order of S9 with its own tracking state. */
export type RefShipmentRow = { orderId: string; status: OrderStatusVm; state: ViewState; shipment: ShipmentVm | null };
