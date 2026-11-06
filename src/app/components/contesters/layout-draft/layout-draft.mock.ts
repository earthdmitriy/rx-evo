/** Static data for the layout draft. No APIs, no streams: layout review only. */

export type Tier = 'VIP' | 'Regular' | 'New';

export const AGENT = { name: 'Dana Whitfield', initials: 'DW', role: 'Support · L2' };

export const CUSTOMERS: {
  id: number;
  name: string;
  initials: string;
  email: string;
  tier: Tier;
  openTickets: number;
  /** ISO date, for sorting. */
  lastOrder: string;
  lastOrderLabel: string;
  spend: number;
}[] = [
  { id: 1041, name: 'Maya Lindqvist', initials: 'ML', email: 'maya.lindqvist@example.com', tier: 'VIP', openTickets: 2, lastOrder: '2026-11-04', lastOrderLabel: 'Nov 4', spend: 12480 },
  { id: 1042, name: 'Omar Haddad', initials: 'OH', email: 'omar.haddad@example.com', tier: 'Regular', openTickets: 0, lastOrder: '2026-10-12', lastOrderLabel: 'Oct 12', spend: 2310 },
  { id: 1043, name: 'Priya Natarajan', initials: 'PN', email: 'priya.n@example.com', tier: 'Regular', openTickets: 1, lastOrder: '2026-11-01', lastOrderLabel: 'Nov 1', spend: 5120 },
  { id: 1044, name: 'Lucas Ferreira', initials: 'LF', email: 'lucas.ferreira@example.com', tier: 'New', openTickets: 0, lastOrder: '2026-11-05', lastOrderLabel: 'Nov 5', spend: 180 },
  { id: 1045, name: 'Hannah Schultz', initials: 'HS', email: 'hannah.schultz@example.com', tier: 'VIP', openTickets: 0, lastOrder: '2026-09-30', lastOrderLabel: 'Sep 30', spend: 18940 },
  { id: 1046, name: 'Kenji Watanabe', initials: 'KW', email: 'kenji.w@example.com', tier: 'Regular', openTickets: 3, lastOrder: '2026-10-27', lastOrderLabel: 'Oct 27', spend: 7350 },
  { id: 1047, name: 'Amara Okafor', initials: 'AO', email: 'amara.okafor@example.com', tier: 'New', openTickets: 0, lastOrder: '2026-11-02', lastOrderLabel: 'Nov 2', spend: 95 },
  { id: 1048, name: 'Tomás Rivera', initials: 'TR', email: 'tomas.rivera@example.com', tier: 'Regular', openTickets: 1, lastOrder: '2026-08-19', lastOrderLabel: 'Aug 19', spend: 3410 },
];

export const CUSTOMER_DETAILS = {
  since: 'Mar 2021',
  city: 'Gothenburg, SE',
  kpis: [
    { label: 'Lifetime spend', value: '$12,480' },
    { label: 'Orders', value: '37' },
    { label: 'Avg order', value: '$337' },
    { label: 'Open tickets', value: '2' },
  ],
};

export type OrderStatus = 'Delivered' | 'Shipped' | 'Processing' | 'Refunded';

export const ORDERS: {
  id: string;
  date: string;
  status: OrderStatus;
  items: number;
  total: string;
}[] = [
  { id: 'SO-58213', date: 'Nov 4, 2026', status: 'Processing', items: 3, total: '$412.00' },
  { id: 'SO-57940', date: 'Oct 28, 2026', status: 'Shipped', items: 1, total: '$89.90' },
  { id: 'SO-57102', date: 'Oct 9, 2026', status: 'Delivered', items: 5, total: '$1,204.50' },
  { id: 'SO-56588', date: 'Sep 22, 2026', status: 'Refunded', items: 2, total: '$158.00' },
  { id: 'SO-55931', date: 'Sep 3, 2026', status: 'Delivered', items: 4, total: '$530.25' },
  { id: 'SO-55017', date: 'Aug 14, 2026', status: 'Delivered', items: 1, total: '$64.00' },
];

export type OrderLine = { product: string; sku: string; qty: number; price: number };

export const ORDER_LINES: OrderLine[] = [
  { product: 'Merino crew sweater', sku: 'KN-2210', qty: 1, price: 149 },
  { product: 'Waxed canvas tote', sku: 'BG-0418', qty: 1, price: 189 },
  { product: 'Wool socks, 3-pack', sku: 'SK-0091', qty: 2, price: 37 },
];

