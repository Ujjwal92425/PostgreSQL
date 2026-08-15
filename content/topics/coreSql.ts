import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const coreSqlNotes: NotePage[] = [
  {
    topicId: '01-core-sql',
    slug: 'ddl-dml-dql-dcl-tcl',
    title: 'SQL Command Families',
    description: 'What DDL, DML, DQL, DCL, and TCL are, the exact syntax of every command in each family, and when to use them in production.',
    level: 'Beginner',
    readingTime: '30 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what the command families are',
        body: [
          'SQL commands are divided into 5 distinct command families based on their purpose: DDL defines database structure, DML mutates table rows, DQL reads data, DCL controls security permissions, and TCL manages transaction boundaries.',
          'What they do: every statement you run fits into exactly one family, and knowing which one you are using tells you whether it locks the whole table, just rows, or nothing at all â€” the first step to safe production changes.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Understanding these distinctions is essential for zero-downtime schema migrations, least-privilege security roles, and atomic business workflows. A DDL statement takes ACCESS EXCLUSIVE locks; a DML statement only takes row locks â€” confusing the two is how outages happen.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Picture a building: DDL draws and alters the blueprints (CREATE/ALTER/DROP the structure), DML moves furniture inside a room (INSERT/UPDATE/DELETE the contents), DQL looks through the windows (SELECT), DCL decides who holds keys (GRANT/REVOKE), and TCL is the "save file" or "undo" button for a whole editing session (COMMIT/ROLLBACK).'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the family reference matrix',
        headers: ['Family', 'Full form', 'Engine purpose', 'Commands', 'Lock level'],
        rows: [
          ['DDL', 'Data Definition Language', 'Defines database schemas & catalogs', 'CREATE, ALTER, DROP, TRUNCATE', 'Table-level (ACCESS EXCLUSIVE)'],
          ['DML', 'Data Manipulation Language', 'Mutates rows inside tables', 'INSERT, UPDATE, DELETE, MERGE', 'Row-level'],
          ['DQL', 'Data Query Language', 'Fetches tuples matching predicates', 'SELECT', 'None (MVCC snapshot)'],
          ['DCL', 'Data Control Language', 'Manages permissions & access roles', 'GRANT, REVOKE', 'Catalog rows'],
          ['TCL', 'Transaction Control Language', 'Controls transaction boundaries & WAL', 'BEGIN, COMMIT, ROLLBACK, SAVEPOINT', 'Depends on statements inside']
        ]
      },
      {
        type: 'code',
        title: '5. Schema used in this page',
        language: 'sql',
        code: schemaSql
      },
      {
        type: 'code',
        title: '6. DDL syntax reference: CREATE, ALTER, DROP, TRUNCATE',
        language: 'sql',
        code: `-- CREATE: define new structure
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);

-- ALTER: change existing structure
alter table orders add column coupon_id uuid references coupons(id);
alter table orders alter column coupon_id set default gen_random_uuid();
alter table orders rename column coupon_id to discount_coupon_id;

-- DROP: remove structure (cascade destroys dependents)
drop table coupons;

-- TRUNCATE: remove ALL rows instantly (DDL-level, cannot be filtered, takes table lock)
truncate table cart_items;`
      },
      {
        type: 'code',
        title: '7. DML syntax reference: INSERT, UPDATE, DELETE, MERGE',
        language: 'sql',
        code: `-- INSERT: add rows
insert into coupons (code, discount_percent, starts_at, ends_at)
values ('WELCOME10', 10.00, now(), now() + interval '30 days');

-- INSERT ... ON CONFLICT: upsert
insert into coupons (code, discount_percent, starts_at, ends_at)
values ('WELCOME10', 15.00, now(), now() + interval '30 days')
on conflict (code) do update set discount_percent = excluded.discount_percent;

-- UPDATE: change existing rows
update coupons set is_active = false
where ends_at < now();

-- DELETE: remove rows (filterable; only marked rows die)
delete from coupons where code = 'EXPIRED99';

-- MERGE (PG 15+): atomically insert/update/delete based on match
merge into inventory_items t
using (values ('var_5501', 50)) as s(variant_id, new_qty)
on t.variant_id = s.variant_id
when matched then update set available_qty = s.new_qty, updated_at = now()
when not matched then insert (variant_id, available_qty, reserved_qty, updated_at)
  values (s.variant_id, s.new_qty, 0, now());`
      },
      {
        type: 'code',
        title: '8. DQL + DCL + TCL syntax reference',
        language: 'sql',
        code: `-- DQL: read data
select code, discount_percent
from coupons
where is_active and starts_at <= now()
order by discount_percent desc;

-- DCL: permissions
create role app_writer;
grant usage on schema public to app_writer;
grant select, insert, update on orders, order_items, payments to app_writer;
revoke delete on orders from app_writer;

-- TCL: transaction boundaries
begin;
  update inventory_items set available_qty = available_qty - 1
  where variant_id = 'v1' and available_qty >= 1;
  insert into orders (id, user_id, status, subtotal, tax, total)
  values ('o100', 'u1', 'paid', 100, 10, 110);
commit;`
      },
      {
        type: 'table',
        title: '9. Example output: the DQL above',
        headers: ['code', 'discount_percent'],
        rows: [
          ['WELCOME10', '10.00'],
          ['SAVE20', '20.00'],
          ['FIRSTORDER', '5.00']
        ]
      },
      {
        type: 'code',
        title: '10. Complex example: schema change safely (DDL + TCL together)',
        language: 'sql',
        code: `-- Production-safe pattern: add a column as nullable, backfill, then tighten
begin;
alter table orders add column coupon_code text;

update orders o
set coupon_code = c.code
from coupons c
where c.id = o.coupon_id;

alter table orders alter column coupon_code set not null;
commit;

-- Rollback strategy if the backfill is too slow:
-- rollback;  -- the whole migration is undone, zero residual damage`
      },
      {
        type: 'callout',
        title: 'DDL is transactional in PostgreSQL',
        body: 'Unlike MySQL, PostgreSQL wraps DDL in transactions: a failed ALTER TABLE can be rolled back. But TRUNCATE and ALTER still take ACCESS EXCLUSIVE table locks â€” they block all reads and writes on that table until they finish, which is why they run during maintenance windows or via expand/contract migrations.'
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['ALTER TABLE ADD COLUMN NOT NULL on a big table', 'Scans the whole table under ACCESS EXCLUSIVE lock -> outage', 'Add as NULL, backfill in batches, then SET NOT NULL'],
          ['DELETE vs TRUNCATE on an entire table', 'DELETE creates millions of dead tuples and bloats the table', 'Use TRUNCATE when removing all rows, or partition DROP'],
          ['Granting DELETE to writer roles by default', 'Accidental mass deletes in production', 'REVOKE delete; delete through a procedure'],
          ['No BEGIN/COMMIT around multi-step migrations', 'A crash mid-migration leaves partial schema', 'Wrap DDL batches in a transaction']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Run DDL during low-traffic windows or use NOT VALID + VALIDATE CONSTRAINT for big tables.',
          'Test every DDL on a staging copy of production data first â€” ALTER TABLE plans vary with table size.',
          'Monitor lock waits (pg_locks, pg_stat_activity) during DDL to catch blocking sessions.',
          'Least-privilege: app roles should have DML only; DDL belongs to migration runners and DBAs.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: What is the difference between DELETE and TRUNCATE? Answer: DELETE is DML (row locks, filters, triggers, MVCC dead tuples, rollback-able); TRUNCATE is DDL (instant table-level lock, no filters, resets storage, cannot be used on referenced tables without CASCADE).',
          'Question: Can you commit a CREATE TABLE partially? Answer: No â€” DDL is atomic inside a transaction; either the whole statement succeeds or the catalog change is rolled back.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Run every DDL command in section 6 on a scratch database.',
          '2. Time TRUNCATE vs DELETE on a 1M-row table and compare table size after.',
          '3. Create a role, grant it DML on orders, and verify it cannot run DROP TABLE.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "DDL" chapter and "Data Manipulation" chapter',
          'This topic next: Constraints in Production'
        ]
      }
    ]
  },
  {
    topicId: '01-core-sql',
    slug: 'constraints',
    title: 'Constraints in Production',
    description: 'Enforce non-null, unique, foreign key, and complex check constraints at the storage engine layer.',
    level: 'Intermediate',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what constraints are',
        body: [
          'Constraints are declarative rules attached to table columns that PostgreSQL validates on every INSERT and UPDATE. They serve as the single source of truth for business invariants.',
          'What they do: they are enforced inside the executor â€” not in application code â€” so no code path (API, cron, admin script, direct SQL) can ever bypass them.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Application-level validation is best-effort; constraints are guaranteed. Negative prices, duplicate emails, overlapping bookings, and orphaned children are all prevented at the storage layer, which is exactly where they must be prevented in multi-service architectures.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Think of constraints as bouncers at the database door: every row that enters must pass every check. NOT NULL demands a value, UNIQUE demands no twin, CHECK demands a formula, FK demands a parent exists, and EXCLUDE demands no overlap.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: constraint types',
        headers: ['Constraint', 'What it guarantees', 'Syntax', 'Production example'],
        rows: [
          ['NOT NULL', 'Column always has a value', 'col type not null', 'orders.user_id'],
          ['UNIQUE', 'No duplicate values', 'col type unique', 'products.sku'],
          ['PRIMARY KEY', 'Unique + not null identity', 'primary key (cols)', 'users.id'],
          ['CHECK', 'Row satisfies an expression', 'check (expr)', 'discount_percent <= 100'],
          ['FOREIGN KEY', 'Value exists in parent table', 'references t (col)', 'order_items.order_id -> orders.id'],
          ['EXCLUDE (GiST)', 'No overlapping rows (ranges)', 'exclude using gist (...) ', 'event_schedules.during']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: inline constraints on creation',
        language: 'sql',
        code: `create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  check (ends_at > starts_at)
);

insert into coupons (code, discount_percent, starts_at, ends_at)
values ('BAD', 500.00, now(), now() + interval '1 day');
-- ERROR: new row for relation "coupons" violates check constraint "coupons_discount_percent_check"`
      },
      {
        type: 'code',
        title: '7. Medium example: named constraints added later',
        language: 'sql',
        code: `alter table product_prices
add constraint check_positive_price check (amount >= 0.00),
add constraint check_valid_date_range check (valid_to is null or valid_to > valid_from);

-- A named FK with a deletion policy
alter table order_items
add constraint fk_order_items_variant
foreign key (variant_id) references product_variants(id) on delete restrict;

-- Composite unique: one price row per variant+currency at a time is NOT enough alone,
-- the real guarantee needs the range check above to be non-overlapping.`
      },
      {
        type: 'code',
        title: '8. Complex example: EXCLUDE constraint prevents overlapping prices',
        language: 'sql',
        code: `create extension if not exists btree_gist;

create table product_prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id),
  currency_code char(3) not null,
  amount numeric(12,2) not null check (amount >= 0),
  valid_from timestamptz not null,
  valid_to timestamptz,
  -- A variant can have only ONE price per currency per time range
  exclude using gist (
    variant_id with =,
    currency_code with =,
    tstzrange(valid_from, valid_to, '[)') with &&
  )
);

-- This insert fails (overlaps the existing price window):
insert into product_prices (variant_id, currency_code, amount, valid_from)
values ('var_5501', 'USD', 99.00, now() - interval '1 day');
-- ERROR: conflicting key value violates exclusion constraint "product_prices_variant_id_currency_code_excl"`
      },
      {
        type: 'callout',
        title: 'Migration safeguard',
        body: 'When adding constraints to existing multi-gigabyte tables, use ALTER TABLE ... ADD CONSTRAINT ... NOT VALID followed by ALTER TABLE ... VALIDATE CONSTRAINT to avoid table lock outages!'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how constraints are enforced',
        body: [
          'UNIQUE and PRIMARY KEY constraints create unique B-tree indexes; the index probe on every INSERT/UPDATE detects duplicates. CHECK constraints are evaluated as boolean expressions in the executor before the tuple is stored. FOREIGN KEY checks are done during the DML: on child INSERT it probes the parent index; on parent DELETE/UPDATE it checks children (which is why the child FK column needs an index). NOT VALID skips the initial full scan, and VALIDATE CONSTRAINT performs it later in a non-blocking way.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['ADD CONSTRAINT NOT NULL on a live big table', 'Locks the table while scanning it', 'NOT VALID pattern or backfill then alter'],
          ['CHECK constraint referencing another row', 'CHECK can only see the current row', 'Use triggers or FK for cross-row invariants'],
          ['Enforcing invariants only in app code', 'Race conditions and admin scripts bypass rules', 'Always duplicate key invariants at DB level'],
          ['Forgetting the FK column index', 'Parent DELETEs become full child scans', 'CREATE INDEX on every FK column']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Name constraints explicitly (check_..., fk_...) for debuggable error messages and clean migrations.',
          'Use pg_constraint / \d table to inventory constraints before schema changes.',
          'For temporal validity use EXCLUDE with btree_gist instead of app-level overlap checks.',
          'Measure the VALIDATE CONSTRAINT window on staging before applying to production.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: CHECK vs FK vs trigger â€” where do you enforce what? Answer: CHECK for row-local math, FK for existence, triggers only for cross-row/table business logic that constraints cannot express.',
          'Question: How do you add a UNIQUE constraint to 100M rows without downtime? Answer: CREATE UNIQUE INDEX CONCURRENTLY first, then attach it as a constraint using ALTER TABLE ... ADD CONSTRAINT ... USING INDEX.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Reproduce the CHECK violation in section 6 and read the error message.',
          '2. Build the EXCLUDE constraint and verify an overlapping price insert fails.',
          '3. Add a UNIQUE index CONCURRENTLY on orders.user_id+created_at and attach it as a constraint.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Constraints" chapter',
          'This topic next: Writes and RETURNING'
        ]
      }
    ]
  },
  {
    topicId: '01-core-sql',
    slug: 'writes-and-returning',
    title: 'Writes and RETURNING',
    description: 'Master INSERT, UPDATE, and DELETE â€” including a full DELETE deep dive with basic, medium, and locking-based complex examples.',
    level: 'Intermediate',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what writes and RETURNING are',
        body: [
          'The three DML writes â€” INSERT, UPDATE, DELETE â€” change rows inside tables. The RETURNING clause allows any of them to return the affected rows back to the client without a secondary SELECT roundtrip.',
          'What DELETE does: it removes rows that match a WHERE predicate. Internally PostgreSQL does not physically erase bytes â€” it marks the row version invisible and reclaims the space later via autovacuum (see MVCC).'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'RETURNING turns write operations into zero-roundtrip state synchronization: insert a row and get its generated id in one call. Understanding DELETE semantics matters because "delete" in PostgreSQL is a visibility operation, not an immediate disk wipe â€” which is why DELETE-heavy tables bloat and why DELETE can block on row locks held by other transactions.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Think of RETURNING as the receipt a write prints: INSERT prints the new row, UPDATE prints the new version, DELETE prints the version that died. Think of DELETE as "mark this version invisible" â€” the ghost tuple stays on disk until autovacuum buries it, and any transaction that started before the delete still sees it.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: write syntax at a glance',
        headers: ['Command', 'Syntax essentials', 'RETURNING yields'],
        rows: [
          ['INSERT', 'INSERT INTO t (cols) VALUES (...) [ON CONFLICT ...]', 'The inserted rows'],
          ['UPDATE', 'UPDATE t SET col = val [, ...] WHERE ... [FROM ...]', 'The updated (new) rows'],
          ['DELETE', 'DELETE FROM t [USING ...] WHERE ...', 'The deleted (old) rows'],
          ['MERGE (PG 15+)', 'MERGE INTO t USING s ON ... WHEN MATCHED/NOT MATCHED', 'Rows with action flags']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: INSERT + RETURNING the generated id',
        language: 'sql',
        code: `insert into coupons (code, discount_percent, starts_at, ends_at)
values ('WELCOME10', 10.00, now(), now() + interval '30 days')
returning id, code, discount_percent;`
      },
      {
        type: 'table',
        title: '7. Output of the basic INSERT',
        headers: ['id', 'code', 'discount_percent'],
        rows: [
          ['c7b2a901-441f-...', 'WELCOME10', '10.00']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: UPDATE ... RETURNING with a guard',
        language: 'sql',
        code: `-- Guarded decrement: only updates if stock is available, and returns the new value
update inventory_items
set available_qty = available_qty - 1,
    updated_at = now()
where variant_id = 'var_5501'
  and available_qty >= 1
returning variant_id, available_qty;

-- If 0 rows are returned, the caller knows the stock check failed â€”
-- no secondary SELECT needed.`
      },
      {
        type: 'table',
        title: '9. Output of the medium UPDATE',
        headers: ['variant_id', 'available_qty'],
        rows: [
          ['var_5501', '41']
        ]
      },
      {
        type: 'code',
        title: '10. Complex example: DELETE inside a transaction with row locking',
        language: 'sql',
        code: `-- Two concurrent sessions both try to cancel the same order.
-- Session A wins the row lock; Session B blocks on FOR UPDATE, then sees 0 rows.

begin;

select id from orders
where id = 'ord_9001'
for update;            -- row lock acquired here; concurrent DELETE waits

delete from order_items where order_id = 'ord_9001';
delete from payments where order_id = 'ord_9001';   -- payment_attempts FKs cleaned first

delete from orders
where id = 'ord_9001' and status in ('pending_payment', 'cancelled')
returning id, status, deleted_at;

commit;

-- DELETE with USING: delete rows based on another table
delete from user_sessions s
using users u
where s.user_id = u.id and u.deleted_at is not null
returning s.id, s.user_id;`
      },
      {
        type: 'callout',
        title: 'Why the complex DELETE is safe',
        body: 'SELECT ... FOR UPDATE serializes the two cancellers: exactly one gets the lock and deletes; the other waits, re-evaluates the predicate on the new state, and matches 0 rows. The RETURNING clause confirms what was deleted. Without the lock, both sessions could read status="pending_payment" and both would "succeed" at cancelling.'
      },
      {
        type: 'paragraph',
        title: '11. PostgreSQL internals: what DELETE really does',
        body: [
          'DELETE does not rewrite the heap page. It sets the tuple header xmax to the deleting transaction ID and marks the tuple dead once no snapshot can see it. The space is reclaimed by autovacuum into the Free Space Map. That is why a DELETE of 10M rows leaves table size unchanged until VACUUM runs. UPDATE is implemented as DELETE + INSERT of a new version (MVCC). DELETE on the parent of an FK checks child rows â€” one more reason to index FK columns.'
        ]
      },
      {
        type: 'table',
        title: '12. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['DELETE without WHERE', 'Deletes the whole table, often blocked forever by locks', 'Always scope with WHERE; use TRUNCATE intentionally'],
          ['DELETE of parent before children', 'FK violation or CASCADE surprises', 'Delete children first or rely on explicit ON DELETE rules'],
          ['No RETURNING, then SELECT to confirm', 'Double roundtrip and a race between the two calls', 'Use RETURNING for confirmation'],
          ['UPDATE then DELETE in separate transactions', 'A crash between them leaves orphaned state', 'Wrap related writes in one transaction']
        ]
      },
      {
        type: 'list',
        title: '13. Production considerations',
        items: [
          'Batch large DELETEs (e.g. 10k rows per transaction with pg_sleep between) to bound lock duration and WAL growth.',
          'Monitor autovacuum after purge jobs; schedule deletes in off-peak windows.',
          'Use ON CONFLICT DO UPDATE for idempotent workers instead of DELETE+INSERT.',
          'Prefer soft delete (deleted_at) for user-facing data, hard DELETE for purge jobs.'
        ]
      },
      {
        type: 'list',
        title: '14. Interview angle',
        items: [
          'Question: Why is DELETE slow on a huge table even with a perfect index? Answer: Each deleted row becomes a dead tuple, the table bloats, autovacuum must scan the table, and every FK check must be verified â€” plus WAL writes. The index makes the lookup fast, not the cleanup.',
          'Question: How do you delete rows in bulk without locking out readers? Answer: Loop in batches (DELETE ... WHERE id IN (SELECT ... LIMIT 10000)) inside transactions with small sleeps, so each batch holds its locks briefly.'
        ]
      },
      {
        type: 'list',
        title: '15. Practice tasks',
        items: [
          '1. Run the basic INSERT ... RETURNING and confirm the generated UUID comes back.',
          '2. Open two psql sessions and reproduce the blocked DELETE in section 10.',
          '3. Measure table size before/after deleting 100k rows, then after VACUUM (pg_relation_size).'
        ]
      },
      {
        type: 'list',
        title: '16. Further reading',
        items: [
          'PostgreSQL docs: "INSERT", "UPDATE", "DELETE" reference pages',
          'Next: data types â€” Numeric, Money, and Decimal Values'
        ]
      }
    ]
  }
];
