import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const scalingNotes: NotePage[] = [
  {
    topicId: '10-scaling-replication',
    slug: 'partitioning-orders',
    title: 'Partitioning Orders',
    description: 'What partitioning is, why you need it, and how to implement declarative Range, List, and Hash partitioning for high-volume order tables.',
    level: 'Production',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what partitioning is',
        body: [
          'Declarative Table Partitioning divides one logically massive table into smaller physical partition sub-tables on disk based on a partition key (e.g. created_at). Queries filtering on the partition key benefit from automatic Partition Pruning.',
          'What it does: the parent (partitioned) table has no storage of its own; every row lands in exactly one child partition, and the planner skips whole partitions when the key is filtered.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need it',
        body: [
          'Three scaling pain points drive partitioning: (1) deletes of old data are slow and bloat the table — with partitions you DROP a month in milliseconds; (2) autovacuum must scan a 2TB table to clean a week of churn; (3) index size and cache efficiency degrade. Partitioning turns "maintain one monster" into "maintain many small, droppable, independently vacuumable pieces".'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'One big ledger book vs a shelf of monthly ledgers. A query for August opens only the August book (pruning). Closing a fiscal year = removing one book (DROP PARTITION), not erasing lines from one giant tome. The shelf (parent table) is just the index card telling you which book holds which month.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: partition strategies',
        headers: ['Strategy', 'Rule', 'Best for', 'Example key'],
        rows: [
          ['Range', 'Key value in [from, to)', 'Time-series, sequential data', 'orders.created_at'],
          ['List', 'Key equals one of a set', 'Regions, tenants, statuses', 'orders.region'],
          ['Hash', 'hash(key) modulo n', 'Even distribution, no natural key', 'orders.user_id']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: range-partitioned orders table',
        language: 'sql',
        code: `create table orders_partitioned (
  id uuid not null,
  user_id uuid not null,
  status text not null,
  total numeric(12,2) not null,
  created_at timestamptz not null,
  primary key (id, created_at)     -- partition key MUST be in every unique key
) partition by range (created_at);

create table orders_2026_q1 partition of orders_partitioned
  for values from ('2026-01-01 00:00:00+00') to ('2026-04-01 00:00:00+00');

create table orders_2026_q2 partition of orders_partitioned
  for values from ('2026-04-01 00:00:00+00') to ('2026-07-01 00:00:00+00');

-- Insert: transparently routed by the key
insert into orders_partitioned (id, user_id, status, total, created_at)
values (gen_random_uuid(), 'usr_9021a', 'paid', 110.00, '2026-05-01 12:00:00+00');
-- (lands in orders_2026_q2)`
      },
      {
        type: 'code',
        title: '7. Medium example: pruning in action',
        language: 'sql',
        code: `-- With the partition key filtered, the planner visits ONE partition:
explain select * from orders_partitioned
where created_at >= '2026-05-01' and created_at < '2026-05-15';
-- Output (shape):
-- Append (Subplans: 1)
--   ->  Index Scan on orders_2026_q2   <- only one partition touched

-- Without the key, ALL partitions are scanned:
explain select * from orders_partitioned where user_id = 'usr_9021a';
-- Output (shape):
-- Append (Subplans: 8)  <- every partition scanned; index per partition helps`,
      },
      {
        type: 'code',
        title: '8. Complex example: the partition lifecycle (create, swap, drop)',
        language: 'sql',
        code: `-- Monthly partitions with an automated rotation pattern:
create table orders_2026_08 partition of orders_partitioned
  for values from ('2026-08-01 00:00:00+00') to ('2026-09-01 00:00:00+00');

-- Fast bulk import: attach a pre-built table (metadata-only, no rewrite):
create table orders_2026_09_import (like orders_partitioned including all);
-- (COPY a billion rows into orders_2026_09_import here)
alter table orders_partitioned
  attach partition orders_2026_09_import
  for values from ('2026-09-01 00:00:00+00') to ('2026-10-01 00:00:00+00');

-- Retention: dropping old data is INSTANT and lock-light:
alter table orders_partitioned detach partition orders_2025_q4;
alter table orders_2025_q4 set logged;        -- optional: archive it first
drop table orders_2025_q4;                    -- or keep as archive

-- Indexes: create per partition or on the parent (inherited by new partitions):
create index on orders_partitioned (user_id, created_at);`
      },
      {
        type: 'callout',
        title: 'Partition key rules (read before designing)',
        body: 'Every UNIQUE/PRIMARY KEY must include the partition key — a global unique index across partitions is impossible. FK references TO a partitioned table are supported, but FKs FROM a partitioned table must also include the partition key. Foreign tables, updates moving rows across partitions, and row locks on the parent need care (PG11+ handles cross-partition UPDATE by delete+insert).'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how partitioning works',
        body: [
          'The parent table is a shell with relkind = p; its partitions are normal tables linked by pg_inherits. The planner performs constraint exclusion (pruning) at plan time using partition bounds, and with a parameterized key it can also prune at execution time (dynamic pruning). Inserts route via a partition-routing lookup on the bound constraints. Detach/attach are catalog-only operations (metadata) unless validation needs to scan. Partitioned tables have their own statistics, indexes, and autovacuum settings per partition.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Partition key NOT in primary key', 'CREATE TABLE fails immediately', 'Composite PK (id, created_at)'],
          ['Queries without the key filter', 'Every partition scanned — no pruning benefit', 'Always filter the key; document it'],
          ['Too many tiny partitions', 'Catalog and planner overhead exceed savings', 'Match partition width to workload (monthly/quarterly)'],
          ['Global unique index assumptions', 'UNIQUE(user_id) across partitions impossible', 'Include partition key or enforce per-partition'],
          ['Attaching partitions with bad bounds', 'Bound validation scans the whole table', 'Attach with VALIDATE or pre-check data']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Automate partition creation ahead of time (cron creates next month before midnight).',
          'Retention = DETACH + archive + DROP; keep the DROP out of the write hot path.',
          'Autovacuum runs per partition — tune on the hot partitions, not the parent.',
          'For analytics on the archive, dump detached partitions into cold storage (S3/Parquet).'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Partitioning vs indexing on created_at? Answer: Indexes speed reads but keep one giant table: vacuum, deletes, and index bloat still cost O(table). Partitioning slices the problem into droppable, independently maintainable pieces — and pruning beats index scans for range workloads.',
          'Question: Why must the partition key be part of the PK? Answer: Uniqueness can only be enforced locally per partition; a global constraint would need cross-partition coordination. So the key must appear in every unique index.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Build the range-partitioned table and verify INSERT routing with tableoid.',
          '2. Run EXPLAIN with and without the key filter and compare the Append subplans.',
          '3. Create, backfill, attach, and drop a partition — time the ATTACH on 1M rows.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Partitioning" chapter',
          'Next: Replication'
        ]
      }
    ]
  },
  {
    topicId: '10-scaling-replication',
    slug: 'replication',
    title: 'Replication',
    description: 'Master Streaming Physical Replication, Logical Replication, slot management, and replication lag.',
    level: 'Production',
    readingTime: '30 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what replication is',
        body: [
          'Replication copies Write-Ahead Log (WAL) changes from a Primary database server to one or more Read Replicas. Physical Streaming Replication copies byte-level WAL blocks (the whole cluster); Logical Replication uses publication/subscription slots to stream table-level DML events (or row diffs).',
          'What it does: physical replicas give you failover targets and read scaling of the identical data; logical replication lets you replicate subsets, between versions, or into analytics systems.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need it',
        body: [
          'A single server has three hard limits: availability (it crashes — replicas take over), read capacity (one primary saturates), and maintenance (upgrades/backups need downtime). Replication addresses all three, and knowing physical vs logical tells you which failure modes each solution handles.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Physical replication is a photocopier: it copies every byte of the ledger (WAL), including page-level details — identical books, no filtering. Logical replication is a messenger: it narrates each transaction ("order 123 was inserted with these fields") and the subscriber replays it — you can choose which books the messenger delivers and even change the binding on the subscriber.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: physical vs logical',
        headers: ['Aspect', 'Physical streaming', 'Logical'],
        rows: [
          ['Granularity', 'Whole cluster (all databases)', 'Per table / publication'],
          ['Compatibility', 'Same major version required', 'Cross-version, cross-engine possible'],
          ['Schema changes', 'Propagated automatically (same bytes)', 'Must be handled manually'],
          ['Writes on replica', 'Read-only (hot standby)', 'Subscriber can have its own writes'],
          ['Primary use', 'Failover, HA, read scaling', 'ETL, CDC, migrations, sharding, upgrade']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: physical replication configuration',
        language: 'sql',
        code: `-- PRIMARY (postgresql.conf):
wal_level = replica          -- or logical for logical replication
max_wal_senders = 10
max_replication_slots = 10

-- REPLICA:
hot_standby = on

-- Replica bootstrap (takes a full copy, then streams continuously):
-- pg_basebackup -h primary -D /var/lib/postgresql/data -R -P -X stream

-- Replica config automatically written by -R:
-- primary_conninfo = 'host=primary port=5432 user=repl'
-- standby.signal  (PG12+ marker file)

-- Verify:
select pg_is_in_recovery();          -- true on the replica
select * from pg_stat_replication;   -- primary side: sender stats + lag`
      },
      {
        type: 'code',
        title: '7. Medium example: logical replication setup',
        language: 'sql',
        code: `-- PUBLISHER:
create publication pub_orders
for table orders, order_items;

-- SUBSCRIBER:
create subscription sub_orders
connection 'host=publisher port=5432 dbname=postgres user=repl'
publication pub_orders
with (copy_data = true);

-- Verify on the subscriber:
select * from pg_stat_subscription;
select count(*) from orders;    -- rows streamed from the publisher

-- Selective: only some tables, or row-filtered (PG15+):
create publication pub_orders_paid
for table orders where (status = 'paid');`
      },
      {
        type: 'code',
        title: '8. Complex example: lag monitoring and slot hygiene',
        language: 'sql',
        code: `-- PRIMARY side — bytes of WAL not yet sent/acked per slot:
select slot_name, active, restart_lsn,
       pg_current_wal_lsn() - restart_lsn as lag_bytes
from pg_replication_slots;

-- REPLICA side — how far behind the primary:
select now() - pg_last_xact_replay_timestamp() as replay_lag
from pg_stat_wal_receiver;

-- The danger: an INACTIVE logical slot stops WAL retention on the primary:
select slot_name, active, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) as pending_bytes
from pg_replication_slots
where slot_type = 'logical';

-- Fix: drop dead slots immediately (they can wedge the disk):
select pg_drop_replication_slot('slot_never_consumed');`
      },
      {
        type: 'callout',
        title: 'Logical slots never forget — and never forgive',
        body: 'Every logical slot pins WAL from restart_lsn onward. A consumer that dies for a week means the primary accumulates a week of WAL — disk fills, primary crashes. Alert on slot lag bytes and pg_wal_size growth, and drop abandoned slots. This is the #1 replication incident in production.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: the streaming machinery',
        body: [
          'Physical: the WAL sender process reads WAL records from pg_wal and streams them over a dedicated connection; the receiver writes them and re-applies via startup process (crash-recovery-style), while hot_standby serves read queries with MVCC snapshots. Lag is measured by LSN gaps. Logical: the logical decoding plugin (pgoutput) interprets WAL records into row-level changes, respecting the publication filters, and sends them as messages; the subscriber replays through its own executor — origin tracking prevents loops (PG14+: pg_replication_origin).'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Letting logical slots go inactive', 'Unbounded WAL growth -> primary disk full', 'Monitor + drop dead slots'],
          ['Synchronous replication with bad quorum', 'Primary stalls on any replica outage', 'synchronous_standby_names with proper quorum'],
          ['Reads that expect zero lag', 'Stale data in reports on busy replicas', 'Route read-after-write to primary'],
          ['Schema changes without coordination (logical)', 'Subscriber fails to apply DDL', 'Apply DDL to subscriber first, then publisher'],
          ['Failing over without promoting cleanly', 'Split-brain: two primaries accept writes', 'Use repmgr/Patroni with fencing']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Use Patroni/repmgr for automatic failover with consensus — never manual promotion races.',
          'Monitor: replay lag, slot lag, wal sender count, and pg_wal size on the primary.',
          'Test failover drills quarterly: promote a standby, verify app reconnect and data continuity.',
          'For read-heavy OLTP, scale reads with replicas but keep write-heavy paths on the primary.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Physical vs logical replication? Answer: Physical copies WAL byte-for-byte (whole cluster, same version, read-only replica); logical decodes row-level changes (tables of your choice, cross-version, subscriber writable) — choose by HA vs data-pipeline needs.',
          'Question: How does replication lag grow and how do you bound it? Answer: Lag = WAL generated faster than the replica applies (big writes, slow replica disk, network); bound with slot alerts, replica capacity, and synchronous replication for critical paths.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Set up a physical standby with pg_basebackup and measure lag under load.',
          '2. Create a publication/subscription and watch new inserts stream.',
          '3. Deliberately let a logical slot lag, then drop it, and observe WAL size behavior.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Replication", "Logical Replication", "Streaming Replication"',
          'Next: Sharding'
        ]
      }
    ]
  },
  {
    topicId: '10-scaling-replication',
    slug: 'sharding',
    title: 'Sharding',
    description: 'Horizontal database sharding strategies, tenant routing keys, and distributed architectures.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what sharding is',
        body: [
          'Sharding partitions data horizontally across independent database instances (nodes) based on a shard key (e.g. tenant_id or user_id) when single-node compute or storage limits are exceeded.',
          'What it does: each shard holds a subset of rows and runs its own PostgreSQL; a router (or the app) decides which shard holds which row, distributing write load and storage across machines.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need it',
        body: [
          'Partitioning helps one server; sharding helps when ONE server is the ceiling — CPU, memory, or disk cannot grow (vertical limit), or you need geo-distribution and fault isolation. The cost is real: cross-shard queries become app-level joins, transactions become distributed, and every operational task (backup, schema change) multiplies by the shard count.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'A single database is one bank branch with one vault. Sharding is many branches: every customer has a home branch (shard key) where their whole file lives. Queries about one customer are fast — their branch. Queries about ALL customers ("total deposits") require visiting every branch. The vault is never full, but the ledger is no longer one book.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: sharding strategies',
        headers: ['Strategy', 'Rule', 'Good for', 'Weakness'],
        rows: [
          ['Hash sharding', 'hash(shard_key) % N', 'Even distribution, hot rows balanced', 'Range queries scatter across shards'],
          ['Range sharding', 'Key falls in [lo, hi)', 'Time series, natural ranges', 'Hot shard = newest range'],
          ['Directory sharding', 'Lookup table maps key -> shard', 'Tenants with heterogeneous size', 'Extra hop, lookup table is a SPOF'],
          ['Geo sharding', 'Key -> nearest region', 'Compliance, latency', 'Cross-region queries and conflicts']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: the routing decision at the app layer',
        language: 'sql',
        code: `-- Shard key: user_id. App computes the shard from the id, never queries blindly.
select id, email from users where id = 'usr_9021a';
-- App code:
--   shard = hash('usr_9021a') % 8        -> shard 3
--   SELECT * FROM shard3.users WHERE id = 'usr_9021a';
-- Every table that references users carries user_id as the shard key too,
-- so each ORDER of a user lives on the same shard as the user (co-location):
--   SELECT * FROM shard3.orders WHERE user_id = 'usr_9021a';`
      },
      {
        type: 'code',
        title: '7. Medium example: co-location and the single-shard query contract',
        language: 'sql',
        code: `-- DESIGN RULE: co-locate by shard key.
-- users, orders, order_items all on the SAME shard by user_id.
-- Then "user + their last 10 orders" is ONE shard-local query:

select o.id, o.total, o.created_at
from orders o
where o.user_id = 'usr_9021a'       -- shard key in the WHERE
order by o.created_at desc
limit 10;

-- Violating the rule (querying by non-key):
select * from orders where id = 'ord_9001';
-- -> must be routed by a global index, or every shard is scanned.
-- Global unique index on id + user_id is the standard escape hatch:
-- (maintain a mapping table id -> (user_id, shard) on every shard)`
      },
      {
        type: 'code',
        title: '8. Complex example: fan-out queries and two-phase-ish aggregation',
        language: 'sql',
        code: `-- A global query MUST fan out to all shards and merge results:
-- (app layer, N shards in parallel)

-- Shard 1..N, same statement:
select user_id, sum(total) as spend
from orders
where created_at >= now() - interval '30 days'
group by user_id;

-- App merges: SUM per user across shards, order, paginate.
-- Transactional consistency across shards is impossible:
-- money transfer user A (shard 1) -> user B (shard 5):
--   begin on shard1: debit A
--   begin on shard5: credit B
--   commit BOTH atomically? -> NOT possible with plain sharding.
--   Use the outbox/transactional-message pattern:
--   commit debit on shard1 + enqueue event; consumer credits shard5;
--   idempotency key on shard5 prevents double-credit.`
      },
      {
        type: 'callout',
        title: 'Resharding is the hidden tax',
        body: 'Add a shard and every hash shard key changes its mapping: hash(key) % 8 vs % 9. Choose a strategy that survives growth — consistent hashing (virtual nodes), directory sharding, or double-hash — and rehearse resharding with the "scatter-gather + double-write" pattern before you need it at 2am.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how sharding executes (and Citus)',
        body: [
          'PostgreSQL has no native sharding; the two common routes are app-layer routing (client computes shard) and Citus, an extension that turns PostgreSQL into a distributed database: it uses distributed tables with a distribution column, executes pushdown queries on the right shards, and aggregates results via coordinator nodes (repartition join for non-key joins). Foreign Data Wrappers (postgres_fdw) provide basic cross-shard reads but not transactions.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Sharding before exhausting single-node options', 'Complexity explodes; harder ops, no measurable win', 'Partition, tune, scale up first'],
          ['Queries without the shard key', 'Silent full-cluster scans', 'Enforce key-based routing at the API layer'],
          ['Global unique constraints on non-key columns', 'Impossible without coordination', 'Include shard key or mapping table'],
          ['Assuming cross-shard transactions', 'Violates CAP; partial failures corrupt money', 'Outbox + idempotent consumers'],
          ['Ignoring hot shards', 'One celebrity user thrashes one node', 'Split hot keys or directory-shard tenants']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Never shard money transfers naively — design idempotent, outbox-driven flows first.',
          'Rehearse resharding; automate shard add/remove with the double-write pattern.',
          'Keep a global (shard_key, id) routing table for point lookups by global id.',
          'Backups, monitoring, and DDL now run N times — build shard-aware tooling from day one.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Partitioning vs sharding? Answer: Partitioning splits one table within one server (pruning, droppable chunks); sharding splits data across servers for scale — different tools for different ceilings.',
          'Question: How do you handle queries that span shards? Answer: You design them out via co-location; for the remainder use fan-out queries + app-side aggregation, or Citus which coordinates automatically. Cross-shard transactions are avoided with outbox patterns.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Design the shard layout for this course\'s e-commerce schema: which tables are co-located on which key?',
          '2. Implement the fan-out aggregation in SQL against 2 simulated shard tables.',
          '3. Write the idempotency-key table DDL for cross-shard transfers.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'Citus documentation and PostgreSQL docs: "Foreign Data"',
          'Next: Backup Types'
        ]
      }
    ]
  }
];
