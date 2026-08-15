import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const schemaDesignNotes: NotePage[] = [
  {
    topicId: '09-schema-design-normalization',
    slug: 'normalization',
    title: 'Normalization 1NF to BCNF',
    description: 'Design robust tables from 1NF, 2NF, 3NF to BCNF to eliminate update anomalies and data duplication.',
    level: 'Advanced',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what normalization is',
        body: [
          'Normalization is the mathematical process of organizing database schema columns and relations to minimize data redundancy and prevent insert, update, and deletion anomalies.',
          'What it does: each normal form (NF) removes one class of anomaly — atomicity of values (1NF), partial dependencies (2NF), transitive dependencies (3NF), and non-candidate-key determinants (BCNF) — producing tables that store each fact exactly once.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'A denormalized design duplicates facts: change a category name and you must find every product row. Anomalies silently corrupt data (update the same email in 3 places, miss one). Normalization is the cheapest correctness guarantee you can have — it costs only extra JOINs, which indexes make cheap.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Each table should answer ONE question, and every non-key column must answer it about THE key: "this column is about the whole key (1NF/2NF), about nothing but the key (3NF), and the key is the only thing it answers about (BCNF)". Think of the key as the subject of the sentence and every column as a predicate about that subject — no predicates about predicates.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: normal forms',
        headers: ['Normal form', 'Core rule', 'Violation fix'],
        rows: [
          ['1NF', 'Atomic column values', 'Remove array lists into line item tables'],
          ['2NF', 'Full functional dependency on PK', 'Remove partial dependencies into separate entity tables'],
          ['3NF', 'No transitive dependencies', 'Remove non-key dependent fields (e.g. category name) into lookup tables'],
          ['BCNF', 'Every determinant is a candidate key', 'Enforce candidate key unique constraints']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: a 1NF violation and its fix',
        language: 'sql',
        code: `-- VIOLATION of 1NF: multiple values in one column
create table orders_bad_1nf (
  id uuid primary key,
  variant_skus text[] not null,     -- array of skus in one cell
  quantities text[] not null        -- quantities that must align with skus
);

-- FIX: atomic rows in a child table
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  variant_id uuid not null references product_variants(id),
  quantity integer not null check (quantity > 0),
  unique (order_id, variant_id)
);`
      },
      {
        type: 'code',
        title: '7. Medium example: 2NF and 3NF decomposition walk-through',
        language: 'sql',
        code: `-- VIOLATION (2NF): category_name depends on category_id, NOT on the
-- composite key (order_id, variant_id):
create table order_lines_bad_2nf (
  order_id uuid not null,
  variant_id uuid not null,
  category_id bigint,
  category_name text,          -- <- transitive: depends on category_id
  variant_name text,           -- <- partial: depends only on variant_id
  quantity integer not null,
  primary key (order_id, variant_id)
);

-- FIX: split the facts into their own tables
create table categories (id bigint primary key, name text not null);
create table product_variants (
  id uuid primary key,
  product_id uuid not null references products(id),
  name text not null
);
create table order_items_normalized (
  order_id uuid not null references orders(id),
  variant_id uuid not null references product_variants(id),
  quantity integer not null,
  primary key (order_id, variant_id)
);
-- category_name and variant_name are now facts about their own keys.`
      },
      {
        type: 'code',
        title: '8. Complex example: BCNF with overlapping candidate keys',
        language: 'sql',
        code: `-- BCNF violation: (course, professor) and (course, classroom) are both
-- candidate keys, but professor -> classroom (a professor teaches one room):
create table bad_bcnf (
  course text,
  professor text,
  classroom text,
  primary key (course, professor),
  unique (course, classroom)
);
-- Violation: classroom is functionally determined by professor (non-key)

-- FIX: every determinant becomes its own key:
create table professors (
  professor text primary key,
  classroom text not null
);
create table courses (
  course text primary key,
  professor text not null references professors(professor),
  unique (course, classroom)  -- hmm: classroom no longer in this table!
);
-- Cleaner final model:
create table course_professor (
  course text,
  professor text references professors(professor),
  primary key (course, professor)
);`
      },
      {
        type: 'callout',
        title: 'Normalization is a spectrum, not a religion',
        body: '3NF/BCNF eliminate update anomalies but multiply JOINs. Production schemas deliberately denormalize hot read paths (order_items snapshots unit_price at order time!) — see the Denormalization page. The discipline is: know which facts are duplicated and why.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: what constraints realize normalization',
        body: [
          'Each normal form is enforced by the constraint stack: PK + UNIQUE indexes for candidate keys, FK constraints for dependency chains, NOT NULL for key attributes. PostgreSQL does not "know" about normal forms — the schema author encodes them, and the storage engine enforces the keys. Violating the model still "works" at the SQL level; only the data quality suffers.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Arrays or JSONB for relational lists', 'No FK integrity inside the container', 'Junction/line tables for relational facts'],
          ['Denormalizing prematurely "for speed"', 'Update anomalies and drift before scale demands it', 'Normalize first; denormalize with a measured reason'],
          ['Composite keys with redundant parts', 'Impossible to enforce correctly; wasted indexes', 'Minimal candidate keys; BCNF check'],
          ['Column that depends on another column (same row)', 'Transitive dependency -> update anomaly', 'Extract to a lookup table + FK']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Time-series/analytics schemas (star schemas) intentionally denormalize — normalize OLTP, star for OLAP.',
          'Snapshots: business documents (orders) must keep the price/name at time of sale; FKs to live catalogs would rewrite history.',
          'Every junction table should have its own surrogate PK + unique composite to keep ORMs happy.',
          'Schema review: before every migration, ask "which normal form does this violate, and why is that OK?"'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Explain the difference between 3NF and BCNF. Answer: BCNF handles cases where multiple candidate keys overlap — every determinant must be a candidate key; 3NF only requires non-key columns to depend on the key, allowing some redundancy when candidate keys overlap.',
          'Question: Is normalization always desirable? Answer: No — read-heavy reporting benefits from deliberate denormalization (materialized views, snapshots); normalize transactional systems, denormalize analytically.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Take the bad_1nf table, write its 2NF/3NF/BCNF decompositions on paper, then implement.',
          '2. Find a real table in your project that violates 3NF and fix it with a lookup table.',
          '3. Explain to someone why order_items stores unit_price as a snapshot.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Constraints" and relational design texts',
          'Next: Denormalization Tradeoffs'
        ]
      }
    ]
  },
  {
    topicId: '09-schema-design-normalization',
    slug: 'denormalization',
    title: 'Denormalization Tradeoffs',
    description: 'Strategic denormalization patterns, materialized views, and triggered counters for read-heavy OLTP.',
    level: 'Production',
    readingTime: '24 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what denormalization is',
        body: [
          'Denormalization intentionally adds redundant data or aggregate cache columns (e.g. users.order_count) to speed up high-volume read queries, trading write complexity and storage for read throughput.',
          'What it does: it precomputes expensive joins/aggregates at write time so reads are single-row lookups.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Pure 3NF designs make dashboards and detail pages pay join+aggregate costs per request. At scale, one denormalized counter column or materialized view is the difference between 2ms and 200ms — and the discipline is keeping the redundancy CONSISTENT.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Normalized data is the single source of truth (the ledger). Denormalized data is a summary pinned to the wall (the scoreboard): it is derived from the ledger, always slightly risky if the update pipeline lags, but infinitely cheaper to read. The art is deciding which facts deserve a scoreboard and how to keep the scoreboard in sync.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: denormalization techniques',
        headers: ['Technique', 'What you duplicate', 'Sync mechanism', 'Risk'],
        rows: [
          ['Snapshot columns', 'name/price at order time', 'Write-time copy (no sync needed)', 'Low — immutable history'],
          ['Counter columns', 'order_count on users', 'Trigger or app update', 'Drift on failed updates'],
          ['Duplicate lookup columns', 'category_name on products', 'Write-time, backfill jobs', 'Drift; rename anomalies'],
          ['Materialized views', 'Aggregated result sets', 'REFRESH CONCURRENTLY', 'Staleness window'],
          ['Generated columns (PG12+)', 'Derived values', 'Computed on write (never drifts)', 'Storage cost only']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: snapshot vs live lookup',
        language: 'sql',
        code: `-- Live lookup (correct but rewrites history if price changes):
select o.id, oi.variant_id, oi.quantity, oi.unit_price, pv.name
from order_items oi
join product_variants pv on pv.id = oi.variant_id;

-- Snapshot (denormalized, freezes the price at sale time):
alter table order_items add column variant_name_snapshot text;
alter table order_items add column unit_price_snapshot numeric(12,2);

-- At checkout:
begin;
insert into order_items (id, order_id, variant_id, quantity, unit_price,
                         variant_name_snapshot, unit_price_snapshot)
select gen_random_uuid(), 'ord_9001', id, 2, unit_price,
       (select name from product_variants where id = pv.id),
       unit_price
from product_variants pv where id = 'var_5501';
commit;`
      },
      {
        type: 'code',
        title: '7. Medium example: triggered counter column',
        language: 'sql',
        code: `alter table users add column order_count int not null default 0;

create or replace function bump_order_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update users set order_count = order_count + 1 where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update users set order_count = order_count - 1 where id = old.user_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_bump_order_count
after insert or delete on orders
for each row execute function bump_order_count();

-- Now the dashboard query is a single indexed lookup:
select email, order_count from users where id = 'usr_9021a';
-- vs the normalized version that must count() across orders each time.`
      },
      {
        type: 'code',
        title: '8. Complex example: materialized view for high-speed read dashboards',
        language: 'sql',
        code: `create materialized view mv_daily_sales_summary as
select
  date_trunc('day', created_at) as sale_date,
  count(id) as total_orders,
  sum(total) as gross_revenue
from orders
where status = 'paid'
group by 1;

create unique index mv_daily_sales_date_idx on mv_daily_sales_summary (sale_date);

-- Refresh concurrently without blocking reads!
refresh materialized view concurrently mv_daily_sales_summary;

-- Cron pattern: refresh every 5 minutes -> dashboard stays fresh
-- and queries hit a tiny precomputed table instead of scanning orders.`
      },
      {
        type: 'callout',
        title: 'REFRESH CONCURRENTLY requires a unique index',
        body: 'A concurrent refresh needs a UNIQUE index on the materialized view to reconcile changes efficiently — without it, only a blocking full refresh (which locks reads) is available. Always ship the unique index with the view.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how the techniques execute',
        body: [
          'Snapshot columns add write cost (one extra value copied per insert) and zero read cost. Trigger counters make each INSERT also UPDATE the parent row — that parent update takes a row lock and adds a dead tuple, so counter tables need autovacuum headroom. Materialized views store physical tables with their own indexes; REFRESH CONCURRENTLY swaps in changed rows via a temporary diff table. Generated columns compute on write with zero app involvement and never drift.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Counters without triggers', 'Drift silently; dashboard lies', 'Trigger or same-transaction app update'],
          ['Materialized views refreshed too often', 'Refresh cost exceeds query savings', 'Match refresh to freshness SLAs'],
          ['Denormalizing everything "for performance"', 'Storage and write amplification explode', 'Measure first: index/covering index may suffice'],
          ['History rewrites (live FK names)', 'Past orders show current (wrong) data', 'Snapshot immutable facts at write time']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Start from the normalized model; denormalize ONE hot path at a time with a measurable goal.',
          'Always backfill denormalized columns in batches (UPDATE ... WHERE snapshot IS NULL LIMIT ...).',
          'Prefer generated columns and materialized views (no app code) over triggers (app-visible behavior).',
          'Verify consistency: periodic reconciliation query comparing counter vs count(*) — alert on drift.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: When do you denormalize? Answer: When measured reads (join+aggregate) dominate latency and freshness can tolerate slight lag; use snapshots, counters, or materialized views with a defined consistency mechanism.',
          'Question: Materialized view vs trigger counter? Answer: Views are SQL-maintained, refreshable in bulk, great for aggregates; counters are row-level, updated per write, best for single-value hot paths. Prefer views unless you need per-row immediacy.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Add the order_count counter with its trigger and verify it tracks INSERT/DELETE.',
          '2. Build the materialized view and time the dashboard query before/after.',
          '3. Write the reconciliation query that catches counter drift.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Materialized Views" and "Generated Columns"',
          'Next: Expand/Contract Migrations'
        ]
      }
    ]
  },
  {
    topicId: '09-schema-design-normalization',
    slug: 'expand-contract-migrations',
    title: 'Expand/Contract Migrations',
    description: 'Perform zero-downtime database schema migrations on multi-terabyte production tables.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what expand/contract is',
        body: [
          'Expand/Contract (Parallel Run) migration pattern changes schema structures in production without locking tables or breaking running application API servers. It has three phases: EXPAND (add the new structure while keeping the old), MIGRATE (run both in parallel), CONTRACT (drop the old).',
          'What it does: at no moment is there a version of the schema that either old or new app code cannot handle.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Direct ALTER TABLE on live multi-terabyte tables causes outages: ACCESS EXCLUSIVE locks block reads for the whole rewrite, and old app versions break the moment a column disappears. Expand/contract is the standard answer for zero-downtime schema evolution at any scale.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Think of replacing the wheels of a moving car: EXPAND bolts on the new wheel beside the old one (both present), MIGRATE transfers the load gradually, CONTRACT removes the old wheel only after the new one carries everything. At every step the car keeps moving — old and new software both function.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the three phases',
        headers: ['Phase', 'Goal', 'Schema action', 'App compatibility'],
        rows: [
          ['Expand', 'Add new structure safely', 'ADD COLUMN NULL, new table, NOT VALID constraint', 'Old AND new code work'],
          ['Migrate', 'Backfill and dual-write', 'Batched backfills, triggers or app dual-writes', 'New code reads/writes both'],
          ['Contract', 'Remove the old structure', 'DROP COLUMN after verification, VALIDATE constraints', 'Old code already retired']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: the expansion itself (the safe DDL)',
        language: 'sql',
        code: `-- EXPAND: nullable column, no backfill lock:
alter table orders add column coupon_code text;

-- Backfill in small batches so each statement holds locks briefly:
do $$
declare
  v_rows int;
begin
  loop
    update orders o
    set coupon_code = c.code
    from coupons c
    where c.id = o.coupon_id
      and o.coupon_code is null
      and o.id in (
        select id from orders
        where coupon_code is null and coupon_id is not null
        order by created_at
        limit 5000
      );

    get diagnostics v_rows = row_count;
    exit when v_rows = 0;
    commit;
    perform pg_sleep(0.05);
  end loop;
end;
$$;`
      },
      {
        type: 'code',
        title: '7. Medium example: dual-write during migration',
        language: 'sql',
        code: `-- New inserts write BOTH columns until the cutover:
begin;
insert into orders (id, user_id, status, total, coupon_id, coupon_code)
values (gen_random_uuid(), 'usr_9021a', 'paid', 99.00, 'c7b2a901', 'WELCOME10');
commit;

-- Optional: trigger to keep the new column in sync for legacy writers:
create or replace function sync_coupon_code()
returns trigger as $$
begin
  new.coupon_code = coalesce(new.coupon_code,
    (select code from coupons c where c.id = new.coupon_id));
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_coupon_code
before insert or update on orders
for each row execute function sync_coupon_code();`
      },
      {
        type: 'code',
        title: '8. Complex example: the contract phase with NOT VALID pattern',
        language: 'sql',
        code: `-- CONTRACT step 1: ensure data parity, then drop the old column:
-- (verify in code: every order with coupon_id has matching coupon_code)

-- CONTRACT step 2: add the constraint WITHOUT a full-table lock:
alter table orders add constraint orders_coupon_code_not_null
not valid;   -- registers intent, skips scan

-- ...later, when traffic is low:
alter table orders validate constraint orders_coupon_code_not_null;
-- (scan happens in the background; readers continue)

-- CONTRACT step 3: remove the legacy column
alter table orders drop column coupon_id;

-- Rollback plan if the drop is wrong:
-- (restore from backup or PITR — DROP COLUMN cannot be rolled back safely
--  after other transactions run; use a flag toggle in the app first)`
      },
      {
        type: 'callout',
        title: 'Contract is the dangerous phase',
        body: 'Dropping a column removes data permanently. Before dropping: confirm no old app instances still read it (canary deploys, feature flags), keep a backup, and drop LAST. Many teams stop at "expand + backfill" and keep the old column in place for months — that is a legitimate, conservative choice.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: why the phases avoid locks',
        body: [
          'ADD COLUMN with a NULL default is metadata-only in PostgreSQL 11+ — no table rewrite, near-instant. ADD CONSTRAINT ... NOT VALID registers without scanning; VALIDATE CONSTRAINT scans incrementally in the background. DROP COLUMN rewrites the table (or marks it dropped with a lazy rewrite) and takes ACCESS EXCLUSIVE — which is why it lives in the final phase under a maintenance window. Batched backfill commits every few thousand rows so each UPDATE holds only its own row locks.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Single giant UPDATE backfill', 'Lock and WAL storm for hours', 'Batched loop with commit + sleep'],
          ['ADD COLUMN NOT NULL directly', 'Full rewrite under ACCESS EXCLUSIVE', 'Add NULL -> backfill -> NOT VALID -> VALIDATE'],
          ['Deploying app + schema atomically', 'One version breaks instantly at cutover', 'Parallel-run phases; app deploys between them'],
          ['Dropping the old column too early', 'Irreversible data loss on rollback', 'Feature-flag reads off old column first']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Use shadow reads: run a percentage of traffic against the new column and compare values before cutover.',
          'Instrument the migration: backfill progress = rows remaining / rows total, alert on stall.',
          'Set lock_timeout on migration statements so a missed blocker fails fast instead of queueing.',
          'Every migration needs a rollback plan — often a second migration, rarely a restore.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: How do you add a NOT NULL column to a 1TB table without downtime? Answer: Add as NULL (metadata-only), backfill in batches, then ADD CONSTRAINT ... NOT VALID and VALIDATE CONSTRAINT in low traffic — never a blocking single ALTER.',
          'Question: What is the expand/contract pattern? Answer: Expand (add new structure, keep old), Migrate (dual-write + backfill), Contract (drop old after verification) — no instant when either app version breaks.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Reproduce the expand/backfill/validate sequence on a scratch table with 1M rows.',
          '2. Measure the ALTER times: ADD COLUMN NULL vs ADD COLUMN NOT NULL vs VALIDATE.',
          '3. Write the rollback migration for the coupon_code example.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "ALTER TABLE" (NOT VALID / VALIDATE, defaults)',
          'Next: Partitioning Orders'
        ]
      }
    ]
  }
];
