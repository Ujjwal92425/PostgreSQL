import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const systemDesignNotes: NotePage[] = [
  {
    topicId: '16-system-design',
    slug: 'outbox-pattern',
    title: 'Outbox Pattern',
    description: 'Implement guaranteed at-least-once domain event publishing using transactional Outbox tables.',
    level: 'Production',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what the outbox pattern is',
        body: [
          'The Transactional Outbox Pattern solves the dual-write problem (writing to a database AND publishing a message to Kafka/RabbitMQ in one workflow). Instead of publishing to Kafka directly, domain events are saved to an outbox_events table inside the same database transaction, ensuring atomicity.',
          'What it does: either the business change AND the event row commit together, or neither does — a separate relay (poller or Debezium) forwards outbox rows to the message bus afterwards.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'The naive flow — save order, then publish — loses events when the publish fails or crashes between the two steps. That means missed emails, uncharged cards, broken downstream caches. The outbox pattern is the standard, interview-required answer for "how do you guarantee events are not lost?"'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The database is the post office and the message bus is the delivery truck. You never hand the truck the letter directly — you DROP IT IN THE MAILBOX (outbox table) with the letter (business change) in the same trip (transaction). The mail carrier (relay) collects the mailbox later and drives it out. If the truck crashes, the letters are still in the mailbox; if the business write fails, the mailbox never got them.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the outbox anatomy',
        headers: ['Component', 'Responsibility', 'Key columns'],
        rows: [
          ['outbox_events table', 'Transactional staging of events', 'id, aggregate_type, aggregate_id, event_type, payload, published_at'],
          ['The business transaction', 'Writes state + event atomically', 'BEGIN ... COMMIT'],
          ['Relay (poller)', 'SELECT unpublished -> publish -> mark', 'published_at is null filter'],
          ['Idempotent consumers', 'Handle at-least-once delivery', 'dedupe by event id'],
          ['Debezium (optional)', 'CDC reader replaces the poller', 'pgoutput slot, no poll query']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: the dual-write problem (the bug)',
        language: 'sql',
        code: `-- NAIVE FLOW (broken):
-- 1. INSERT order ...        (DB)
-- 2. kafka.publish(event)    (MQ)  <-- if this fails, order exists but no event!
-- Crash here => downstream systems never learn about the order.

-- OUTBOX FLOW (correct):
create table outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

-- In the checkout transaction:
begin;
insert into orders (id, user_id, status, total)
values ('ord_99', 'usr_1', 'paid', 150.00);
insert into outbox_events (aggregate_type, aggregate_id, event_type, payload)
values ('order', 'ord_99', 'OrderPlaced', '{"order_id": "ord_99", "total": 150.00}');
commit;
-- Either BOTH rows exist, or neither. The event cannot be lost.`
      },
      {
        type: 'code',
        title: '7. Medium example: the relay poller',
        language: 'sql',
        code: `-- Poller query (every few seconds):
select id, aggregate_type, aggregate_id, event_type, payload
from outbox_events
where published_at is null
order by created_at
limit 100
for update skip locked;          -- safe with multiple relay workers

-- Publish to the bus, then mark:
update outbox_events
set published_at = now()
where id = any(:published_ids);

-- Batch DELETE for retention (keep the table small):
delete from outbox_events
where published_at < now() - interval '7 days';

-- Index for the poll:
create index outbox_unpublished_idx
on outbox_events (created_at) where published_at is null;`
      },
      {
        type: 'code',
        title: '8. Complex example: Debezium CDC + idempotent consumers',
        language: 'sql',
        code: `-- Scale-up version: Debezium reads the WAL via a logical slot
-- (see the CDC page) instead of polling the table:
--   slot: outbox_events changes stream -> Kafka topic order.events

-- Consumer contract: at-least-once. The consumer MUST be idempotent:
create table idempotency_keys (
  event_id uuid primary key,          -- dedupe on the event id
  processed_at timestamptz not null default now()
);

-- Consumer pseudocode:
--   for each kafka message:
--     insert into idempotency_keys (event_id) values (:event_id);
--     -- unique violation => already processed => skip
--     update orders set status = 'notified'
--     where id = :order_id and status <> 'notified';

-- Ordering guarantee (single partition per aggregate):
--   Kafka key = aggregate_id => events per order stay ordered.

-- Failure modes handled:
--   1. relay crashes mid-batch  -> unmarked rows stay, poller retries
--   2. consumer crashes mid-work -> replay via idempotency key
--   3. bus down                 -> events accumulate, bounded by retention`
      },
      {
        type: 'callout',
        title: 'Outbox vs CDC vs direct publish',
        body: 'Direct publish: simplest, loses events on failure. Outbox: database-guaranteed, small relay overhead. CDC (Debezium): outbox without a poller — but the table still exists because the SAME atomicity argument applies (the WAL holds both rows or neither). All production event pipelines are outbox or CDC; "just publish after the commit" is not a design.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: why the outbox works',
        body: [
          'The guarantee is exactly transaction atomicity: both inserts share one XID and one WAL commit record — either both become visible or neither. The relay reads only committed rows (MVCC snapshot), so it can never observe the business row without the event row. Logical decoding (CDC) reads the same WAL, preserving the ordering of events within the transaction. The FOR UPDATE SKIP LOCKED poller keeps concurrent relays from double-publishing.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Publishing BEFORE commit', 'Events for rolled-back transactions leak out', 'Insert outbox row inside the transaction only'],
          ['No idempotent consumer', 'At-least-once delivery duplicates effects', 'Idempotency keys / unique constraints'],
          ['Poller without SKIP LOCKED', 'Two workers publish the same event', 'FOR UPDATE SKIP LOCKED'],
          ['No retention cleanup', 'Outbox grows forever', 'Delete published rows on a schedule'],
          ['Payload referencing mutable state', 'Consumers read changed state later', 'Snapshot needed fields into the payload']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Start with the poller (simple, debuggable); adopt Debezium when throughput demands.',
          'Alert on outbox backlog: age of oldest unpublished event > 1 minute.',
          'Make the relay a separate service so poll load never touches the API path.',
          'Ordering: key Kafka messages by aggregate_id; keep one partition per aggregate.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: How do you ensure no event is lost when a DB write and a message publish must happen together? Answer: The outbox pattern — write the event to a table in the same transaction, then a relay publishes it; at-least-once with idempotent consumers.',
          'Question: Outbox vs transactional message (JMS/XA)? Answer: XA across DB + broker is complex and fragile; the outbox keeps one transaction (the DB) and moves the reliability to a simple relay — far easier to operate at scale.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Implement the outbox table + poller against the course schema.',
          '2. Kill the relay mid-batch and verify no events are lost on restart.',
          '3. Add the idempotency table and replay a message twice.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'Microservices.io: "Transactional Outbox"',
          'Next: Change Data Capture'
        ]
      }
    ]
  },
  {
    topicId: '16-system-design',
    slug: 'cdc',
    title: 'Change Data Capture',
    description: 'Stream database row mutations to downstream microservices using Debezium and PostgreSQL Logical Decoding.',
    level: 'Production',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what CDC is',
        body: [
          'Change Data Capture (CDC) reads write events directly from the PostgreSQL Write-Ahead Log (WAL) via logical replication slots (e.g. pgoutput), streaming insert/update/delete events to Kafka with zero application overhead.',
          'What it does: downstream systems (search indexes, caches, warehouses, analytics) receive row-level change events without the application having to emit them — a universal "database commit hook".'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need it',
        body: [
          'Every service that mirrors or enriches database state (Elasticsearch, Redis cache, data warehouse, audit) faces the same problem: how do you know what changed? CDC answers it at the source — no app code, no missed events, no dual-write bugs — and is the standard engine behind modern data pipelines.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The WAL is the database\'s confession journal: every committed change is written there before anything else. CDC is a reporter who reads the journal as it is written and narrates to the newsroom (Kafka): "order 99 was INSERTED with these values". Because the journal is append-only and complete, the reporter never misses a story — and can even re-read history from any point (slot with LSN).'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: CDC machinery',
        headers: ['Component', 'Role', 'Config point'],
        rows: [
          ['wal_level = logical', 'Enables logical decoding info in WAL', 'postgresql.conf'],
          ['Replication slot', 'Pins WAL position per consumer', 'pg_replication_slots'],
          ['Output plugin', 'Translates WAL records to events (pgoutput)', 'slot creation'],
          ['Debezium', 'Production CDC connector (also outbox-aware)', 'Kafka Connect'],
          ['Consumer', 'Applies/replays events downstream', 'Application']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: creating a logical slot manually',
        language: 'sql',
        code: `-- Requires: wal_level = logical (restart)

select pg_create_logical_replication_slot('cdc_slot', 'pgoutput');

-- WAL now retains everything from the slot's start LSN:
select slot_name, active, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) as pending_bytes
from pg_replication_slots;

-- Simulate changes to see events stream:
insert into orders (id, user_id, status, total)
values ('ord_100', 'usr_1', 'paid', 42.00);
update orders set status = 'shipped' where id = 'ord_100';

-- A real consumer (Debezium) decodes these as:
--   {"op": "c", "after": {"id": "ord_100", "status": "paid", ...}}   (create)
--   {"op": "u", "before": {...}, "after": {"status": "shipped", ...}} (update)`
      },
      {
        type: 'code',
        title: '7. Medium example: Debezium connector configuration',
        language: 'sql',
        code: `-- Kafka Connect config for PostgreSQL -> Kafka:
{
  "name": "pg-orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres-primary",
    "database.dbname": "postgres_db",
    "database.user": "debezium",
    "database.server.name": "pg1",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_slot",
    "publication.name": "debezium_pub",
    "publication.autocreate.mode": "filtered",
    "table.include.list": "public.orders,public.order_items",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}

-- Debezium needs a REPLICA IDENTITY to send before-images on UPDATE:
alter table orders replica identity full;
-- (full = entire old row in "before"; default sends only the key)`
      },
      {
        type: 'code',
        title: '8. Complex example: CDC pipeline with exactly-once-ish semantics',
        language: 'sql',
        code: `-- Topic layout: pg1.public.orders (one topic per table)
-- Each event carries: op (c/u/d/r), before, after, ts_ms, source.lsn

-- Downstream dedupe (Kafka consumers get at-least-once):
create table consumer_dedup (
  event_lsn pg_lsn primary key,
  processed_at timestamptz not null default now()
);
-- Consumer: INSERT dedup -> apply -> (unique violation = already applied)

-- Ordering: events per row are ordered by LSN; use a single
-- partition per table OR hash by pk — never random partitions.

-- Replica identity controls "before" payload size:
--   default     -> only the PK in before
--   full        -> entire old row (expensive on wide tables)
--   using index -> specify the key columns

-- Failure handling:
--   1. Connector down -> slot pins WAL (monitor pending_bytes!)
--   2. Consumer behind -> replay from last committed LSN (at-least-once)
--   3. Backfill after schema change -> snapshot via connector re-snapshot`
      },
      {
        type: 'callout',
        title: 'Slot management is life-or-death',
        body: 'A CDC slot that stops consuming pins WAL forever — the primary\'s pg_wal grows until the disk fills. Monitor pg_replication_slots pending_bytes and alert immediately. Also: DDL (ALTER TABLE) is NOT captured as row events — schema changes need separate handling (Debezium signals or a schema-registry topic).'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how logical decoding works',
        body: [
          'With wal_level=logical, WAL records carry extra decoding info. A logical slot runs a walsender with the output plugin (pgoutput); during decode, the plugin walks WAL records, reconstructs row changes via system catalogs (mapping OIDs to tables/columns), applies publication filters, and emits protocol messages. The startup process feeds WAL from the slot\'s restart_lsn. Origins track remote origin IDs so a subscriber that re-publishes does not loop back (pg_replication_origin).'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Orphaned logical slots', 'WAL accumulates; disk fills; primary dies', 'Monitor + drop dead slots'],
          ['Replica identity default for updates', 'No before-image; consumer rebuilds must guess', 'replica identity full / using index as needed'],
          ['Random partition keys on Kafka topics', 'Events for one row land out of order', 'Partition by PK; one partition per aggregate'],
          ['No dedupe on consumers', 'At-least-once becomes duplicates downstream', 'Idempotent applies (dedup table)'],
          ['Schema changes uncoordinated', 'Decode fails on column mismatch', 'Versioned schemas; connector re-snapshot policy']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Give the connector its own least-privilege role (REPLICATION, SELECT on publication tables).',
          'Set a max slot retention guard (WAL_LEVEL logical + monitor; or slot failover with HA tools).',
          'Plan disk headroom: slots + replicas both consume WAL on the primary.',
          'Use Debezium\'s outbox integration to avoid double pipelines when you need business events.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: CDC vs polling the database? Answer: Polling adds load, misses deletions (soft-delete hacks), and lags; CDC reads the WAL — complete, ordered, zero app impact — at the cost of slot management.',
          'Question: What breaks in CDC? Answer: Slot growth (disk), DDL changes (decode mismatch), schema evolution, and at-least-once semantics requiring idempotent consumers.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Create a logical slot, run changes, and inspect events with pg_logical_slot_get_changes().',
          '2. Configure replica identity full and observe before-images in update events.',
          '3. Simulate a dead slot: stop consuming and watch pending_bytes grow.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Logical Decoding", Debezium PostgreSQL connector docs',
          'Next: Order Processing System'
        ]
      }
    ]
  },
  {
    topicId: '16-system-design',
    slug: 'order-processing-system',
    title: 'Order Processing System',
    description: 'Design an end-to-end production e-commerce database architecture supporting high-concurrency checkout.',
    level: 'Production',
    readingTime: '32 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what an order processing system is',
        body: [
          'An enterprise order processing database architecture combines strict foreign key constraints, currency-aware decimal types, row-level inventory locks, transaction idempotency keys, append-only ledger entries, and outbox event streaming.',
          'What it does: it takes a checkout request and guarantees exactly-once order creation, correct stock decrement, payment reconciliation, and downstream event delivery — all under thousands of concurrent requests.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Checkout is the highest-consequence transaction in e-commerce: oversell stock, double-charge cards, or lose events and you have real money and trust damage. This design is the capstone — it combines every topic in this course into one architecture you can defend in an interview.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Checkout is a conveyor belt with five checkpoints, each enforcing one law: 1) IDEMPOTENCY — the same request twice makes one order; 2) ATOMICITY — order, stock, payment all commit together; 3) INTEGRITY — money is exact decimal, children always belong to a parent; 4) DURABILITY — WAL and ledger survive crashes; 5) PUBLISHING — events leave via the outbox, never lost. Remove one checkpoint and the belt produces disasters.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the architecture layers',
        headers: ['Layer', 'Tables', 'Enforces'],
        rows: [
          ['Identity & catalog', 'users, products, product_variants', 'FK integrity, sku uniqueness'],
          ['Inventory', 'inventory_items', 'Stock >= 0 (row locks + trigger)'],
          ['Ordering', 'orders, order_items', 'Atomic checkout, snapshot pricing'],
          ['Payments', 'payments, payment_attempts, refunds', 'Idempotency, money exactness'],
          ['Ledger', 'ledger_entries', 'Double-entry balance checks'],
          ['Events', 'outbox_events', 'At-least-once publishing']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: the core checkout transaction',
        language: 'sql',
        code: `begin;

-- 1) Guarded stock decrement (row lock via predicate)
update inventory_items
set available_qty = available_qty - 1,
    reserved_qty = reserved_qty + 1,
    updated_at = now()
where variant_id = 'var_5501'
  and available_qty >= 1;
-- 0 rows affected => out of stock; abort with a clean error

-- 2) Order + items with price snapshot
insert into orders (id, user_id, status, subtotal, tax, total, created_at)
values ('ord_9001', 'usr_9021a', 'pending_payment', 100.00, 10.00, 110.00, now());

insert into order_items (order_id, variant_id, quantity, unit_price)
values ('ord_9001', 'var_5501', 1, 100.00);

commit;`
      },
      {
        type: 'code',
        title: '7. Medium example: idempotent checkout with ON CONFLICT',
        language: 'sql',
        code: `-- Retries must not create two orders. Gate on an idempotency key:
create table idempotency_keys (
  key text primary key,
  scope text not null,
  request_hash text not null,
  response_body jsonb,
  created_at timestamptz not null default now()
);

begin;

insert into idempotency_keys (key, scope, request_hash)
values ('checkout|usr_9021a|req_abc123', 'checkout', 'sha256...')
on conflict (key) do nothing;

-- If 0 rows inserted, this request already ran — return the stored response:
select response_body from idempotency_keys where key = 'checkout|usr_9021a|req_abc123';

-- Otherwise proceed with the checkout transaction and store the response:
-- (update idempotency_keys set response_body = ... in the same txn)`
      },
      {
        type: 'code',
        title: '8. Complex example: payments + ledger + outbox in one flow',
        language: 'sql',
        code: `begin;

-- 1) Lock the order row to serialize payment state transitions
select id from orders
where id = 'ord_9001'
for update;

-- 2) Insert payment + attempt with idempotency key
insert into payments (id, order_id, provider, status, amount, created_at)
values ('pay_8801', 'ord_9001', 'stripe', 'succeeded', 110.00, now());

insert into payment_attempts (id, payment_id, idempotency_key, status, provider_response)
values ('att_301', 'pay_8801', 'idem_987', 'succeeded', '{"charge_id": "ch_xyz"}'::jsonb);

-- 3) Double-entry ledger — both legs in the SAME transaction
insert into ledger_entries (payment_id, account, direction, amount)
values ('pay_8801', 'customer_balance', 'debit', 110.00),
       ('pay_8801', 'revenue', 'credit', 110.00);

-- 4) Event for downstream systems — same transaction (outbox)
insert into outbox_events (aggregate_type, aggregate_id, event_type, payload)
values ('order', 'ord_9001', 'OrderPaid', '{"order_id": "ord_9001", "amount": 110.00}');

commit;

-- Post-commit: the outbox relay publishes OrderPaid (see Outbox Pattern).`
      },
      {
        type: 'callout',
        title: 'The design decisions to defend in an interview',
        body: '1) Idempotency keys prevent double-charging on retries. 2) SELECT FOR UPDATE serializes payment transitions. 3) numeric(12,2) everywhere — never float. 4) Ledger is append-only: refunds are new entries, not edits. 5) Outbox keeps events transactional. 6) Inventory decrement is guarded by the WHERE predicate, so the row lock is free. 7) Soft delete (deleted_at) for users, hard FK RESTRICT for money tables.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: what makes each guarantee hold',
        body: [
          'Atomicity: one XID, one WAL commit record — all six writes commit or none. Idempotency: the unique index on idempotency_keys.key is enforced by the index probe during INSERT, so concurrent retries serialize. Inventory: UPDATE ... WHERE available_qty >= 1 is atomic per row — the row lock prevents two decrements racing. Ledger balance: CHECK constraints + a materialized view or query validating sum(debit)=sum(credit) per payment. Durability: every COMMIT forces WAL fsync; the outbox row is in the same commit record as the payment.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Checking stock in a separate SELECT', 'Race between check and decrement oversells', 'Guarded UPDATE with row lock'],
          ['Float for money anywhere', 'Rounding drift corrupts payments', 'numeric(12,2) everywhere'],
          ['No idempotency on payment retries', 'Double charges', 'idempotency_keys + unique index'],
          ['Publishing events after commit', 'Lost events on failure', 'Outbox in the same transaction'],
          ['Mutable ledger entries', 'Refunds rewrite history; audits lie', 'Append-only ledger; refunds are new entries']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Run checkout at READ COMMITTED with explicit row locks (predictable) — not Serializable (retry storms).',
          'Keep the transaction small: no external calls inside it; all side effects go through the outbox.',
          'Partition orders by created_at when they pass ~100M rows (see Partitioning Orders).',
          'Reconciliation job: nightly check sum(ledger) per payment and alert on mismatch.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Design checkout for 10k concurrent users. Answer: Idempotency keys, guarded inventory decrement in one transaction, exact decimal money, append-only ledger, outbox for events, order partitioning, read replicas for reporting.',
          'Question: How do you prevent double-charging on network retries? Answer: An idempotency key table with a unique index, inserted in the same transaction as the payment; duplicate retries hit the unique violation and return the stored response.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Implement the full checkout flow and simulate a retry (ON CONFLICT path).',
          '2. Break it: run two concurrent checkouts for the last unit of stock.',
          '3. Write the nightly reconciliation query for the ledger.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'This course: Transactions & Locking, Scaling, Outbox, CDC pages',
          'Kleppmann: "Designing Data-Intensive Applications" (transactions + stream processing)'
        ]
      }
    ]
  }
];
