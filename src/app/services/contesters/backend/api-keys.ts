/** One key per backend call (spec §4). Counters and faults are per key. */
export const CONSOLE_API_KEYS = [
  // session service
  'login',
  'logout',
  'profile',
  // agent directory
  'agents',
  // notifications service
  'notifications',
  'markNotificationsRead',
  // customer search service
  'customers',
  // CRM
  'customer',
  'tiers',
  // orders service
  'orders',
  'orderStats',
  'order',
  'updateOrder',
  'resendConfirmation',
  // shipping service
  'shipment',
  // cart service
  'cart',
  // product, pricing and inventory services
  'products',
  'searchProducts',
  'prices',
  'stock',
  // tickets service
  'tickets',
  'ticketsByOrder',
  'ticketCounts',
  'ticket',
  'replyTicket',
  // notes service
  'notes',
  'addNote',
  // activity service
  'activity',
] as const;

export type ConsoleApiKey = (typeof CONSOLE_API_KEYS)[number];
