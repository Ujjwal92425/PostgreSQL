import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const optimizationNotes: NotePage[] = [
  {
    topicId: '07-query-optimization',
    slug: 'explain-analyze',
    title: 'Reading EXPLAIN ANALYZE',
    description: 'Interpret execution plans, cost estimates, actual timing, buffer usage, and memory spill warning flags.',
    level: 'Advanced',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what EXPLAIN ANALYZE is',
        body: [
          'EXPLAIN ANALYZE executes a query and returns the exact execution plan chosen by the query optimizer alongside real execution time, row counts, buffer cache hits, and disk I/O metrics.',
          'What it does: it shows the plan as a tree of nodes — scans, joins, sorts, aggregates — each annotated with estimated cost and measured reality, so you can see where time actually goes.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Optimization without EXPLAIN is guessing. The plan tells you the exact row-count estimates, which node is the bottleneck, whether buffers came from cache or disk, and whether work_mem spilled — the four facts you need before changing an index, a query, or a configuration.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The plan is a factory floor map: each node is a machine, each arrow a conveyor belt. Cost is the projected price tag; actual time is the stopwatch reading; rows are the parts counted. You walk the pipeline top-down and look for the machine whose part count explodes (N vs 1), whose buffers hit the disk, or whose time dwarfs everything else.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: what each field means',
        headers: ['Field', 'Meaning', 'Red flag'],
        rows: [
          ['cost=0.43..1234.56', 'Planner\'s estimate in cost units', 'Estimate far from actual'],
          ['rows=891', 'Estimated rows leaving the node', 'Actual rows >> estimate (stats problem)'],
          ['actual time=0.05..4.12', 'Real start/end time in ms', 'Dominates the plan'],
          ['buffers: shared hit/read', 'Pages from cache vs disk', 'High read = cache misses'],
          ['I/O Timings', 'Disk latency contribution', 'Enabled with EXPLAIN (ANALYZE, BUFFERS, IO)'],
          ['Memory: 12kB wanted, 32MB used', 'work_mem budget vs actual use', 'wanted > work_mem -> spill'],
          ['Sort Method: external merge Disk', 'Sort spilled to disk', 'Raise work_mem or shrink sort']
        ]
      },
      {
        type: 'interactive',
        title: '5. Execution Plan Node Inspector',
        visual: 'explain-analyze'
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '7. Basic example: the full diagnostic invocation',
        language: 'sql',
        code: `explain (analyze, buffers, io, format text)
select o.id, u.email, o.total
from orders o
join users u on u.id = o.user_id
where o.created_at >= now() - interval '7 days';
-- Output (shape):
-- Hash Join  (cost=250.00..4800.12 rows=891 width=40) (actual time=3.10..18.42 rows=891)
--   Hash Cond: (o.user_id = u.id)
--   Buffers: shared hit=1204 read=88
--   ->  Seq Scan on orders o  (rows=890 actual rows=891) (filter: created_at >= ...)
--   ->  Hash  (rows=2500) (actual time=2.5..2.5 rows=2500)
--   Planning Time: 0.4 ms   Execution Time: 19.1 ms`
      },
      {
        type: 'code',
        title: '8. Medium example: spotting the estimate-vs-actual mismatch',
        language: 'sql',
        code: `-- The classic sign of stale statistics:
explain (analyze, buffers)
select * from orders where status = 'paid';
-- Output (shape):
-- Seq Scan on orders  (cost=0.00..1234.00 rows=25000 width=32)
--                      (actual time=0.10..85.20 rows=412000)
--                                          ^^^^ 16x off!

-- Fix:
analyze orders;   -- or increase the sample:
alter table orders alter column status set statistics 1000;
analyze orders;`
      },
      {
        type: 'code',
        title: '9. Complex example: chasing a disk-spilling sort',
        language: 'sql',
        code: `-- The query that started paging:
explain (analyze, buffers, io)
select user_id, count(*) as n, sum(total) as spend
from orders
group by user_id
order by spend desc;
-- Output (shape):
-- Sort  (cost=88000..88500 rows=200000) (actual ...)
--   Sort Method: external merge  Disk: 12895kB    <- SPILL
--   ->  HashAggregate ...

-- Fix 1: session-scoped memory for this query shape
set work_mem = '64MB';
explain (analyze, buffers)
select user_id, count(*) as n, sum(total) as spend
from orders group by user_id order by spend desc;
-- Sort Method: quicksort  Memory: 11235kB         <- no disk

-- Fix 2 (permanent): an index that pre-orders avoids the sort entirely
create index orders_user_spend_idx on orders (user_id);`
      },
      {
        type: 'callout',
        title: 'work_mem is per-operation, per-connection',
        body: 'Raising work_mem to 1GB is safe for one query and deadly for 100 concurrent connections (100GB potential memory). Raise it in the session or for specific users, never globally, and watch shared buffers: EXPLAIN (BUFFERS) tells you whether the slow part is disk reads or CPU.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: how the plan is produced',
        body: [
          'The planner enumerates candidate access paths (index vs seq scan, join orders, aggregation strategies), assigns each a cost from cost constants and pg_statistic estimates, and keeps the cheapest. EXPLAIN prints that winning tree. ANALYZE executes it and attaches measurements; with BUFFERS it reports shared/local buffers touched per node; with IO it adds read/write timings. Parallel plans add Workers Planned/Launched — check whether parallelism is actually starting (max_parallel_workers_per_gather).'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['EXPLAIN without ANALYZE', 'Shows estimates only — they may be wrong', 'Always (ANALYZE, BUFFERS)'],
          ['Running ANALYZE on live traffic and trusting the plan', 'It executes the query (writes too)', 'Wrap in BEGIN...ROLLBACK or use EXPLAIN (ANALYZE, ...) on a replica'],
          ['Ignoring "actual rows" vs "rows"', 'Misses the statistics problem entirely', 'Compare the two on every node'],
          ['Micro-tuning work_mem from one EXPLAIN', 'Memory blowups at scale', 'Budget: connections x work_mem < RAM']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Capture plans of slow queries from pg_stat_statements or auto_explain before they disappear.',
          'auto_explain (auto_explain.log_min_duration) logs plans for queries over a threshold — the standard production tool.',
          'Diff plans across releases with EXPLAIN (FORMAT JSON) for automated regression checks.',
          'Never run EXPLAIN ANALYZE of an expensive write directly against the primary during peak hours.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: Why do you use EXPLAIN (ANALYZE, BUFFERS) instead of plain EXPLAIN? Answer: Estimates can be wildly wrong; ANALYZE gives measured time and rows, BUFFERS reveals cache vs disk behavior, both needed to judge a plan.',
          'Question: How do you find the bottleneck node? Answer: Start at the top; the node with the biggest actual time or the biggest row-count explosion vs estimate is the bottleneck — then fix its root cause (index, stats, sort, join).'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Run the diagnostic query and name every node type in the plan.',
          '2. Generate the stats mismatch with a bulk COPY and fix it with ANALYZE.',
          '3. Reproduce the disk spill with work_mem = 1MB and fix it two different ways.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "Using EXPLAIN" and "auto_explain"',
          'Next: Planner Statistics'
        ]
      }
    ]
  },
  {
    topicId: '07-query-optimization',
    slug: 'planner-statistics',
    title: 'Planner Statistics',
    description: 'Understand pg_statistic, ANALYZE, default_statistics_target, and extended statistics for correlated columns.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what planner statistics are',
        body: [
          'Planner statistics are sampled summaries of table contents — row counts, distinct values, null fractions, histogram buckets, most-common values — stored in system catalogs (pg_statistic, pg_stats) and refreshed by ANALYZE.',
          'What they do: the cost-based optimizer uses them to estimate selectivity (how many rows a predicate matches), which drives every index/join/sort decision. Garbage in, garbage plan out.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Every "why is this query suddenly slow?" incident traces back to an estimate. The sample size is controlled by default_statistics_target (100 = 30,000 rows), and correlated columns break the planner\'s independence assumption — the two most common root causes of catastrophic misplans.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The planner is a surveyor with a small map of a huge city: it never counts every building, it samples neighborhoods. The map (pg_stats) stores how many streets (distinct values) and a histogram of building heights (column values). Correlated data like city+zip is like a map that lists each street separately but not their pairing — so the surveyor guesses wildly. Extended statistics add the pairing table.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the statistics toolbox',
        headers: ['Tool', 'What it does', 'Syntax'],
        rows: [
          ['ANALYZE', 'Refreshes sampled stats for a table', 'ANALYZE orders;'],
          ['default_statistics_target', 'Controls sample size (rows ~ target x 300)', 'ALTER TABLE ... SET STATISTICS n'],
          ['pg_stats view', 'Human-readable stats (histogram, MCVs)', 'SELECT * FROM pg_stats WHERE tablename = ...'],
          ['Extended statistics', 'Fixes correlated-column estimates', 'CREATE STATISTICS s (dependencies, ndistinct) ON a, b FROM t'],
          ['pg_statistic', 'Raw catalog behind pg_stats', 'Queryable but read-only']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: reading pg_stats',
        language: 'sql',
        code: `analyze orders;

select attname, null_frac, n_distinct, most_common_vals, histogram_bounds
from pg_stats
where tablename = 'orders' and attname in ('status', 'total', 'user_id');

-- What you read:
-- status  : n_distinct = 5, most_common_vals = {paid,pending_payment,...} -> planner knows
--           'paid' matches a large fraction -> correctly chooses Seq Scan
-- total   : histogram_bounds = {...} -> planner interpolates BETWEEN selectivity
-- user_id : n_distinct = 25000 -> equality on it is selective -> Index Scan`
      },
      {
        type: 'code',
        title: '7. Medium example: tuning the sample size for a skewed column',
        language: 'sql',
        code: `-- A column with heavy skew: 99% of orders are 'paid'
explain select * from orders where status = 'paid';
-- rows=400000 (est)  actual=412000  -> fine
explain select * from orders where status = 'pending_payment';
-- rows=9000 (est)  actual=51000     -> 5x off: the rare value is under-sampled

-- Fix: deeper sample on the hot predicate column only
alter table orders alter column status set statistics 1000;
analyze orders;

explain select * from orders where status = 'pending_payment';
-- rows=50100 (est) actual=51000 -> estimates now match reality`
      },
      {
        type: 'code',
        title: '8. Complex example: extended statistics for correlated columns',
        language: 'sql',
        code: `-- The classic: city and zip_code are strongly correlated.
-- Without help, the planner multiplies individual selectivities:
select count(*) from addresses where country_code = 'US';
select count(*) from addresses where country_code = 'US' and postal_code like '10%';

explain select * from addresses
where country_code = 'US' and postal_code like '10%';
-- rows=1400000 (est)  actual=98000  -> 14x overestimate -> planner picks a scan

-- Fix: teach the planner the dependency
create statistics stts_users_city_zip (dependencies, ndistinct)
on country_code, postal_code from addresses;
analyze addresses;

explain select * from addresses
where country_code = 'US' and postal_code like '10%';
-- rows=96000 (est) actual=98000 -> correct selectivity -> Index Scan chosen`
      },
      {
        type: 'callout',
        title: 'Statistics are per-column samples, not per-query',
        body: 'The planner assumes columns are independent; with correlation it multiplies selectivity and gets order-of-magnitude errors. CREATE STATISTICS (dependencies) stores the correlation factor, (ndistinct) exact pair counts, (mcv) most-common-combinations. Re-run ANALYZE after big loads or the new statistics never kick in.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: sampling and storage',
        body: [
          'ANALYZE takes a random sample (30000 rows for target=100) using the tsm (sample scan), computes distinct counts (with a cautious estimator), builds up to 100 MCV entries and 100 histogram buckets per column, and writes to pg_statistic. The planner reads pg_statistic through the pg_stats view into RelOptInfo statistics and derives per-predicate selectivity with functions like var_eq_const / scalarineqsel. Extended stats are stored separately in pg_statistic_ext and combined in the selectivity computation.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Never running ANALYZE after bulk loads', 'Planner works with empty-table estimates', 'ANALYZE (or autovacuum ANALYZE) after every COPY/backfill'],
          ['Raising default_statistics_target globally', 'ANALYZE time and memory multiply across all columns', 'Set STATISTICS per column, only where skewed'],
          ['Ignoring correlation in multi-column filters', 'Orders-of-magnitude overestimates', 'CREATE STATISTICS (dependencies, ndistinct, mcv)'],
          ['Analyzing tiny sample tables in dev', 'Plans that only work in dev', 'Test on production-sized data']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Autovacuum runs ANALYZE automatically (analyze threshold); rely on it for steady-state, manual ANALYZE for big jumps.',
          'Track estimate-vs-actual drift: queries whose EXPLAIN shows >10x mismatch are your statistics backlog.',
          'For partition tables, analyze child partitions; parent statistics aggregate them.',
          'Statistics refresh is cheap — running ANALYZE on hot tables during off-peak is standard practice.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: What does default_statistics_target=100 mean? Answer: ANALYZE samples about 30,000 rows per column and stores up to 100 MCVs + 100 histogram buckets; raising it improves estimates for skewed data at the cost of slower ANALYZE.',
          'Question: Why do correlated columns need extended statistics? Answer: The planner multiplies per-column selectivities assuming independence; correlation breaks that, and CREATE STATISTICS (dependencies) records the correlation so estimates become accurate.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Run pg_stats queries and interpret each field for the status column.',
          '2. Create a skewed table, misestimate, then fix with STATISTICS n.',
          '3. Build the correlated example, add extended statistics, and diff the plans.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Planner Statistics", "ANALYZE", "CREATE STATISTICS"',
          'Next: N+1 and Connection Pooling'
        ]
      }
    ]
  },
  {
    topicId: '07-query-optimization',
    slug: 'n-plus-one-pooling',
    title: 'N+1 and Connection Pooling',
    description: 'Eliminate N+1 ORM query anti-patterns and configure PgBouncer connection pooling for high throughput.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what N+1 and pooling are',
        body: [
          'N+1 queries occur when an ORM issues 1 initial query to fetch N parent records, followed by N separate queries to fetch related child records. Connection pooling (e.g. PgBouncer) multiplexes many application connections onto a small number of real PostgreSQL backends.',
          'What they do: N+1 turns a 2-query report into thousands of roundtrips; pooling removes the per-connection cost (fork + memory per backend) that makes 10k concurrent app connections impossible.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'N+1 is the single most common production performance bug in ORM code, and it is invisible on dev datasets. Pooling is not optional at scale: PostgreSQL costs ~5-10MB RAM per connection, so 500 app instances x 50 connections = a 125GB problem. Both are "free" fixes that return 10-100x.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'N+1 is doing the shopping run per item instead of one trolley trip: one query for the cart, then one trip per item. Pooling is a taxi rank: 10,000 passengers share 50 taxis (round-trips per second stay high, idle taxis are few). Transaction pooling = passengers never stay in the same taxi; session pooling = same taxi per passenger.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: pooling modes',
        headers: ['Mode', 'How it shares', 'Session state', 'Works for'],
        rows: [
          ['Transaction', 'Backend released at COMMIT/ROLLBACK', 'Lost (prepared statements, SET die)', 'OLTP HTTP APIs (95% of use)'],
          ['Session', 'Backend pinned per client connection', 'Preserved', 'App sessions, long-lived state'],
          ['Statement', 'Per statement (rarely used)', 'Lost', 'Ad-hoc tools only']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: N+1 in action',
        language: 'sql',
        code: `-- N+1: one query per order to fetch its items (100 orders = 101 queries!)
-- ORM pseudo-code: orders = Order.filter(user_id=...); 
--                 for order in orders: order.items  <- N queries

-- The fix: one query with a join
select o.id as order_id, oi.variant_id, oi.quantity
from orders o
join order_items oi on oi.order_id = o.id
where o.user_id = 'usr_9021a'
  and o.created_at >= now() - interval '30 days';

-- Or one query + one "IN" fetch (the 2-query pattern):
select * from order_items where order_id in (
  select id from orders where user_id = 'usr_9021a'
);`
      },
      {
        type: 'code',
        title: '7. Medium example: eager loading in ORM + the PgBouncer config',
        language: 'sql',
        code: `-- Django: select_related (FK) / prefetch_related (reverse FK, M2M)
--   Order.objects.filter(user=u).select_related('user').prefetch_related('items')

-- Rails: includes(:user, :items)  -> 1 + 1 + 1 queries instead of 1 + N

-- PgBouncer production config (transaction pooling for HTTP APIs):
-- [databases]
-- postgres = host=127.0.0.1 port=5432 dbname=postgres
-- [pgbouncer]
-- pool_mode = transaction
-- max_client_conn = 10000
-- default_pool_size = 40
-- server_reset_query = DISCARD ALL   <- clears session state on release`
      },
      {
        type: 'code',
        title: '8. Complex example: N+1 through pagination + prepared-statement hazards',
        language: 'sql',
        code: `-- Hidden N+1: fetching the same parent repeatedly inside pagination
select o.id, o.total,
  (select u.email from users u where u.id = o.user_id) as email  -- correlated per row!
from orders o
limit 100;
-- Output: still 1 plan + 100 probes — fine with index, but written as a join it is 1 probe.

-- With transaction pooling, PREPARE statements break:
--  PREPARE get_user(uuid) AS SELECT * FROM users WHERE id = $1;  -- dies at release
-- Fix: use "PREPARE ... FROM" via libpq named statements only in session mode,
-- or disable server-side prepared statements in the ORM (Django: disable_server_side_cursors).`
      },
      {
        type: 'callout',
        title: 'Pooling changes SQL semantics',
        body: 'In transaction mode, anything held across statements (temp tables, SET LOCAL values, advisory locks, cursors, prepared statements) silently disappears between transactions because a different backend may serve the next query. Choose session mode for such apps, or convert state into database-side tables/parameters.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: why pooling matters',
        body: [
          'Each connection forks a backend process with its own memory contexts (work_mem, caches) — roughly 5-10MB of base RAM per connection, plus sorting buffers. PostgreSQL also caps at max_connections (default 100). PgBouncer (transaction mode) lets thousands of app connections share tens of backends; poolers like PgCat/Pgpool add routing, and PgBouncer itself forks one lightweight child per pool. For vertical scaling you can also run pgbouncer on the same host as the app to cut network roundtrips.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['N+1 loops in ORM reports', 'Thousands of roundtrips; 10-100x latency', 'select_related / prefetch_related / join'],
          ['Session-mode state used with transaction pooling', 'Silently broken queries or lost settings', 'DISCARD ALL semantics: pass state per query'],
          ['max_connections raised to fix load', 'RAM exhaustion per backend, OOM risk', 'Pool instead of raising max_connections'],
          ['One giant pooled query with 10k IN values', 'Huge plan memory and network payloads', 'Batch IN lists (500-1000) and paginate']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Match pool size to (CPU cores x 2-3) per database; more connections rarely add throughput.',
          'Monitor pooler queue time — if clients wait for a pool slot, scale the pool or the DB.',
          'Use server_reset_query = DISCARD ALL to guarantee clean releases in transaction mode.',
          'Keep statement_timeout set on the database so a runaway query frees its pooled slot.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: What is N+1 and how do you fix it? Answer: One parent query plus N child queries; fix with JOINs, prefetching, or one IN query — then verify with a query count logger.',
          'Question: Transaction vs session pooling? Answer: Transaction releases the backend per transaction (fast, state lost); session pins it (state kept, fewer connections served). HTTP APIs use transaction mode; apps with session state use session mode.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Enable query logging (log_statement=all) and count queries for an ORM loop before/after prefetch.',
          '2. Configure PgBouncer in transaction mode and verify connections drop 100x.',
          '3. Reproduce the prepared-statement failure under transaction pooling and fix it.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Connection Settings" (max_connections) and PgBouncer config docs',
          'Next: Transaction Basics'
        ]
      }
    ]
  }
];
