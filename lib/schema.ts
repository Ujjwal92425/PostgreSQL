export type SchemaTable = {
  name: string;
  purpose: string;
  columns: string[];
  topicFit: string;
};

export const learningSchema: SchemaTable[] = [
  {
    name: 'users',
    purpose: 'Account identity for customers, operators, and admins.',
    columns: [
      'id uuid primary key',
      'email citext unique not null',
      'full_name text not null',
      'country_code char(2)',
      'created_at timestamptz not null',
      'deleted_at timestamptz'
    ],
    topicFit: 'keys, unique constraints, partial indexes, RLS, audit trails'
  },
  {
    name: 'user_sessions',
    purpose: 'Login sessions and token metadata.',
    columns: [
      'id uuid primary key',
      'user_id uuid references users(id)',
      'ip_address inet',
      'user_agent text',
      'expires_at timestamptz not null',
      'revoked_at timestamptz'
    ],
    topicFit: 'timestamps, indexes, security, cleanup jobs'
  },
  {
    name: 'roles, permissions, user_roles',
    purpose: 'Role-based access control.',
    columns: [
      'roles(id, name)',
      'permissions(id, action, resource)',
      'user_roles(user_id, role_id)'
    ],
    topicFit: 'many-to-many joins, composite keys, authorization'
  },
  {
    name: 'categories',
    purpose: 'Nested product hierarchy.',
    columns: [
      'id bigint primary key',
      'name text not null',
      'parent_id bigint references categories(id)'
    ],
    topicFit: 'recursive CTEs, self joins, tree modeling'
  },
  {
    name: 'products',
    purpose: 'Sellable catalog items.',
    columns: [
      'id uuid primary key',
      'sku text unique not null',
      'name text not null',
      'category_id bigint references categories(id)',
      'metadata jsonb not null default {}',
      'created_at timestamptz not null'
    ],
    topicFit: 'JSONB, GIN indexes, full-text search, normalization'
  },
  {
    name: 'product_variants',
    purpose: 'Specific purchasable variants such as size/color.',
    columns: [
      'id uuid primary key',
      'product_id uuid references products(id)',
      'sku text unique not null',
      'attributes jsonb not null',
      'is_active boolean not null default true'
    ],
    topicFit: 'JSONB, check constraints, partial indexes'
  },
  {
    name: 'product_prices',
    purpose: 'Currency-aware decimal pricing history.',
    columns: [
      'id uuid primary key',
      'variant_id uuid references product_variants(id)',
      'currency_code char(3) not null',
      'amount numeric(12,2) not null',
      'valid_from timestamptz not null',
      'valid_to timestamptz'
    ],
    topicFit: 'decimal money values, range queries, temporal modeling'
  },
  {
    name: 'inventory_items',
    purpose: 'Stock available for variants in warehouses.',
    columns: [
      'id uuid primary key',
      'variant_id uuid references product_variants(id)',
      'warehouse_code text not null',
      'available_qty integer not null',
      'reserved_qty integer not null',
      'updated_at timestamptz not null'
    ],
    topicFit: 'transactions, row locks, deadlocks, check constraints'
  },
  {
    name: 'carts, cart_items',
    purpose: 'Temporary shopping state before checkout.',
    columns: [
      'carts(id, user_id, expires_at)',
      'cart_items(id, cart_id, variant_id, quantity)'
    ],
    topicFit: 'foreign keys, TTL cleanup, write-heavy patterns'
  },
  {
    name: 'orders',
    purpose: 'Customer order header.',
    columns: [
      'id uuid primary key',
      'user_id uuid references users(id)',
      'status text not null',
      'subtotal numeric(12,2) not null',
      'tax numeric(12,2) not null',
      'total numeric(12,2) not null',
      'created_at timestamptz not null'
    ],
    topicFit: 'OLTP, partitioning, indexes, RLS, analytics'
  },
  {
    name: 'order_items',
    purpose: 'Line items in an order.',
    columns: [
      'id uuid primary key',
      'order_id uuid references orders(id)',
      'variant_id uuid references product_variants(id)',
      'quantity integer not null',
      'unit_price numeric(12,2) not null'
    ],
    topicFit: 'joins, denormalized snapshots, constraints'
  },
  {
    name: 'payments, payment_attempts, refunds',
    purpose: 'Payment lifecycle and retry history.',
    columns: [
      'payments(id, order_id, provider, status, amount, created_at)',
      'payment_attempts(id, payment_id, idempotency_key, status, provider_response jsonb)',
      'refunds(id, payment_id, amount, reason, created_at)'
    ],
    topicFit: 'idempotency, JSONB, financial consistency, auditability'
  },
  {
    name: 'ledger_entries',
    purpose: 'Append-only accounting movements.',
    columns: [
      'id uuid primary key',
      'payment_id uuid references payments(id)',
      'account text not null',
      "direction text check (direction in ('debit', 'credit'))",
      'amount numeric(14,2) not null',
      'created_at timestamptz not null'
    ],
    topicFit: 'ACID, double-entry checks, immutable tables'
  },
  {
    name: 'venues, rooms, events, seats',
    purpose: 'Event and seat inventory for booking examples.',
    columns: [
      'venues(id, name, city)',
      'rooms(id, venue_id, name)',
      'events(id, room_id, starts_at, ends_at)',
      'seats(id, room_id, row_label, seat_number)'
    ],
    topicFit: 'normalization, composite uniqueness, range checks'
  },
  {
    name: 'seat_holds, seat_reservations, tickets',
    purpose: 'Concurrency-heavy seat booking workflow.',
    columns: [
      'seat_holds(id, event_id, seat_id, user_id, expires_at, status)',
      'seat_reservations(id, event_id, seat_id, user_id, hold_id, created_at)',
      'tickets(id, reservation_id, qr_code, issued_at)'
    ],
    topicFit: 'locking, unique indexes, isolation levels, race conditions'
  },
  {
    name: 'reviews, review_votes',
    purpose: 'Product feedback and moderation.',
    columns: [
      'reviews(id, product_id, user_id, rating, body, created_at)',
      'review_votes(review_id, user_id, vote)'
    ],
    topicFit: 'full-text search, constraints, aggregate queries'
  },
  {
    name: 'addresses, shipments, shipment_events',
    purpose: 'Delivery workflow and event timeline.',
    columns: [
      'addresses(id, user_id, country_code, city, postal_code)',
      'shipments(id, order_id, carrier, tracking_number, status)',
      'shipment_events(id, shipment_id, status, occurred_at)'
    ],
    topicFit: 'joins, indexes, status histories, event modeling'
  },
  {
    name: 'audit_logs, outbox_events, idempotency_keys',
    purpose: 'Operational safety, event publishing, and retry control.',
    columns: [
      'audit_logs(id, actor_user_id, action, entity_type, entity_id, metadata jsonb, created_at)',
      'outbox_events(id, aggregate_type, aggregate_id, event_type, payload jsonb, published_at)',
      'idempotency_keys(key, scope, request_hash, response_body jsonb, created_at)'
    ],
    topicFit: 'CDC, outbox pattern, JSONB, partitioning, observability'
  },
  {
    name: 'page_views, product_impressions, search_events',
    purpose: 'High-volume analytics events.',
    columns: [
      'page_views(id, user_id, path, occurred_at)',
      'product_impressions(id, product_id, user_id, source, occurred_at)',
      'search_events(id, user_id, query_text, filters jsonb, occurred_at)'
    ],
    topicFit: 'partitioning, BRIN indexes, OLAP/OLTP split'
  }
];

export const schemaSql = `create table users (
  id uuid primary key,
  email citext unique not null,
  full_name text not null,
  country_code char(2),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table product_prices (
  id uuid primary key,
  variant_id uuid not null references product_variants(id),
  currency_code char(3) not null,
  amount numeric(12,2) not null check (amount >= 0),
  valid_from timestamptz not null,
  valid_to timestamptz,
  check (valid_to is null or valid_to > valid_from)
);

create table seat_reservations (
  id uuid primary key,
  event_id uuid not null references events(id),
  seat_id uuid not null references seats(id),
  user_id uuid not null references users(id),
  hold_id uuid references seat_holds(id),
  created_at timestamptz not null default now(),
  unique (event_id, seat_id)
);`;
