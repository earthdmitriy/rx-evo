import { base, en, Faker } from '@faker-js/faker';
import {
  ActivityEntry,
  Agent,
  AgentNotification,
  CartLine,
  IN_FLIGHT,
  Note,
  OrderLine,
  OrderStatus,
  Shipment,
  ShipmentState,
  TicketMessage,
  TicketRow,
  TicketStatus,
  Tier,
} from '../console.types';

/** All seeded data is dated relative to this moment, so a seed gives the same data on any day. */
export const SEED_NOW = Date.UTC(2026, 10, 6, 9, 0, 0);

const CUSTOMER_COUNT = 120;
const PRODUCT_COUNT = 60;
const AGENT_COUNT = 5;
/** The one oversized cart (`testFixtures().bigCart`): more skus than one batch call takes. */
const BIG_CART = 24;

export type CustomerRecord = {
  customerId: number;
  name: string;
  initials: string;
  email: string;
  tier: Tier;
  city: string;
  since: string;
  address: string;
};

export type OrderRecord = {
  orderId: string;
  customerId: number;
  date: string;
  status: OrderStatus;
  lines: OrderLine[];
  payment: string;
  shipping: 'Standard' | 'Express';
};

export type TicketRecord = TicketRow & { messages: TicketMessage[] };

/** One product as the backend stores it; the product, pricing and inventory services each expose a part. */
export type CatalogItem = {
  sku: string;
  name: string;
  price: number;
  stock: number;
};

