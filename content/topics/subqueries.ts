import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const subqueriesNotes: NotePage[] = [
  {
    topicId: '04-subqueries-window-functions',
    slug: 'subqueries-and-ctes',
    title: 'Subqueries and CTEs',
    description: 'Master scalar, correlated, and derived-table subqueries plus Common Table Expressions (WITH) for readability.',
    level: 'Intermediate',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what subqueries and CTEs are',
        body: [
          'A subquery is a SELECT nested inside another query, appearing in WHERE, FROM, SELECT, or HAVING. A Common Table Expression (CTE) is a named subquery defined with WITH that exists for the duration of one query.',
          'What they do: scalar subqueries return one value for a comparison; derived tables (subqueries in FROM) act as temporary tables; correlated subqueries reference the outer row; CTEs make multi-stage pipelines readable and reusable.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Subqueries and CTEs are the primary way to build multi-stage logic inside SQL instead of fetching raw rows into the app. PostgreSQL 12+ inlines CTEs automatically, so readability no longer costs performance — but only when you understand when inlining does NOT happen.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'A subquery is a question asked inside a question: "list users whose spending is above the average — and by the way, what is the average?" A correlated subquery is one that looks sideways at the current row while answering. A CTE is a named scratch pad: write the intermediate answer, give it a name, and reuse it in the main query.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: subquery shapes',
        headers: ['Shape', 'Position', 'Returns', 'Example'],
        rows: [
          ['Scalar subquery', 'SELECT / WHERE / HAVING', 'Single value (1 row, 1 col)', 'WHERE total > (SELECT avg(total) ...)'],
          ['Row subquery', 'WHERE', 'One row, many columns', "WHERE (a, b) = (SELECT x, y ...)"],
          ['Derived table', 'FROM', 'A table (many rows)', 'FROM (SELECT ...) t'],
          ['Correlated subquery', 'WHERE / SELECT', 'Evaluated per outer row', 'WHERE EXISTS (SELECT 1 ... o.user_id = u.id)'],
          ['CTE', 'WITH', 'Named result set', 'WITH active AS (...) SELECT * FROM active']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: scalar subquery vs derived table',
        language: 'sql',
        code: `-- Scalar: users whose order total beats the average paid order
select u.email, o.total
from orders o
join users u on u.id = o.user_id
where o.total > (select avg(total) from orders where status = 'paid')
  and o.status = 'paid'
order by o.total desc;

-- Derived table: reusable intermediate in FROM
select d.user_id, d.orders_this_month
from (
  select user_id, count(*) as orders_this_month
  from orders
  where created_at >= date_trunc('month', now())
  group by user_id
) d
where d.orders_this_month >= 3;`
      },
      {
        type: 'table',
        title: '7. Output of the derived-table example',
        headers: ['user_id', 'orders_this_month'],
        rows: [
          ['usr_9021a', '5'],
          ['usr_8192b', '3']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: correlated subqueries and multi-stage CTEs',
        language: 'sql',
        code: `-- Correlated: each user's LATEST order (classic per-group problem)
select u.email, o.total, o.created_at
from users u
join orders o on o.id = (
  select o2.id from orders o2
  where o2.user_id = u.id
  order by o2.created_at desc
  limit 1
);

-- CTE pipeline: same idea, readable stage by stage
with user_order_totals as (
  select user_id, count(id) as total_orders, sum(total) as lifetime_spend
  from orders
  where status = 'paid'
  group by user_id
)
select
  u.email,
  coalesce(uot.total_orders, 0) as total_orders,
  coalesce(uot.lifetime_spend, 0.00) as lifetime_spend
from users u
left join user_order_totals uot on uot.user_id = u.id
order by lifetime_spend desc;`
      },
      {
        type: 'code',
        title: '9. Complex example: CTE + data-modifying CTE for a batch job',
        language: 'sql',
        code: `-- Expire all holds older than 10 minutes, release their seats,
-- and return what happened — all in ONE statement.
with expired_holds as (
  update seat_holds
  set status = 'expired'
  where expires_at < now() and status = 'active'
  returning id, event_id, seat_id
),
released as (
  insert into audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
  select gen_random_uuid(), null, 'hold_expired', 'seat_hold', eh.id,
         jsonb_build_object('event_id', eh.event_id, 'seat_id', eh.seat_id)
  from expired_holds eh
  returning entity_id
)
select count(*) as expired_count from released;`
      },
      {
        type: 'callout',
        title: 'Data-modifying CTEs run in order and see each other',
        body: 'WITH clauses that INSERT/UPDATE/DELETE execute in the order they are written and each can reference the previous one — a clean way to chain writes atomically. Remember: the whole statement is one transaction; any error rolls back all branches.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: inlining vs materialization',
        body: [
          'In PostgreSQL 12+, the planner treats CTEs as subqueries and inlines them unless: (1) the CTE is referenced more than once, (2) it is recursive, (3) it contains a data-modifying statement, or (4) you mark it AS MATERIALIZED. Inlining lets the optimizer push predicates into the CTE; materialization forces a single evaluation — use MATERIALIZED for expensive-once computations.'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Correlated subquery on unindexed columns', 'Re-evaluates the subquery per row = N scans', 'Index the correlated columns; rewrite as JOIN'],
          ['Scalar subquery returning multiple rows', 'Runtime error "more than one row returned"', 'Add LIMIT 1 or aggregate'],
          ['CTE referenced twice', 'Recomputed or materialized unexpectedly', 'Use MATERIALIZED/AS MATERIALIZED deliberately'],
          ['Subquery in SELECT per row', 'Hidden N+1 inside a single statement', 'Join + GROUP BY, or window functions']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'EXPLAIN new CTE pipelines: inlined CTEs can be executed multiple times if referenced twice.',
          'Prefer JOIN + GROUP BY over correlated subqueries for set logic; keep subqueries for existence checks.',
          'Bound derived tables with LIMIT where the business needs only a slice.',
          'Data-modifying CTEs are powerful but hard to read — keep them for batch jobs, with comments.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: CTE vs subquery? Answer: Same optimizer treatment in PG12+ (both inline), but CTEs read better, support recursion, and can be FORCED to materialize. Use CTE for pipeline readability, subquery for small expressions.',
          'Question: When does a CTE NOT inline? Answer: Multiple references, recursion, data-modifying statements, or explicit AS MATERIALIZED — and each case changes the plan significantly.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Convert the correlated "latest order" query to a window-function version and compare.',
          '2. Run the data-modifying CTE and verify audit_logs rows appear atomically.',
          '3. Use EXPLAIN on a twice-referenced CTE with and without MATERIALIZED.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "WITH Queries (Common Table Expressions)"',
          'Next: Recursive CTEs'
        ]
      }
    ]
  },
  {
    topicId: '04-subqueries-window-functions',
    slug: 'recursive-ctes',
    title: 'Recursive CTEs',
    description: 'Traverse hierarchical trees, category taxonomies, and organizational charts using WITH RECURSIVE.',
    level: 'Advanced',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what recursive CTEs are',
        body: [
          'A Recursive CTE (WITH RECURSIVE) is a CTE that references itself. It consists of an Anchor Member (base rows), a UNION ALL operator, and a Recursive Member that joins back to the CTE name to extend the result.',
          'What they do: they walk trees and graphs one level at a time — category hierarchies, org charts, bill-of-materials, and transitive reachability queries — with cycle protection via the CYCLE clause.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Tree-shaped data is everywhere (categories, comments, org charts) and application code usually solves it with N queries. One recursive CTE replaces the whole loop, and Postgres iterates it server-side with a working table — the standard tool for hierarchy questions in interviews and production.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Think of a family tree walk: the anchor is "grandfather", and each recursive step is "give me the children of everyone I found so far, who I have not visited yet". The UNION ALL piles every generation into one growing result; the cycle clause is the guard against walking the same person twice.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: recursive CTE anatomy',
        headers: ['Part', 'Role', 'Syntax'],
        rows: [
          ['WITH RECURSIVE name AS', 'Declares the self-referencing CTE', 'WITH RECURSIVE path AS (...)'],
          ['Anchor member', 'Seeds the walk; runs once', 'SELECT ... WHERE id = 402'],
          ['UNION ALL', 'Keeps duplicates (loop-friendly); UNION dedupes', 'union all'],
          ['Recursive member', 'Joins the CTE to extend one level', 'SELECT ... JOIN path ON ...'],
          ['CYCLE clause (PG14+)', 'Detects and stops infinite loops', 'CYCLE id SET is_cycle USING path']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: full subtree of a category',
        language: 'sql',
        code: `with recursive subtree as (
  -- anchor: the root we start from
  select id, name, parent_id, 1 as depth
  from categories
  where id = 402

  union all

  -- recursive: all direct children of everything found so far
  select c.id, c.name, c.parent_id, s.depth + 1
  from categories c
  join subtree s on c.parent_id = s.id
)
select id, name, depth from subtree;`
      },
      {
        type: 'table',
        title: '7. Output of the basic example',
        headers: ['id', 'name', 'depth'],
        rows: [
          ['402', 'Electronics', '1'],
          ['505', 'Laptops', '2'],
          ['506', 'Gaming Laptops', '3'],
          ['511', 'Accessories', '2']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: breadcrumb path from a child to the root',
        language: 'sql',
        code: `with recursive category_path as (
  -- Anchor: start at the child
  select id, name, parent_id, name::text as full_path
  from categories
  where id = 506

  union all

  -- Recursive: walk UP to parents, prefixing the name
  select c.id, c.name, c.parent_id, (c.name || ' > ' || cp.full_path)::text
  from categories c
  join category_path cp on cp.parent_id = c.id
)
select full_path
from category_path
where parent_id is null;   -- the row that reached the root

-- Output: "Electronics > Laptops > Gaming Laptops"`
      },
      {
        type: 'code',
        title: '9. Complex example: cycle-safe traversal with CYCLE',
        language: 'sql',
        code: `-- Corrupt or circular data (a category pointing to itself) must not loop forever.
-- PostgreSQL 14+ detects cycles natively:
with recursive category_path as (
  select id, name, parent_id, name::text as full_path
  from categories
  where id = 402

  union all

  select c.id, c.name, c.parent_id, (c.name || ' > ' || cp.full_path)::text
  from categories c
  join category_path cp on cp.parent_id = c.id
)
cycle id set is_cycle using path
select id, name, is_cycle
from category_path;

-- Pre-14 workaround: carry an array of visited ids and filter
with recursive safe as (
  select id, parent_id, array[id] as visited
  from categories where id = 402
  union all
  select c.id, c.parent_id, s.visited || c.id
  from categories c
  join safe s on c.parent_id = s.id
  where not c.id = any(s.visited)   -- stop if we have seen this id
)
select * from safe;`
      },
      {
        type: 'callout',
        title: 'Guaranteed termination',
        body: 'A recursive CTE without cycle protection can loop forever on bad data — in production this hangs the connection until statement_timeout. Always set statement_timeout, use the CYCLE clause (PG14+), or carry a visited-id array (pre-14).'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: how recursion executes',
        body: [
          'PostgreSQL evaluates the anchor into a working table, then repeatedly evaluates the recursive member against the working table, appending results to the output and replacing the working table, until the recursive step produces zero rows. The iteration runs inside the executor as a loop of subplans — no recursion stack, so deep trees of thousands of levels work fine. UNION ALL preserves duplicate rows (important for DAGs); UNION dedupes.'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['No cycle protection', 'Infinite loop hangs the backend', 'CYCLE clause or visited array + statement_timeout'],
          ['Wrong join direction', 'Walks the wrong axis (children instead of parents)', 'Check anchor + recursive join carefully'],
          ['UNION instead of UNION ALL in DAGs', 'Silently drops duplicate paths, changing counts', 'Use UNION ALL unless dedupe is intended'],
          ['Recursion over huge tables without index on parent_id', 'Each iteration scans the table', 'Index categories(parent_id)']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Keep the anchor selective — the walk starts there; a full-table anchor scans everything.',
          'Index the join column (parent_id) so each iteration is an index probe, not a scan.',
          'Cap depth with a depth counter for runaway trees (e.g. WHERE depth <= 20).',
          'For read-heavy trees, precompute flattened paths (closure table) instead of recursing per request.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: Recursive CTE vs closure table? Answer: Recursive CTE is simple and always correct but iterates per query; closure tables precompute all ancestor/descendant pairs for O(1) reads at the cost of write complexity.',
          'Question: What happens if the recursive member never terminates? Answer: The query runs until statement_timeout or consumes all memory; PostgreSQL has no built-in iteration cap — protect with CYCLE or a depth bound.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Build the categories tree from the schema and run both the subtree and breadcrumb queries.',
          '2. Introduce a cycle (category pointing to its own child) and run the safe version.',
          '3. Compare recursion depth 10 vs 1000 levels for execution time.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "WITH Queries — Recursive Queries" and "CYCLE Clause"',
          'Next: Window Functions'
        ]
      }
    ]
  },
  {
    topicId: '04-subqueries-window-functions',
    slug: 'window-functions',
    title: 'Window Functions',
    description: 'Perform advanced analytics across row frames with ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, and SUM OVER.',
    level: 'Advanced',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what window functions are',
        body: [
          'A Window Function performs a calculation across a set of table rows related to the current row — the "window" — without collapsing rows into a single summary output (unlike GROUP BY).',
          'What they do: they compute rankings, running totals, deltas against previous rows, and per-group fractions while keeping every original row visible.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Analytics, dashboards, and pagination all need "rank within group", "cumulative sum", or "previous value". Without window functions you write three correlated subqueries; with them it is one pass over the data with a single sort.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'GROUP BY is a blender: rows go in, one summary comes out. Window functions are a pair of goggles: every row stays visible, and next to it you see a summary computed from a chosen neighborhood — its whole group (PARTITION), the rows before it (ORDER BY + frame), or both.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the function toolbox',
        headers: ['Function', 'Computes', 'Example'],
        rows: [
          ['ROW_NUMBER()', 'Sequential 1..N within partition', 'pagination, dedupe'],
          ['RANK() / DENSE_RANK()', 'Rank with ties (RANK skips, DENSE_RANK does not)', 'leaderboards'],
          ['NTILE(n)', 'Divides partition into n buckets', 'percentile cohorts'],
          ['LAG(col, k) / LEAD(col, k)', 'Value k rows before/after', 'deltas, change detection'],
          ['SUM/AVG/COUNT OVER', 'Running or framed aggregate', 'running totals, moving averages'],
          ['FIRST_VALUE/LAST_VALUE', 'First/last value in the frame', 'session start/end']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: ROW_NUMBER and ranking in one query',
        language: 'sql',
        code: `select
  user_id,
  id as order_id,
  total,
  created_at,
  row_number() over (partition by user_id order by created_at asc) as user_order_sequence,
  rank() over (order by total desc) as global_order_rank
from orders
where status = 'paid'
order by total desc
limit 5;`
      },
      {
        type: 'table',
        title: '7. Output of the basic example',
        headers: ['user_id', 'order_id', 'total', 'user_order_sequence', 'global_order_rank'],
        rows: [
          ['usr_9021a', 'ord_9001', '4219.70', '1', '1'],
          ['usr_8192b', 'ord_8802', '839.20', '1', '2'],
          ['usr_3301c', 'ord_8503', '839.20', '2', '2'],
          ['usr_9021a', 'ord_8104', '110.00', '2', '4']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: running totals and deltas',
        language: 'sql',
        code: `-- Running spend per user + spend delta vs previous order
select
  user_id,
  created_at::date as day,
  total,
  sum(total) over (
    partition by user_id
    order by created_at
    rows between unbounded preceding and current row
  ) as running_spend,
  total - lag(total) over (
    partition by user_id order by created_at
  ) as delta_vs_prev_order
from orders
where status = 'paid'
order by user_id, created_at;`
      },
      {
        type: 'code',
        title: '9. Complex example: dedupe + percentile cohorts in one pipeline',
        language: 'sql',
        code: `-- Keep only the LATEST session per user (classic dedupe), then bucket by value
with latest_sessions as (
  select
    id, user_id, expires_at,
    row_number() over (partition by user_id order by expires_at desc) as rn
  from user_sessions
)
select
  user_id,
  ntile(4) over (order by expires_at) as expiry_quartile
from latest_sessions
where rn = 1;

-- Moving 7-day order average per day (frame = previous 6 days + today)
select
  created_at::date as day,
  count(*) as orders,
  avg(count(*)) over (
    order by created_at::date
    rows between 6 preceding and current row
  ) as moving_7day_avg
from orders
group by created_at::date;`
      },
      {
        type: 'callout',
        title: 'Frame matters',
        body: 'With ORDER BY in the OVER clause, the default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW — running totals. Without ORDER BY, the default is the whole partition. Rows with equal ORDER BY keys land in the same RANGE frame but different ROW_NUMBER positions — a classic source of "why did the running total jump?" bugs.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: how windows execute',
        body: [
          'The executor adds a WindowAgg node: it sorts (or uses a sorted index) the input by the PARTITION BY + ORDER BY keys, then walks rows once, maintaining a frame of pointers and a partial aggregate state. Memory per window is bounded by the frame; unbounded frames over huge partitions can spill, shown in EXPLAIN as "WindowAgg ... Memory: ...kB". Each DISTINCT window specification adds one WindowAgg pass.'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Window function in WHERE', 'Illegal — evaluated after filtering', 'Wrap in a subquery/CTE and filter outside'],
          ['RANK vs ROW_NUMBER confusion in dedupe', 'Ties produce >1 row per partition', 'Dedupe with ROW_NUMBER, rank only for ranking'],
          ['No ORDER BY in OVER for running totals', 'Frame becomes the whole partition', 'Always declare ORDER BY for running aggregates'],
          ['Multiple windows with same spec', 'Planner dedupes only identical text specs', 'Reuse one window via WINDOW clause: WINDOW w AS (...)']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Prefer windows over correlated subqueries for per-group computations — one sorted pass vs N probes.',
          'Frame windows over millions of rows: keep frames small (bounded preceding) to limit memory.',
          'For "latest row per key" dedupe, windows beat DISTINCT ON when you also need ordering math.',
          'Materialize expensive window outputs into reporting tables if dashboards rerun them constantly.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: GROUP BY vs window functions? Answer: GROUP BY collapses rows to one aggregate row; window functions keep all rows and attach an aggregate computed over a moving frame.',
          'Question: How do you deduplicate rows keeping the newest? Answer: ROW_NUMBER() OVER (PARTITION BY key ORDER BY created_at DESC) with rn = 1 in an outer filter — one pass, index-friendly.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Run the ranking query and confirm ties: rank() skips numbers, dense_rank() does not.',
          '2. Build the running-spend query and check the first delta row is NULL.',
          '3. Explain the frame difference for ROW_NUMBER vs SUM with equal created_at values.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "Window Functions" and "Window Function Processing"',
          'Next: Functions vs Procedures'
        ]
      }
    ]
  }
];