/** Shop catalog (public reference data), searched when adding to an order. */
export const CATALOG: { product: string; sku: string; price: number; stock: number }[] = [
  { product: 'Canvas belt, olive', sku: 'AC-0310', price: 39, stock: 24 },
  { product: 'Canvas belt, black', sku: 'AC-0311', price: 39, stock: 0 },
  { product: 'Leather belt, cognac', sku: 'AC-0420', price: 79, stock: 8 },
  { product: 'Linen trousers, sand', sku: 'TR-1150', price: 129, stock: 12 },
  { product: 'Silk pocket square', sku: 'AC-0902', price: 29, stock: 40 },
  { product: 'Wool socks, 3-pack', sku: 'SK-0091', price: 37, stock: 65 },
];

export const CART = {
  lines: [
    { product: 'Linen shirt, sand', sku: 'SH-3302', qty: 1, price: '$98.00', total: '$98.00' },
    { product: 'Leather card holder', sku: 'AC-1120', qty: 2, price: '$45.00', total: '$90.00' },
    { product: 'Cotton chinos, navy', sku: 'TR-2041', qty: 1, price: '$119.00', total: '$119.00' },
  ],
  total: '$307.00',
};

export type TicketStatus = 'Open' | 'Waiting' | 'Solved';

export const TICKETS: {
  id: string;
  subject: string;
  status: TicketStatus;
  updated: string;
  orderId?: string;
}[] = [
  { id: 'T-9921', subject: 'I forgot to add a canvas belt (olive), could you add it?', status: 'Open', updated: '2h ago', orderId: 'SO-58213' },
  { id: 'T-9874', subject: 'Please remove the scarf from my order', status: 'Waiting', updated: 'Yesterday', orderId: 'SO-57940' },
  { id: 'T-9610', subject: 'Refund for a damaged bag', status: 'Solved', updated: 'Sep 25', orderId: 'SO-56588' },
];

export const TICKET_MESSAGES: Record<
  string,
  { from: 'customer' | 'agent'; author: string; when: string; text: string }[]
> = {
  'T-9921': [
    { from: 'customer', author: 'Maya Lindqvist', when: '2h ago', text: 'Hi! I forgot to add a canvas belt (olive) to my last order. Could you add it before it ships? Same card is fine.' },
  ],
  'T-9874': [
    { from: 'customer', author: 'Maya Lindqvist', when: 'Nov 1', text: 'Please remove the scarf from my order, I ordered it by mistake.' },
    { from: 'agent', author: 'Ravi Menon', when: 'Nov 1', text: 'Sorry, the order has already shipped. You can return the scarf for free within 30 days: I sent you a return label.' },
    { from: 'customer', author: 'Maya Lindqvist', when: 'Yesterday', text: 'Thanks, where do I find the label?' },
  ],
  'T-9610': [
    { from: 'customer', author: 'Maya Lindqvist', when: 'Sep 22', text: 'The tote arrived with a torn strap.' },
    { from: 'agent', author: 'Ravi Menon', when: 'Sep 23', text: 'Refund issued, plus a $20 voucher for the trouble.' },
  ],
};

export const NOTES = [
  { author: 'Dana Whitfield', when: 'Oct 29', text: 'Prefers email over phone. Sensitive to delivery delays — offer express shipping.' },
  { author: 'Ravi Menon', when: 'Sep 23', text: 'Refund approved by team lead, goodwill voucher $20 issued.' },
];

/** Tracking of the customer's orders that are on the way (per-order carrier lookups). */
export type ShipmentState = 'In transit' | 'Delayed' | 'Label created';

export const SHIPMENTS: {
  orderId: string;
  carrier: string;
  state: ShipmentState;
  eta: string;
  lastScan: string;
}[] = [
  { orderId: 'SO-58213', carrier: 'PostNord', state: 'Label created', eta: 'Nov 8', lastScan: 'Waiting for pickup' },
  { orderId: 'SO-57940', carrier: 'DHL Express', state: 'Delayed', eta: 'Nov 7', lastScan: 'Held at Malmö hub' },
];

export const ACTIVITY = [
  { when: '10 min ago', text: 'Added Cotton chinos to cart' },
  { when: '2h ago', text: 'Opened ticket T-9921' },
  { when: 'Yesterday', text: 'Viewed Linen trousers, sand' },
  { when: 'Nov 4', text: 'Placed order SO-58213' },
  { when: 'Oct 30', text: 'Changed delivery address' },
];

export const NOTIFICATIONS = [
  { text: 'T-9921 escalated to you', when: '5 min ago', unread: true },
  { text: 'Kenji Watanabe replied on T-9902', when: '40 min ago', unread: true },
  { text: 'Refund SO-56588 completed', when: 'Yesterday', unread: false },
];
