import { OrderStatusVm, ShipmentVm } from '../../shared';

/**
 * What a section shows, inside the reference only: the data layer's own
 * status. The page maps it to a block's `loading` and `error` (see
 * `vanilla-rxjs-console.component.ts`); the shared views do not know it.
 */
export type ViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  /** `notices`: the errors of the fields that failed; the section keeps its view and shows them as they came. */
  | { kind: 'ready'; reloading: boolean; notices?: unknown[] }
  /** `error`: the section's error as it came (`failed`: the API keys it came from). */
  | { kind: 'error'; failed: string[]; stale: boolean; error: unknown }
  | { kind: 'empty' };

export const IDLE: ViewState = { kind: 'idle' };

/** One in-flight order of S9 with its own tracking state. */
export type RefShipmentRow = {
  orderId: string;
  status: OrderStatusVm;
  state: ViewState;
  shipment: ShipmentVm | null;
};
