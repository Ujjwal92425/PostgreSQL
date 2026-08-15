import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const foundationsNotes: NotePage[] = [
  {
    topicId: '00-foundations',
    slug: 'database-mental-model',
    title: 'Database Mental Model',
    description: 'Understand what a database does before thinking about SQL syntax. Learn how PostgreSQL guarantees durability and consistency under high concurrency.',
    level: 'Beginner',
    readingTime: '22 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what is a database',
        body: [
          'A database is a durable, organized storage engine where applications store facts they need to read and update later. PostgreSQL is an enterprise-grade Relational Database Management System (RDBMS) designed to protect those facts while thousands of users read and write simultaneously.',
          'What it does: it accepts structured commands (SQL), validates every change against rules you declare (constraints), isolates concurrent readers and writers from each other, and survives sudden power loss or crashes without losing committed data.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'If you skip building a mental model, every SQL query looks like magic and every production incident (lost data, duplicate rows, races) becomes a mystery. The model explains why a SELECT is fast, why two transactions can both succeed but one sees stale data, and why a committed write survives a crash. Everything else in this course (indexing, locking, MVCC, replication) is a refinement of this model.'
        ]
      },
      {
        type: 'list',
        title: '3. Mental model',
        items: [
          'Think of PostgreSQL as a shared ledger governed by strict mathematical laws: every table defines a rigid shape, every change is validated by rules (constraints), concurrent edits are isolated from each other, and approved edits survive sudden hardware crashes.',
          'The database never "remembers" things the way an app cache does â€” every query is answered from disk pages that are cached in memory.',
          'A table is a box of rows; a row is one fact; a column is one attribute of that fact; an index is a separate lookup shortcut; a transaction is a "commit everything or nothing" boundary.'
        ]
      },
      {
        type: 'table',
        title: '4. Core vocabulary breakdown',
        headers: ['Term', 'Definition', 'Where you will meet it again'],
        rows: [
          ['Table', 'A named relation of rows with a fixed schema definition.', 'Every SQL example in this course'],
          ['Row (Tuple)', 'A single record of data, such as a user, order, or seat reservation.', 'Joins, updates, deletes'],
          ['Column', 'An attribute on a tuple, enforced by a specific PostgreSQL data type.', 'Data types, constraints'],
          ['Constraint', 'An invariant enforced at the storage engine level (e.g. UNIQUE, NOT NULL, FOREIGN KEY, CHECK).', 'Schema design, security'],
          ['Transaction', 'A boundary surrounding one or more SQL commands that succeed completely or roll back entirely.', 'Transactions & locking topic'],
          ['Write-Ahead Log (WAL)', 'An append-only log on disk ensuring crash recovery and ACID durability.', 'Backup & recovery, replication']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: create a table, write a row, read it back',
        language: 'sql',
        code: `create table users (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

insert into users (email, full_name) values
  ('maya@example.com', 'Maya Chen'),
  ('sam@example.com', 'Sam Patel');

select id, email, created_at from users order by created_at;`
      },
      {
        type: 'table',
        title: '7. Output of the basic example',
        headers: ['id', 'email', 'created_at'],
        rows: [
          ['a1b2c3d4-0001', 'maya@example.com', '2026-08-01 09:12:33+00'],
          ['a1b2c3d4-0002', 'sam@example.com', '2026-08-01 09:12:33+00']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: reporting across two tables',
        language: 'sql',
        code: `select
  u.id as user_id,
  u.email,
  count(o.id) as total_orders,
  coalesce(sum(o.total), 0.00) as lifetime_value,
  max(o.created_at) as last_order_at
from users u
left join orders o on o.user_id = u.id
where u.deleted_at is null
group by u.id, u.email
order by lifetime_value desc
limit 10;`
      },
      {
        type: 'table',
        title: '9. Output of the medium example',
        headers: ['user_id', 'email', 'total_orders', 'lifetime_value', 'last_order_at'],
        rows: [
          ['usr_9021a', 'maya@example.com', '18', '4219.70', '2026-08-01 14:32:00+00'],
          ['usr_8192b', 'sam@example.com', '7', '839.20', '2026-07-28 09:15:40+00'],
          ['usr_3301c', 'lee@example.com', '0', '0.00', 'NULL']
        ]
      },
      {
        type: 'code',
        title: '10. Complex example: multi-step write inside a transaction',
        language: 'sql',
        code: `begin;

update inventory_items
set available_qty = available_qty - 1,
    reserved_qty = reserved_qty + 1,
    updated_at = now()
where variant_id = 'var_5501' and available_qty >= 1;

insert into orders (id, user_id, status, subtotal, tax, total, created_at)
values ('ord_9001', 'usr_9021a', 'paid', 100.00, 10.00, 110.00, now());

insert into outbox_events (aggregate_type, aggregate_id, event_type, payload)
values ('order', 'ord_9001', 'OrderPlaced', '{"order_id": "ord_9001", "total": 110.00}');

commit;`
      },
      {
        type: 'callout',
        title: 'What makes the complex example safe',
        body: 'All three statements are atomic: if any one fails (e.g. stock check fails on the UPDATE), the whole batch rolls back and no partial order exists. Only after COMMIT does PostgreSQL force the WAL to disk, guaranteeing the order survives a power cut.'
      },
      {
        type: 'paragraph',
        title: '11. PostgreSQL internals: how the engine executes this',
        body: [
          'When a SELECT query is executed, PostgreSQL parses the text into an Abstract Syntax Tree (AST), rewrites rule definitions, and passes it to the Optimizer (Planner). The Planner evaluates statistics stored in pg_statistic, then chooses a Sequential Scan or Index Scan, a join strategy (Nested Loop, Hash, Merge), an aggregation strategy, and a sort method.',
          'For writes, PostgreSQL appends new row versions and writes an XLOG record to the WAL buffer, which is flushed to disk at COMMIT (fsync). Reads are answered from the shared buffer cache; pages evicted to disk are loaded on demand.'
        ]
      },
      {
        type: 'table',
        title: '12. Common mistakes & anti-patterns',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Using INNER JOIN when reporting user metrics', 'Silently excludes users who have placed 0 orders', 'Use LEFT JOIN with COALESCE(sum(...), 0)'],
          ['Relying on application code for data integrity', 'Race conditions lead to duplicate emails or negative balances', 'Enforce integrity at DB level with UNIQUE and CHECK constraints'],
          ['Selecting SELECT * in high-throughput APIs', 'Transfers unused columns and breaks covering index optimizations', 'Explicitly select required column names'],
          ['Forgetting BEGIN before multiple writes', 'Each statement auto-commits, so a mid-way failure leaves partial state', 'Wrap related writes in one explicit transaction']
        ]
      },
      {
        type: 'table',
        title: '13. Production considerations: architecture trade-offs',
        headers: ['Design choice', 'Advantages', 'Disadvantages'],
        rows: [
          ['Strict schema constraints', 'Absolute data correctness; zero corrupt rows', 'Schema migrations require careful planning'],
          ['Normalized tables', 'Eliminates redundant data; easy updates', 'Requires JOINs for multi-entity reporting'],
          ['ACID compliance', 'Crash safety and transaction isolation', 'Slight write latency due to disk fsync']
        ]
      },
      {
        type: 'list',
        title: '14. Interview angle',
        items: [
          'Question: What happens internally when PostgreSQL crashes during a multi-table write? Answer: PostgreSQL replays the Write-Ahead Log (WAL) up to the last committed LSN during startup. Uncommitted transactions are automatically rolled back.',
          'Question: Why is COALESCE important when aggregating LEFT JOINed tables? Answer: If a left record has zero joined right records, SUM returns NULL; COALESCE converts NULL to 0.00.'
        ]
      },
      {
        type: 'list',
        title: '15. Practice tasks',
        items: [
          '1. Execute the basic example and verify that users appear with generated UUIDs.',
          '2. Execute the medium query and verify that users with 0 orders appear with lifetime_value = 0.00.',
          '3. Add a HAVING clause to filter only users with lifetime_value > 500.00.',
          '4. Run the transaction example, then run it again after dropping the outbox_events table to observe a rollback.'
        ]
      },
      {
        type: 'list',
        title: '16. Further reading',
        items: [
          'PostgreSQL docs: "Concepts - Database" and "Write-Ahead Logging"',
          'PostgreSQL source comment: src/backend/access/transam/README',
          'This topic next: DBMS vs RDBMS vs NoSQL'
        ]
      }
    ]
  },
  {
    topicId: '00-foundations',
    slug: 'dbms-rdbms-nosql',
    title: 'DBMS vs RDBMS vs NoSQL',
    description: 'Choose the right storage paradigm by comparing relational consistency, document flexibility, and key-value latency.',
    level: 'Beginner',
    readingTime: '24 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what these terms mean',
        body: [
          'A DBMS is software for storing and retrieving structured data. An RDBMS enforces relational tables linked by foreign key constraints. NoSQL databases trade relational JOINs and schema enforcement for high write velocity or key-value simplicity.',
          'What PostgreSQL is: a hybrid Object-Relational Database (ORDBMS). It combines full RDBMS ACID guarantees with document store capabilities (JSONB, GIN indexes) and key-value lookups.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'The choice of database paradigm determines the consistency you can promise users, the complexity of your application code (who does the joins?), and your operational burden. Understanding where PostgreSQL fits lets you defend its use â€” or pick a NoSQL store with concrete reasons â€” in architecture discussions.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Picture a filing cabinet (RDBMS): every drawer has labeled folders with the same form inside, and cross-references between drawers are enforced by rules. NoSQL is a pile of self-contained notebooks: fast to write, but any cross-notebook question requires you to walk between notebooks yourself. PostgreSQL is the filing cabinet that also lets you stuff a JSON blob into a drawer when you need flexibility.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: database model comparison',
        headers: ['Model', 'Data structure', 'Best use cases', 'Key risks'],
        rows: [
          ['RDBMS (PostgreSQL)', 'Relational tables & foreign keys', 'Orders, ledgers, accounts, reservations', 'Complex DDL migrations at scale'],
          ['Document DB (MongoDB)', 'JSON/BSON documents', 'Unstructured metadata, CMS content', 'App-side joins, eventual inconsistency'],
          ['Key-Value (Redis)', 'Hash maps & memory cache', 'Session store, real-time rate limiting', 'No ad-hoc querying, memory bound'],
          ['Graph (Neo4j)', 'Nodes, edges, & properties', 'Social networks, fraud graphs', 'Overkill for standard transactional OLTP']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: the same fact modeled relationally vs as a document',
        language: 'sql',
        code: `-- Relational: one attribute per column, joined at query time
select p.name, pv.sku, pv.attributes
from products p
join product_variants pv on pv.product_id = p.id
where p.id = 'prd_1001';

-- Document style (inside PostgreSQL): the same variant as a JSONB value
select metadata->'variants' as variant_docs
from products
where id = 'prd_1001';`
      },
      {
        type: 'table',
        title: '7. Output of the basic example',
        headers: ['name', 'sku', 'attributes'],
        rows: [
          ['Ergonomic Chair', 'CHAIR-01-BLACK', '{"color": "Black", "size": "Large"}'],
          ['Ergonomic Chair', 'CHAIR-01-GREY', '{"color": "Grey", "size": "Medium"}']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: querying nested JSONB attributes',
        language: 'sql',
        code: `select id, sku, name, metadata
from products
where metadata @> '{"is_featured": true}'
  and metadata->'dimensions'->>'weight_kg'::numeric < 20;`
      },
      {
        type: 'code',
        title: '9. Complex example: relational + JSONB + aggregates in one query',
        language: 'sql',
        code: `select
  p.id as product_id,
  p.name,
  p.sku,
  p.metadata->>'brand' as brand,
  p.metadata->'dimensions'->>'weight_kg' as weight_kg,
  coalesce(sum(inv.available_qty), 0) as total_stock
from products p
left join product_variants pv on pv.product_id = p.id
left join inventory_items inv on inv.variant_id = pv.id
where p.metadata @> '{"is_featured": true}'
group by p.id, p.name, p.sku, p.metadata;`
      },
      {
        type: 'table',
        title: '10. Output of the complex example',
        headers: ['product_id', 'name', 'sku', 'brand', 'weight_kg', 'total_stock'],
        rows: [
          ['prd_1001', 'Ergonomic Chair', 'CHAIR-01', 'HermanMiller', '18.5', '142'],
          ['prd_1002', 'Mechanical Keyboard', 'KEY-44', 'Keychron', '1.2', '89']
        ]
      },
      {
        type: 'paragraph',
        title: '11. PostgreSQL internals: how JSONB is stored and searched',
        body: [
          'JSONB is not text: PostgreSQL parses JSON into a binary tree (sorted keys, whitespace stripped, duplicates removed) that can be indexed with a GIN inverted index. A containment query like metadata @> {...} can therefore be answered by index lookups instead of scanning every row. This is the same trick document databases use, inside a relational engine.'
        ]
      },
      {
        type: 'table',
        title: '12. Common anti-patterns',
        headers: ['Anti-pattern', 'Consequence', 'Fix'],
        rows: [
          ['Storing whole entities in single JSON blobs', 'Cannot enforce foreign keys or partial updates safely', 'Normalize core identifiers; use JSONB only for dynamic attributes'],
          ['Simulating relational joins in NoSQL application code', 'N+1 query cascades and network latency', 'Use PostgreSQL SQL joins'],
          ['Storing JSON as the "text" type', 'No indexing, no containment operators, no validation', 'Always use JSONB, not JSON or text']
        ]
      },
      {
        type: 'callout',
        title: '13. Production consideration',
        body: 'PostgreSQL allows you to start with flexible JSONB columns for fast prototyping, and later extract stabilized JSON attributes into normalized relational columns without changing database engines. This makes "schema-later" NoSQL-style development possible without abandoning ACID.'
      },
      {
        type: 'list',
        title: '14. Interview angle',
        items: [
          'Question: When would you recommend MongoDB over PostgreSQL? Answer: Rarely for core business transactions. MongoDB excels when documents are fully self-contained with zero cross-document relationships.',
          'Question: Can PostgreSQL handle NoSQL document query patterns efficiently? Answer: Yes, using JSONB with GIN indexes, PostgreSQL queries nested JSON in sub-millisecond times.'
        ]
      },
      {
        type: 'list',
        title: '15. Practice tasks',
        items: [
          '1. Create a products row with a nested metadata document and query it with @>.',
          '2. Convert one nested attribute (e.g. brand) into a real column via ALTER TABLE and backfill it.',
          '3. Compare EXPLAIN output for a metadata filter with and without a GIN index.'
        ]
      },
      {
        type: 'list',
        title: '16. Further reading',
        items: [
          'PostgreSQL docs: "JSON Types" and "jsonb Indexing"',
          'This topic next: ACID, CAP, OLTP, OLAP'
        ]
      }
    ]
  },
  {
    topicId: '00-foundations',
    slug: 'acid-cap-oltp-olap',
    title: 'ACID, CAP, OLTP, and OLAP',
    description: 'The fundamental vocabulary behind transactional safety, distributed tradeoffs, and analytical workload design.',
    level: 'Intermediate',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what these acronyms mean',
        body: [
          'ACID describes transactional safety guarantees. CAP describes distributed system tradeoffs during network partitions. OLTP (Online Transaction Processing) refers to rapid, point reads and writes. OLAP (Online Analytical Processing) refers to scanning large datasets to compute aggregate metrics.',
          'PostgreSQL is primarily an OLTP database engineered for ACID compliance, but supports analytical windowing and partitioning for hybrid reporting.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Every backend engineer eventually faces a data loss or double-write bug. ACID is the contract that prevents them; CAP is the reason distributed systems sacrifice one guarantee; OLTP vs OLAP explains why your reporting query is slow on the transactional database. These are the four most-asked vocabulary items in database interviews.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Think of ACID as the rules of a bank vault: either the whole deposit goes in (Atomicity), the ledger stays balanced (Consistency), tellers do not see each other\'s half-finished work (Isolation), and once the receipt prints, the money is there even after a power outage (Durability). CAP is the rule that during a network cut, you must choose between serving stale data and stopping entirely.'
        ]
      },
      {
        type: 'list',
        title: '4. Core concept breakdown: the ACID letter-by-letter',
        items: [
          'Atomicity: All operations in a transaction commit together or roll back completely.',
          'Consistency: Transactions move the database from one valid schema state to another, satisfying all constraints.',
          'Isolation: Concurrent transactions execute without interfering with one another (preventing dirty reads or lost updates).',
          'Durability: Committed transactions are permanently saved in the Write-Ahead Log (WAL).'
        ]
      },
      {
        type: 'table',
        title: '5. OLTP vs OLAP comparison',
        headers: ['Dimension', 'OLTP', 'OLAP'],
        rows: [
          ['Query pattern', 'Single row updates, point index lookups', 'Full table scans, multi-million row aggregations'],
          ['Latency expectation', '1ms - 20ms', '100ms - 10s'],
          ['Data freshness', 'Real-time strictly consistent', 'Slightly delayed (ETL/Data Warehouse)'],
          ['PostgreSQL optimization', 'B-tree indexes, connection pooling, row locks', 'Partitioning, BRIN indexes, parallel queries']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '7. Basic example: a single atomic statement',
        language: 'sql',
        code: `-- Atomicity in its smallest form: one statement either fully applies or not
update inventory_items
set available_qty = available_qty - 1,
    updated_at = now()
where variant_id = 'var_5501' and available_qty >= 1;

-- Check the result
select variant_id, available_qty, reserved_qty from inventory_items where variant_id = 'var_5501';`
      },
      {
        type: 'table',
        title: '8. Output of the basic example',
        headers: ['variant_id', 'available_qty', 'reserved_qty'],
        rows: [
          ['var_5501', '42', '8']
        ]
      },
      {
        type: 'code',
        title: '9. Medium example: the atomic checkout transaction',
        language: 'sql',
        code: `begin;

-- Step 1: Create order record
insert into orders (id, user_id, status, subtotal, tax, total, created_at)
values ('ord_9001', 'usr_9021a', 'pending_payment', 100.00, 10.00, 110.00, now());

-- Step 2: Reserve inventory (guarded by the available_qty >= 1 predicate)
update inventory_items
set available_qty = available_qty - 1,
    reserved_qty = reserved_qty + 1,
    updated_at = now()
where variant_id = 'var_5501'
  and available_qty >= 1;

-- Step 3: Record payment attempt
insert into payment_attempts (id, payment_id, idempotency_key, status)
values ('att_301', 'pay_8801', 'idemp_key_9921', 'created');

commit;`
      },
      {
        type: 'code',
        title: '10. Complex example: isolation + rollback with SAVEPOINT',
        language: 'sql',
        code: `begin;

-- Buyer A and Buyer B both run this concurrently
select id from seats
where id = 'seat_b7' and event_id = 'evt_1001'
for update;  -- row lock: the second buyer waits here

insert into seat_reservations (id, event_id, seat_id, user_id, hold_id)
values (gen_random_uuid(), 'evt_1001', 'seat_b7', 'usr_9021a', 'hold_7712');

savepoint before_email;

-- Simulated failure inside the transaction (e.g. email provider down)
select 1/0;  -- would raise division_by_zero

rollback to savepoint before_email;
commit;  -- seat reservation survives, failed step is undone`
      },
      {
        type: 'callout',
        title: 'What the complex example proves',
        body: 'Isolation: the SELECT ... FOR UPDATE blocks the second buyer until the first commits. Atomicity with partial success: SAVEPOINT lets you undo only the failed step while keeping the rest of the transaction. Durability: only the final COMMIT writes the WAL record that survives a crash.'
      },
      {
        type: 'paragraph',
        title: '11. PostgreSQL internals: how ACID is actually enforced',
        body: [
          'Atomicity: every statement within BEGIN...COMMIT shares one transaction ID; the WAL only marks it committed after all changes are flushed. Consistency: constraints (CHECK, UNIQUE, FK) are evaluated inside the executor, not by the application. Isolation: MVCC gives each transaction a snapshot; row locks serialize conflicting writes. Durability: COMMIT returns only after WAL fsync (controlled by synchronous_commit and fsync settings).'
        ]
      },
      {
        type: 'callout',
        title: '12. CAP theorem clarification',
        body: 'PostgreSQL single-node or primary-replica setups prioritize Consistency and Partition Tolerance (CP) over AP. Reads on async replicas trade consistency for immediate availability.'
      },
      {
        type: 'table',
        title: '13. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Running reporting queries on the OLTP primary', 'Full scans steal CPU and lock rows from checkout traffic', 'Route OLAP to a read replica or a data warehouse'],
          ['Confusing Consistency (ACID) with Availability (CAP)', 'Leads to wrong claims about replica reads', 'Remember: ACID consistency is per-database; CAP is per-distributed-system'],
          ['Setting autocommit ON for multi-step workflows', 'A crash mid-workflow leaves partial state', 'Always BEGIN...COMMIT multi-statement logic']
        ]
      },
      {
        type: 'list',
        title: '14. Interview angle',
        items: [
          'Question: Explain CAP using PostgreSQL as an example. Answer: In a partition, a primary-replica PostgreSQL deployment picks CP: the primary keeps accepting writes (consistency), replicas stay available for reads but may serve stale data, and cross-zone writes are blocked until the partition heals.',
          'Question: Is OLAP possible in PostgreSQL? Answer: Yes â€” partitioning, BRIN indexes, parallel query, and window functions support hybrid workloads, but dedicated warehouses win at petabytes and multi-tenant isolation.'
        ]
      },
      {
        type: 'list',
        title: '15. Practice tasks',
        items: [
          '1. Open two psql sessions, run the seat reservation transaction in both, and observe one blocking the other.',
          '2. Insert a failure (1/0) after a SAVEPOINT and verify ROLLBACK TO preserves prior work.',
          '3. Check synchronous_commit in your instance and measure write latency with it on vs off.'
        ]
      },
      {
        type: 'list',
        title: '16. Further reading',
        items: [
          'PostgreSQL docs: "Transaction Isolation" and "WAL Configuration"',
          'This topic next: Keys and Relationships'
        ]
      }
    ]
  },
  {
    topicId: '00-foundations',
    slug: 'keys-and-relationships',
    title: 'Keys and Relationships',
    description: 'Master primary, foreign, natural, surrogate, composite, and candidate keys using production e-commerce tables.',
    level: 'Intermediate',
    readingTime: '24 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what keys are',
        body: [
          'Keys are unique identifiers used by the PostgreSQL storage engine to locate tuples quickly and preserve entity relationships across tables. A Primary Key identifies each row; a Foreign Key references a Primary Key in another table; a Composite Key combines several columns into one identity.',
          'What they do: keys power index lookups (PK creates an index automatically), enforce referential integrity, and model one-to-one, one-to-many, and many-to-many relationships.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Choosing the right key strategy prevents data corruption, duplicate rows, and update anomalies. Getting it wrong means you cannot answer "which orders belong to this user?" without scanning the whole table, or you get two seat reservations for the same seat.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'A Primary Key is the row\'s passport number: unique, always present, and printed on every reference. A Foreign Key is the customs stamp that checks the passport exists before letting the reference through. A Composite Key is a pair of details (passport + flight) that is only unique together.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: key types',
        headers: ['Key type', 'Definition', 'Production example'],
        rows: [
          ['Primary Key', 'Unique non-null identifier for a row', 'users.id (UUID v4 or v7)'],
          ['Foreign Key', 'Reference enforcing referential integrity', 'orders.user_id -> users.id'],
          ['Natural Key', 'Real-world unique attribute', 'users.email or products.sku'],
          ['Surrogate Key', 'System-generated unique identifier', 'auto-incrementing bigint ID'],
          ['Composite Key', 'Key composed of multiple columns', 'unique(event_id, seat_id)'],
          ['Candidate Key', 'Any minimal set of columns that could serve as the PK', 'email and id in users']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: PK, FK, and UNIQUE syntax',
        language: 'sql',
        code: `create table users (
  id uuid primary key default gen_random_uuid(),          -- primary key
  email citext unique not null                             -- candidate key (natural)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),              -- foreign key
  total numeric(12,2) not null
);

-- Many-to-many junction table with a composite primary key
create table user_roles (
  user_id uuid not null references users(id),
  role_id uuid not null references roles(id),
  primary key (user_id, role_id)                          -- composite key
);`
      },
      {
        type: 'code',
        title: '7. Medium example: composite uniqueness for one-reservation-per-seat',
        language: 'sql',
        code: `create table seat_reservations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  seat_id uuid not null references seats(id),
  user_id uuid not null references users(id),
  hold_id uuid references seat_holds(id),
  created_at timestamptz not null default now(),
  constraint seat_reservations_one_per_event unique (event_id, seat_id)
);

-- This fails with duplicate key violation if seat_b7 already booked
insert into seat_reservations (id, event_id, seat_id, user_id)
values (gen_random_uuid(), 'evt_1001', 'seat_b7', 'usr_9021a');`
      },
      {
        type: 'code',
        title: '8. Complex example: FK ON DELETE behavior + orphan prevention',
        language: 'sql',
        code: `-- Variant 1: cascade (delete order => delete its items)
alter table order_items
add constraint fk_order_items_order
foreign key (order_id) references orders(id) on delete cascade;

-- Variant 2: restrict (block deleting users with orders)
alter table orders
add constraint fk_orders_user
foreign key (user_id) references users(id) on delete restrict;

-- Variant 3: set null (keep shipment history, drop the user reference)
alter table shipments
add constraint fk_shipments_user
foreign key (user_id) references users(id) on delete set null;

-- Trying to delete a user who has orders now fails:
delete from users where id = 'usr_9021a';
-- ERROR: update or delete on table "users" violates foreign key constraint "fk_orders_user" on table "orders"`
      },
      {
        type: 'callout',
        title: 'Which ON DELETE rule to pick',
        body: 'Use CASCADE only for child tables that have no meaning without the parent (order_items). Use RESTRICT for business-critical parents (users, products). Use SET NULL for optional history (shipments). Never mix: deleting a parent should have one predictable outcome per relationship.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: what a key creates under the hood',
        body: [
          'A PRIMARY KEY creates a unique B-tree index immediately (the index name defaults to the constraint name) and a NOT NULL constraint. A FOREIGN KEY does not create an index automatically â€” a missing index on the referencing column is a classic production cause of slow DELETEs on the parent table, because PostgreSQL must check every child row. UNIQUE constraints also create unique indexes, which the planner can use for lookups and join candidates.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['UUID v4 as PK in hot tables', 'Random inserts fragment the B-tree and hurt cache locality', 'Use UUID v7 (time-ordered) or bigint identity'],
          ['Missing index on FK column', 'Every parent DELETE triggers a full scan of the child table', 'Create an index on every referencing FK column'],
          ['Using ON DELETE CASCADE on business parents', 'One DELETE silently removes orders, payments, and audit rows', 'Use RESTRICT and delete through explicit workflows'],
          ['Composite key with a unique first column', 'Wastes an index and invites duplicate semantics', 'Drop the redundant composite; keep the single-column unique']
        ]
      },
      {
        type: 'callout',
        title: '11. Production consideration: UUID v4 vs UUID v7',
        body: 'UUID v4 is randomly generated, causing B-tree index fragmentation under heavy writes. UUID v7 includes a time prefix, ensuring sequential B-tree insertions and fast page lookups.'
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Natural key or surrogate key? Answer: Surrogate PKs are stable (emails change), but add a UNIQUE constraint on the natural key so it remains a candidate and stays queryable.',
          'Question: Why does deleting a parent row get slow as the child table grows? Answer: PostgreSQL checks FK references; without an index on the child FK column each delete scans the child. Create the index.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Create users, orders, and user_roles with the syntax above and insert rows.',
          '2. Try deleting a user with orders under RESTRICT, then under SET NULL.',
          '3. Check pg_indexes to see which indexes were auto-created for PK/UNIQUE constraints.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Constraints" and "Foreign Keys"',
          'This topic next: SQL Command Families (DDL, DML, DQL, DCL, TCL)'
        ]
      }
    ]
  }
];