/** The fake backend's tables. Mutated in place by writes. */
export type DbState = {
  agents: Agent[];
  customers: CustomerRecord[];
  catalog: CatalogItem[];
  orders: OrderRecord[];
  carts: Map<number, CartLine[]>;
  tickets: TicketRecord[];
  notes: Note[];
  shipments: Map<string, Shipment>;
  activity: Map<number, ActivityEntry[]>;
  notifications: Map<number, AgentNotification[]>;
  nextIds: {
    order: number;
    ticket: number;
    note: number;
    notification: number;
  };
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const iso = (ms: number) => new Date(ms).toISOString();
const daysAgo = (f: Faker, min: number, max: number) =>
  iso(SEED_NOW - f.number.int({ min: min * 24, max: max * 24 }) * 3_600_000);

const PRODUCT_KINDS = [
  'sweater',
  'shirt',
  'chinos',
  'trousers',
  'tote',
  'belt',
  'card holder',
  'scarf',
  'socks, 3-pack',
  'pocket square',
  'cap',
  'jacket',
];
const CARRIERS = ['PostNord', 'DHL Express', 'UPS', 'DB Schenker'];
const ROLES = ['Support · L1', 'Support · L2'];

/** Generates the whole backend from a seed. Same seed, same data. */
export const createDb = (seed: number): DbState => {
  const f = new Faker({ locale: [en, base] });
  f.seed(seed);

  const agents: Agent[] = Array.from({ length: AGENT_COUNT }, (_, i) => {
    const name = f.person.fullName();
    return {
      agentId: i + 1,
      name,
      initials: initials(name),
      email: f.internet
        .email({ firstName: name.split(' ')[0], provider: 'shop.example' })
        .toLowerCase(),
      role: f.helpers.arrayElement(ROLES),
    };
  });

  const catalog: CatalogItem[] = Array.from(
    { length: PRODUCT_COUNT },
    (_, i) => ({
      sku: `${f.string.alpha({ length: 2, casing: 'upper' })}-${String(1000 + i * 37).padStart(4, '0')}`,
      name: `${f.commerce.productAdjective()} ${f.helpers.arrayElement(PRODUCT_KINDS)}, ${f.color.human()}`,
      price: f.number.int({ min: 2, max: 40 }) * 5 - 1,
      stock: f.helpers.weightedArrayElement([
        { weight: 1, value: 0 },
        { weight: 6, value: f.number.int({ min: 1, max: 80 }) },
      ]),
    }),
  );

  const customers: CustomerRecord[] = Array.from(
    { length: CUSTOMER_COUNT },
    (_, i) => {
      const first = f.person.firstName();
      const last = f.person.lastName();
      const name = `${first} ${last}`;
      const city = f.location.city();
      return {
        customerId: 1001 + i,
        name,
        initials: initials(name),
        email: f.internet
          .email({ firstName: first, lastName: last })
          .toLowerCase(),
        tier: f.helpers.weightedArrayElement<Tier>([
          { weight: 1, value: 'VIP' },
          { weight: 6, value: 'Regular' },
          { weight: 2, value: 'New' },
        ]),
        city: `${city}, ${f.location.countryCode()}`,
        since: daysAgo(f, 30, 2000),
        address: `${f.location.streetAddress()}, ${f.location.zipCode()} ${city}`,
      };
    },
  );

  const pickLines = (count: number): OrderLine[] =>
    f.helpers.arrayElements(catalog, count).map((p) => ({
      sku: p.sku,
      qty: f.helpers.weightedArrayElement([
        { weight: 5, value: 1 },
        { weight: 1, value: 2 },
      ]),
      unitPrice: p.price,
    }));
  const nameOf = (sku: string) => catalog.find((p) => p.sku === sku)!.name;

  let orderSeq = 50000;
  const orders: OrderRecord[] = [];
  for (const c of customers) {
    const count =
      c.tier === 'New'
        ? f.number.int({ min: 0, max: 2 })
        : f.number.int({ min: 1, max: 12 });
    const dates = Array.from({ length: count }, () => daysAgo(f, 0, 600))
      .sort()
      .reverse();
    dates.forEach((date, idx) => {
      const ageDays = (SEED_NOW - Date.parse(date)) / 86_400_000;
      const status: OrderStatus =
        ageDays < 3 && idx === 0
          ? 'Processing'
          : ageDays < 10
            ? 'Shipped'
            : f.helpers.weightedArrayElement<OrderStatus>([
                { weight: 9, value: 'Delivered' },
                { weight: 1, value: 'Refunded' },
              ]);
      orders.push({
        orderId: `SO-${orderSeq++}`,
        customerId: c.customerId,
        date,
        status,
        lines: pickLines(f.number.int({ min: 1, max: 5 })),
        payment: `${f.helpers.arrayElement(['Visa', 'Mastercard', 'PayPal'])} ••${f.string.numeric(2)}`,
        shipping: f.helpers.arrayElement(['Standard', 'Express'] as const),
      });
    });
  }

  // Guarantee the cases the e2e suite needs, whatever the seed: every 8th
  // customer with 2+ orders gets one Processing and one Shipped order.
  const guaranteed: OrderRecord[] = [];
  customers.forEach((c, i) => {
    if (i % 8 !== 3) return;
    const own = orders
      .filter((o) => o.customerId === c.customerId)
      .sort((x, y) => y.date.localeCompare(x.date));
    if (own.length < 2) return;
    own[0].status = 'Processing';
    own[0].date = iso(SEED_NOW - 26 * 3_600_000);
    own[1].status = 'Shipped';
    own[1].date = iso(SEED_NOW - 4 * 86_400_000);
    guaranteed.push(own[0]);
  });

  const shipments = new Map<string, Shipment>();
  for (const o of orders.filter((o) => IN_FLIGHT.includes(o.status))) {
    const state: ShipmentState =
      o.status === 'Processing'
        ? 'Label created'
        : f.helpers.weightedArrayElement<ShipmentState>([
            { weight: 4, value: 'In transit' },
            { weight: 1, value: 'Delayed' },
          ]);
    shipments.set(o.orderId, {
      orderId: o.orderId,
      carrier: f.helpers.arrayElement(CARRIERS),
      state,
      eta: iso(
        Date.parse(o.date) + f.number.int({ min: 2, max: 7 }) * 86_400_000,
      ),
      lastScan:
        state === 'Label created'
          ? 'Waiting for pickup'
          : state === 'Delayed'
            ? `Held at ${f.location.city()} hub`
            : `Departed ${f.location.city()} terminal`,
    });
  }

  const carts = new Map<number, CartLine[]>();
  for (const c of customers) {
    const lines = f.helpers
      .arrayElements(catalog, f.number.int({ min: 0, max: 4 }))
      .map((p) => ({ sku: p.sku, qty: f.number.int({ min: 1, max: 2 }) }));
    carts.set(c.customerId, lines);
  }
  // one customer with a cart too big for a single batch call (more than MAX_BATCH skus); no randomness, so other data is unchanged
  carts.set(
    customers[5].customerId,
    catalog
      .slice(0, BIG_CART)
      .map((p, i) => ({ sku: p.sku, qty: 1 + (i % 2) })),
  );

  let ticketSeq = 9000;
  const tickets: TicketRecord[] = [];
  for (const c of customers) {
    const own = orders.filter((o) => o.customerId === c.customerId);
    const count = f.number.int({ min: 0, max: Math.min(4, own.length + 1) });
    for (let i = 0; i < count; i++) {
      const order = own.length ? f.helpers.arrayElement(own) : undefined;
      const product = order
        ? nameOf(f.helpers.arrayElement(order.lines).sku)
        : '';
      const subject = !order
        ? 'Question about my account'
        : order.status === 'Processing'
          ? f.helpers.arrayElement([
              `I forgot to add a ${f.helpers.arrayElement(catalog).name}, could you add it?`,
              `Please remove the ${product} from my order`,
            ])
          : order.status === 'Shipped'
            ? `Where is my order ${order.orderId}?`
            : f.helpers.arrayElement([
                `The ${product} arrived damaged`,
                `Wrong size delivered: ${product}`,
              ]);
      const status: TicketStatus =
        order?.status === 'Processing'
          ? 'Open'
          : f.helpers.arrayElement<TicketStatus>([
              'Open',
              'Waiting',
              'Solved',
              'Solved',
            ]);
      const opened = order
        ? iso(Math.max(Date.parse(order.date), SEED_NOW - 30 * 86_400_000))
        : daysAgo(f, 1, 60);
      const messages: TicketMessage[] = [
        {
          from: 'customer',
          authorId: c.customerId,
          at: opened,
          text: `Hi! ${subject}`,
        },
      ];
      if (status !== 'Open') {
        messages.push({
          from: 'agent',
          authorId: f.helpers.arrayElement(agents).agentId,
          at: iso(
            Date.parse(opened) + 3_600_000 * f.number.int({ min: 1, max: 20 }),
          ),
          text:
            status === 'Solved'
              ? 'Done, sorry for the trouble.'
              : 'Could you send a photo, please?',
        });
      }
      tickets.push({
        ticketId: `T-${ticketSeq++}`,
        customerId: c.customerId,
        subject,
        status,
        updated: messages[messages.length - 1].at,
        orderId: order?.orderId,
        messages,
      });
    }
  }

  // ...and an open ticket asking to add a product to that Processing order
  for (const o of guaranteed) {
    if (tickets.some((t) => t.orderId === o.orderId && t.status !== 'Solved'))
      continue;
    const c = customers.find((x) => x.customerId === o.customerId)!;
    const subject = `I forgot to add a ${f.helpers.arrayElement(catalog).name}, could you add it?`;
    const at = iso(SEED_NOW - 5 * 3_600_000);
    tickets.push({
      ticketId: `T-${ticketSeq++}`,
      customerId: c.customerId,
      subject,
      status: 'Open',
      updated: at,
      orderId: o.orderId,
      messages: [
        {
          from: 'customer',
          authorId: c.customerId,
          at,
          text: `Hi! ${subject}`,
        },
      ],
    });
  }

  let noteSeq = 1;
  const notes: Note[] = [];
  for (const c of customers) {
    for (let i = f.number.int({ min: 0, max: 2 }); i > 0; i--) {
      notes.push({
        noteId: noteSeq++,
        customerId: c.customerId,
        authorId: f.helpers.arrayElement(agents).agentId,
        at: daysAgo(f, 1, 300),
        text: f.helpers.arrayElement([
          'Prefers email over phone.',
          'Sensitive to delivery delays, offer express shipping.',
          'Goodwill voucher issued after a late delivery.',
          'Asked not to receive marketing emails.',
        ]),
      });
    }
  }

  const activity = new Map<number, ActivityEntry[]>();
  for (const c of customers) {
    const entries: ActivityEntry[] = [
      ...orders
        .filter((o) => o.customerId === c.customerId)
        .slice(0, 3)
        .map(
          (o): ActivityEntry => ({
            at: o.date,
            kind: 'order-placed',
            refId: o.orderId,
          }),
        ),
      ...Array.from(
        { length: f.number.int({ min: 1, max: 3 }) },
        (): ActivityEntry => ({
          at: daysAgo(f, 0, 20),
          kind: 'product-viewed',
          refId: f.helpers.arrayElement(catalog).sku,
        }),
      ),
    ].sort((a, b) => b.at.localeCompare(a.at));
    activity.set(c.customerId, entries);
  }

  let notificationSeq = 1;
  const notifications = new Map<number, AgentNotification[]>();
  for (const a of agents) {
    notifications.set(
      a.agentId,
      f.helpers
        .arrayElements(
          tickets.filter((t) => t.status !== 'Solved'),
          3,
        )
        .map(
          (t, i): AgentNotification => ({
            id: notificationSeq++,
            kind: 'ticket-reply',
            at: daysAgo(f, 0, 3),
            unread: i < 2,
            ticketId: t.ticketId,
            customerId: t.customerId,
          }),
        ),
    );
  }

  return {
    agents,
    customers,
    catalog,
    orders,
    carts,
    tickets,
    notes,
    shipments,
    activity,
    notifications,
    nextIds: {
      order: orderSeq,
      ticket: ticketSeq,
      note: noteSeq,
      notification: notificationSeq,
    },
  };
};
