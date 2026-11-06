/**
 * Fake backend of the support console
 * (docs/contest/spec.md §2.1, §4): one service per domain.
 * Data layers import from here only; `backend/` is the server side.
 */
export * from './console.types';
export { CONSOLE_API_KEYS, type ConsoleApiKey } from './backend/api-keys';
export { PRODUCT_SEARCH_LIMIT, PUSH_PERIOD_MS } from './backend/fake-backend.service';
export * from './api/session-api.service';
export * from './api/notifications-api.service';
export * from './api/customers-api.service';
export * from './api/orders-api.service';
export * from './api/shipments-api.service';
export * from './api/cart-api.service';
export * from './api/products-api.service';
export * from './api/agents-api.service';
export * from './api/tickets-api.service';
export * from './api/notes-api.service';
export * from './api/activity-api.service';
