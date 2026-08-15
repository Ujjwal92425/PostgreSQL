import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const indexingNotes: NotePage[] = [
  {
    topicId: '06-indexing',
    slug: 'btree-indexes',
    title: 'B-tree Indexes',
    description: 'What indexes are, why you need them, how the B-tree works internally, and when a B-tree is the right choice.',
    level: 'Advanced',
    readingTime: '30 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what an index is',
        body: [
          'An index is a separate, redundant data structure PostgreSQL maintains alongside a table, mapping key values to the physical locations (CTIDs) of rows. The default index type is the B-tree (Balanced Tree).',
          'What it does: it lets the query planner find rows by key in O(log N) page reads instead of scanning every disk block of the table (O(N)). It is the difference between a 1ms lookup and a 30s full scan on a billion-row table.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need it',
        body: [
          'Without an index, every query touching a predicate column reads the whole table — impossible at production scale. Indexes also exist to enforce UNIQUE constraints, speed up joins (FK lookups), support ORDER BY without sorting, and avoid the "read the table twice" cost of aggregation.',
          'Cost: every INSERT/UPDATE/DELETE must maintain the index too, so each index adds write amplification. An index is a space-time trade: you trade disk and write speed for read speed.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'A table is a bookshelf of unsorted books (pages); an index is the alphabetical card catalog beside it. To find "PostgreSQL in 3 Days" you do not scan every shelf — you walk the catalog: open the "P" drawer, half-split, half-split again (log N), and read the shelf number (CTID). Keeping the catalog sorted costs a bit of time on every book added, but saves enormous time per lookup.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: index anatomy',
        headers: ['Concept', 'Meaning', 'Details'],
        rows: [
          ['Key', 'Column(s) being indexed', 'Can be expressions and partial (WHERE) filters'],
          ['CTID', 'Physical row pointer (page, offset)', 'Heap (table) location of the row version'],
          ['Leaf pages', 'Bottom layer holding key + CTID pairs', 'Sorted order; index-only scans read here'],
          ['Internal pages', 'Routing layers between root and leaves', 'Guide the O(log N) descent'],
          ['Deduplication (PG13+)', 'Repeated keys stored once', 'Saves space for low-cardinality keys'],
          ['Covering index (INCLUDE)', 'Extra payload columns', 'Enable index-only scans without visiting the heap']
        ]
      },
      {
        type: 'interactive',
        title: '5. B-Tree Navigation Visualizer',
        visual: 'btree-index'
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: create an index and measure the speedup',
        language: 'sql',
        code: `-- BEFORE: full scan for a point lookup
explain (analyze, buffers)
select * from orders where user_id = 'usr_9021a';
-- Output (shape): Seq Scan on orders (rows=... buffers: heap read=45000)

-- Create the index
create index orders_user_id_idx on orders (user_id);

-- AFTER: index probe, tiny buffer count
explain (analyze, buffers)
select * from orders where user_id = 'usr_9021a';
-- Output (shape): Index Scan using orders_user_id_idx (rows=18 buffers: read=6)

-- Drop it again to keep the demo repeatable
drop index orders_user_id_idx;`
      },
      {
        type: 'code',
        title: '7. Medium example: composite, covering, and UNIQUE indexes',
        language: 'sql',
        code: `-- Composite: filters on (user_id, created_at) avoid the extra index hops
create index orders_user_created_idx
on orders (user_id, created_at desc);

-- Covering: the query only needs total + status -> never touch the heap
create index orders_covering_idx
on orders (user_id)
include (total, status);

-- Unique: enforces the business rule AND doubles as the lookup index
create unique index users_email_unique
on users (lower(email));
-- Duplicate emails are now rejected at the storage layer:`
      },
      {
        type: 'code',
        title: '8. Complex example: expression + partial index with concurrency',
        language: 'sql',
        code: `-- Partial: index ONLY active coupons -> tiny, hot index instead of a huge one
create index coupons_active_idx
on coupons (id)
where is_active;

-- Expression + partial combined: unique on lower(email) for non-deleted users
create unique index users_email_active_idx
on users (lower(email))
where deleted_at is null;

-- Production-safe build on a live table (never blocks writes):
create index concurrently orders_user_created_idx
on orders (user_id, created_at desc);`
      },
      {
        type: 'callout',
        title: 'CREATE INDEX CONCURRENTLY is mandatory in production',
        body: 'A plain CREATE INDEX takes an ACCESS EXCLUSIVE lock and blocks writes for the whole build — hours on big tables. CONCURRENTLY builds the index in the background with writes continuing, at the cost of running slightly longer and never being able to roll back if it fails. Use it for every index on live tables.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how the B-tree works internally',
        body: [
          'A PostgreSQL B-tree is a multi-level tree: root -> internal pages -> leaf pages, each page 8KB. The descent from root to leaf takes O(log N) page reads, each page holding ~hundreds of keys (default fillfactor 90). Leaves are doubly linked for range scans (ORDER BY, BETWEEN, >).',
          'Inserts: locate the leaf, insert in sorted position; when a leaf overflows, the page splits in two, pushing a separator key up (this is why random keys like UUID v4 cause more splits and bloat). Deletes: mark entries dead, physically removed on VACUUM. Every index entry points to a heap tuple via CTID; the heap may need a second read unless the index covers the query (index-only scan), which requires the visibility map to prove all tuples visible.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Indexing every column "just in case"', 'Write amplification and bloat for unused indexes', 'Index only what EXPLAIN shows is scanned'],
          ['Function call in WHERE without expression index', 'WHERE upper(email) ignores the plain email index', 'Index the expression: on users (upper(email))'],
          ['UUID v4 primary keys', 'Random inserts split pages constantly', 'UUID v7 or bigint identity'],
          ['Indexing low-cardinality columns alone', 'Planner prefers seq scan anyway (>20% selectivity)', 'Partial or composite indexes instead'],
          ['Plain CREATE INDEX on live tables', 'Blocks all writes for the build duration', 'CREATE INDEX CONCURRENTLY']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Monitor index bloat (pg_stat_user_indexes) — dead entries inflate every probe.',
          'Use REINDEX INDEX CONCURRENTLY during low traffic to rebuild bloated indexes.',
          'Aim for index-only scans on hot read paths with INCLUDE columns.',
          'Keep fillfactor lower (e.g. 70-80) on tables with heavy UPDATE/DELETE to reduce page splits.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: How does a B-tree find a row? Answer: O(log N) descent from root through internal pages to a leaf holding (key, CTID) pairs, then one heap read — unless the index covers the query.',
          'Question: B-tree vs hash? Answer: B-tree supports range scans and ordering and is the default; hash indexes only equality lookups — rarely better than B-tree in PostgreSQL.',
          'Question: Why are random UUIDs bad for B-trees? Answer: Random keys land anywhere in the tree, causing page splits and cache misses; sequential keys append to the rightmost leaf, keeping pages full and hot.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Reproduce the EXPLAIN before/after in section 6 and compare buffers.',
          '2. Create the partial index and verify the planner picks it for is_active queries.',
          '3. Measure index bloat: run 100k updates on a table, then compare pg_relation_size of the index before/after REINDEX.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Indexes" chapter and "CREATE INDEX"',
          'PostgreSQL source: src/backend/access/nbtree/README',
          'Next: GIN, GiST, and BRIN'
        ]
      }
    ]
  },
  {
    topicId: '06-indexing',
    slug: 'gin-gist-brin',
    title: 'GIN, GiST, and BRIN',
    description: 'Deep dive into inverted indexes (GIN) for JSONB, spatial indexes (GiST) for ranges, and Block Range Indexes (BRIN) for time series.',
    level: 'Advanced',
    readingTime: '30 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what these specialized index types are',
        body: [
          'PostgreSQL offers specialized index types for non-scalar data: GIN (Generalized Inverted Index) indexes multi-element values like JSONB keys and arrays; GiST (Generalized Search Tree) handles geometric shapes and ranges; BRIN (Block Range Index) creates tiny min/max summaries per block range for massive append-only data.',
          'What they do: GIN answers "which rows contain this element?"; GiST answers "which rows overlap this shape/range?"; BRIN answers "which 128-page chunks could contain this value?" — each trading storage and update cost for a specific query shape.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need them',
        body: [
          'B-trees cannot index jsonb keys, arrays, tsvectors, or ranges efficiently. A JSONB containment search without GIN is a full scan; a range-overlap check without GiST is a manual sweep; a time-series query on a 2-billion-row log table without BRIN costs terabytes of scans. These types are what make PostgreSQL a usable document, geo, and analytics store.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'GIN is a book index in reverse: instead of "page 300 has words X, Y, Z", it stores "word X appears on pages 12, 45, 300" — then any search for X is one lookup. GiST is a stack of nested maps: the book index is organized spatially so "what is in this area?" skips whole regions. BRIN is a table of contents by chunk: "chapters 10-20 cover July; your date is in August, look at chapters 21-30."'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: type selection guide',
        headers: ['Type', 'Ideal data', 'Query operators', 'Storage', 'Write cost'],
        rows: [
          ['GIN', 'JSONB, arrays, full-text tsvector', '@>, @@, ? operators', 'Large (inverted lists)', 'High (fastupdate mitigates)'],
          ['GiST', 'Ranges, geometry, kNN nearest', '&&, <->, <<', 'Medium', 'Medium'],
          ['BRIN', 'Append-only time series, logs', '>, <, BETWEEN on sort key', 'Tiny (1 row per range)', 'Low'],
          ['hash', 'Exact equality on one column', '=', 'Medium', 'Medium'],
          ['B-tree', 'Scalar orderable values', '<, >, =, BETWEEN', 'Medium', 'Medium']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: GIN on JSONB + array containment',
        language: 'sql',
        code: `create index products_metadata_gin_idx on products using gin (metadata);
create index products_tags_gin_idx on products using gin (tags);

-- Both become index probes, not scans:
select id, sku from products
where metadata @> '{"attributes": {"color": "Midnight Blue"}}';

select id, sku from products
where tags @> array['eco', 'wireless'];`
      },
      {
        type: 'code',
        title: '7. Medium example: GiST for range overlap + exclusion enforcement',
        language: 'sql',
        code: `create extension if not exists btree_gist;

-- Index for fast overlap queries
create index event_schedules_during_gist on event_schedules using gist (during);

select room_id, during
from event_schedules
where during && tstzrange('2026-08-10 10:00', '2026-08-10 12:00');

-- And the same operator powers the exclusion constraint that
-- refuses overlapping bookings (see data types topic):
-- exclude using gist (room_id with =, during with &&)`
      },
      {
        type: 'code',
        title: '8. Complex example: BRIN on a multi-billion-row event table',
        language: 'sql',
        code: `-- page_views is append-only and queried by time window:
create index page_views_occurred_at_brin_idx
on page_views using brin (occurred_at)
with (pages_per_range = 64);   -- 64 x 8KB = 512KB summarized per row

-- Time-window analytics reads only relevant chunks:
select count(*)
from page_views
where occurred_at between '2026-08-01 00:00:00+00' and '2026-08-01 23:59:59+00';

-- Size comparison (typical 100GB table):
-- btree on occurred_at : ~2.1GB
-- brin  on occurred_at : ~4MB   (<0.1% of the btree)`
      },
      {
        type: 'callout',
        title: 'BRIN only shines on physically sorted data',
        body: 'BRIN works because rows with similar occurred_at live in neighboring pages. If rows are inserted out of order (bulk backfills, mixed timestamps), every range summary becomes nearly useless — BRIN then degrades to a coarse full scan. It is a tool for append-only pipelines, not general tables.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how each type works inside',
        body: [
          'GIN builds inverted lists: for each distinct element (jsonb key/value pair, array entry, trigram), a posting list of CTIDs. Inserts go to a pending list first (fastupdate), merged to the main structure during vacuum/autovacuum — hence high insert cost amortized. jsonb_path_ops stores only full paths (smaller, but no per-key index).',
          'GiST is a balanced search tree over a custom "distance" model; for ranges it stores bounding boxes, using union() to grow nodes and consistent() to decide which subtrees can contain a match. It also powers kNN (<->) with distance metrics.',
          'BRIN stores one summary row per pages_per_range block range — just min/max values — and the planner uses it to skip whole ranges during scans. No per-row maintenance cost.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['BRIN on a non-sorted column', 'Summaries never prune; worse than a seq scan', 'Only on append-only, physically ordered keys'],
          ['GIN on every text column', 'Huge indexes, slow inserts, rare query benefit', 'GIN only for jsonb/arrays/tsvector/trigram queries'],
          ['GiST when a B-tree suffices', 'B-tree is faster for plain range/comparison ops', 'B-tree first; GiST only for overlap/geometry'],
          ['Forgetting autovacuum with GIN', 'Pending lists grow and query time explodes', 'Tune autovacuum; monitor gin_pending_list_limit']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Compare index sizes before committing: GIN can be 2-5x the data size on verbose documents.',
          'For BRIN, set pages_per_range according to the query window size (larger window = larger range).',
          'Test CONCURRENTLY builds: GIN builds on big tables take time; plan the maintenance window.',
          'Recheck costs: GiST/BRIN require a heap recheck after the index returns candidates — count on it in EXPLAIN.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: GIN vs GiST? Answer: GIN is an inverted index for multi-element containment (jsonb, arrays, fts); GiST is a generalized search tree for spatial/range overlap and nearest-neighbor.',
          'Question: Why is BRIN so small and fast for time series? Answer: It stores only min/max per block range — one row per 512KB — letting the planner skip whole ranges without per-row indexing.',
          'Question: When would a B-tree beat a BRIN on time series? Answer: When queries are point lookups or the data is not physically sorted; BRIN then cannot prune and B-tree wins.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Create the three indexes and run EXPLAIN on their canonical queries.',
          '2. Compare index sizes: btree vs brin on the same column via pg_relation_size.',
          '3. Insert 100k out-of-order timestamps and measure BRIN pruning degrade.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "GIN Indexes", "GiST Indexes", "BRIN Indexes"',
          'Next: When Indexes Are Not Used'
        ]
      }
    ]
  },
  {
    topicId: '06-indexing',
    slug: 'index-selection',
    title: 'When Indexes Are Not Used',
    description: 'Diagnose missing index scans caused by low cardinality, type mismatches, functions on indexed columns, or stale statistics.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what "index not used" means',
        body: [
          'An index is a suggestion, not a command: the PostgreSQL planner is free to ignore it whenever it estimates a sequential scan is cheaper. "Index not used" is the planner doing its job — the diagnosis is why its math says a scan wins.',
          'What causes it: low cardinality (the predicate matches >20% of rows), a function or cast on the indexed column that breaks the match, outdated statistics, and index types that cannot answer the operator used.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'A missing index scan is usually invisible until load grows: the query was "fine" at 1M rows and dies at 100M. Knowing why the planner refuses the index turns a guessing game into a 5-minute EXPLAIN diagnosis, and prevents adding useless indexes that only slow writes.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The planner is a price-shopper: it asks the index "what does this cost?" and the catalog "how many rows match?" — then buys the cheaper option. If the index would still need 30% of the table, walking the whole table once (seq scan) is cheaper than 30% of random page reads. You cannot force the index; you fix the estimates or the query shape.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: why the planner refuses',
        headers: ['Reason', 'Symptom in EXPLAIN', 'Fix'],
        rows: [
          ['Low cardinality / high selectivity', 'Seq Scan despite the index', 'Partial/composite index; fix the query to be selective'],
          ['Function on indexed column', 'Index Scan disappears for WHERE upper(email)', 'Expression index on upper(email)'],
          ['Type mismatch', 'Index unused; implicit cast blocks match', 'Cast the literal: WHERE ts_col = $1::timestamptz'],
          ['Stale statistics', 'Planner believes the table is tiny', 'ANALYZE; increase default_statistics_target'],
          ['Operator unsupported by index', 'GIN index cannot serve < or >', 'B-tree for ordering; GIN only for containment'],
          ['Correlated columns', 'Combined estimates wildly wrong', 'CREATE STATISTICS (dependencies, ndistinct)']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: the function-on-column trap',
        language: 'sql',
        code: `create index users_email_idx on users (email);

-- The index exists, but the planner CANNOT use it:
explain select * from users where upper(email) = 'MAYA@EXAMPLE.COM';
-- Output (shape): Seq Scan on users  (filter: (upper(email) = 'MAYA@EXAMPLE.COM'))

-- Fix: index the EXPRESSION instead
create index users_email_upper_idx on users (upper(email));

explain select * from users where upper(email) = 'MAYA@EXAMPLE.COM';
-- Output (shape): Index Scan using users_email_upper_idx`
      },
      {
        type: 'code',
        title: '7. Medium example: low cardinality and stale stats',
        language: 'sql',
        code: `-- status has only 5 distinct values; a filter on 'paid' matches 40% of rows
explain select * from orders where status = 'paid';
-- Output (shape): Seq Scan  (cost=... rows=400000 ...)   <- planner is right!

-- The index IS useful for rare values, so make it partial:
create index orders_pending_idx on orders (id) where status = 'pending_payment';

-- Stale stats fix:
analyze orders;                       -- refresh estimates
alter table orders alter column status set statistics 500;  -- sample deeper
analyze orders;`
      },
      {
        type: 'code',
        title: '8. Complex example: type mismatch + correlated columns',
        language: 'sql',
        code: `-- Type mismatch: text literal vs uuid column silently disables the index
explain select * from users where id = 'usr_9021a';   -- works: uuid::text auto-cast? NO
-- If id is uuid and the driver sends text, the planner inserts a cast and scans.
select * from users where id = 'usr_9021a'::uuid;      -- explicit cast keeps the index

-- Correlated columns: (country_code, city) estimates are off by 100x
create statistics stts_users_country_city (dependencies, ndistinct)
on country_code, city from users;
analyze users;

-- Then the planner stops trusting a single-column selectivity for the pair.`
      },
      {
        type: 'callout',
        title: 'The "fix" is never SET enable_seqscan = off',
        body: 'Disabling seq scans globally makes queries FASTER on small tables and SLOWER on big ones — the planner was right. The correct fixes are the ones above: expression indexes, partial indexes, statistics, casts. Planner overrides belong in a debug session, not in production.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: the cost model',
        body: [
          'The planner costs a seq scan as ~1.0 cost unit per page plus 0.01 per row (seq_page_cost, cpu_tuple_cost); an index scan costs random_page_cost per page (~4.0) plus cpu per index tuple plus a heap fetch per hit. When estimated matching rows exceed roughly 5-10% of the table, the index loses to the scan. The estimates come from pg_statistic samples (default 30,000 rows via default_statistics_target = 100) — correlated data breaks the independence assumption, which is exactly what CREATE STATISTICS fixes.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Adding indexes blindly after seeing a Seq Scan', 'Wastes disk; writes slow down; scan was right', 'Read the estimates and selectivity first'],
          ['WHERE col = :text against uuid/timestamp columns', 'Implicit cast disables the index', 'Bind parameters with the right type'],
          ['Never running ANALYZE after bulk loads', 'Planner thinks tables are empty', 'ANALYZE after bulk INSERT/COPY'],
          ['Trusting index usage in dev databases', 'Tiny tables always get seq scans', 'Test with production-sized sample data']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Schedule ANALYZE after every big load (COPY, backfill, partition attach).',
          'Track index usage via pg_stat_user_indexes and drop indexes with zero scans.',
          'For volatile data, raise default_statistics_target on the hot predicate columns only.',
          'Re-validate hot queries after data-growth milestones — plans flip as statistics change.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Why would the planner ignore a perfect index? Answer: Selectivity too low (matching >~20% of rows), a function/cast breaking the key match, stale stats, or an operator the index type does not support.',
          'Question: How do you force an index? Answer: You do not force it — you fix what makes it look expensive: expression index, partial index, statistics, casts. seq_page_cost tuning is a last resort for storage-specific hardware.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Reproduce the upper(email) trap and fix it with an expression index.',
          '2. Build a 10M-row orders table, ANALYZE, and watch the plan flip at different selectivity.',
          '3. Create extended statistics on correlated columns and diff the plan costs.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Planner Cost Constants" and "Statistics"',
          'Next: Reading EXPLAIN ANALYZE'
        ]
      }
    ]
  }
];
