import type { ConsoleApiKey } from '../../../services/contesters/backend/api-keys';

/** Every backend call key. */
export const ConsoleApiKeys: ConsoleApiKey[] = [
  'login', 'logout', 'profile', 'agents', 'notifications', 'markNotificationsRead', 'customers', 'customer', 'tiers', 'orders', 'orderStats', 'order',
  'updateOrder', 'resendConfirmation', 'shipment', 'cart', 'products', 'searchProducts', 'prices', 'stock', 'tickets', 'ticketsByOrder', 'ticketCounts',
  'ticket', 'replyTicket', 'notes', 'addNote', 'activity',
];
