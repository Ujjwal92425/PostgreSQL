import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const joinsNotes: NotePage[] = [
  {
    topicId: '03-joins-set-ops',
    slug: 'join-types',
    title: 'Join Types',
    description: 'Master INNER, LEFT, RIGHT, FULL OUTER, CROSS, LATERAL, SEMI, and ANTI joins through e-commerce queries.',
    level: 'Intermediate',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what joins are',
        body: [
          'A JOIN combines tuples from two or more relations based on a logical predicate. Each join type defines what happens to rows that do not match the predicate.',
          'What they do: INNER keeps only matches; LEFT keeps all left rows and pads the right side with NULLs; RIGHT mirrors it; FULL keeps both sides; CROSS pairs every row with every row; SEMI/ANTI filter one side based on existence in the other (no column projection from the other side).'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Subtle semantics between Outer, Lateral, Semi, and Anti joins are the difference between correct reporting and corrupted result sets. The classic bug: using INNER JOIN for "all users" reports and silently dropping zero-order users — a financial and trust disaster.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Imagine two lists of employees: roster (left) and attendance (right). INNER = people on both lists. LEFT = everyone on the roster, with attendance columns empty for absentees. FULL = everyone who ever appears on either. CROSS = every possible pairing of a roster row with an attendance row. SEMI = roster people who show up (keep only roster columns); ANTI = roster people who never showed up.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: join type summary',
        headers: ['Join', 'Keeps', 'Row count effect', 'Production use'],
        rows: [
          ['INNER JOIN', 'Matching rows from both sides', '<= min(left, right) matches', 'orders -> their items'],
          ['LEFT JOIN', 'All left rows + matches', '>= left rows', 'all users + their orders'],
          ['RIGHT JOIN', 'All right rows + matches', '>= right rows', 'rare; flip to LEFT for clarity'],
          ['FULL OUTER JOIN', 'All rows from both sides', '>= max(left, right)', 'reconciliation of two systems'],
          ['CROSS JOIN', 'Every pair', 'left x right', 'LATERAL base, generating combos'],
          ['SEMI (EXISTS/IN)', 'Only left rows with a match', '<= left rows', 'has_any check'],
          ['ANTI (NOT EXISTS)', 'Only left rows without a match', '<= left rows', 'orphans, never-ordered users']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: INNER vs LEFT in one comparison',
        language: 'sql',
        code: `-- INNER: only users with at least one order appear
select u.id, u.email, o.id as order_id, o.total
from users u
join orders o on o.user_id = u.id
where u.deleted_at is null;

-- LEFT: every user appears; order columns NULL for zero-order users
select u.id, u.email, o.id as order_id, coalesce(o.total, 0) as total
from users u
left join orders o on o.user_id = u.id
where u.deleted_at is null;`
      },
      {
        type: 'table',
        title: '7. Output of the LEFT join (zero-order users visible)',
        headers: ['id', 'email', 'order_id', 'total'],
        rows: [
          ['usr_9021a', 'maya@example.com', 'ord_9001', '110.00'],
          ['usr_3301c', 'lee@example.com', 'NULL', '0']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: SEMI and ANTI joins with EXISTS',
        language: 'sql',
        code: `-- SEMI: users who have placed at least one paid order
select u.email
from users u
where exists (
  select 1 from orders o
  where o.user_id = u.id and o.status = 'paid'
);

-- ANTI: users who registered but NEVER ordered (churn-suspect list)
select u.email, u.created_at
from users u
where not exists (
  select 1 from orders o where o.user_id = u.id
);

-- ANTI with NOT IN is dangerous when NULLs exist — always prefer NOT EXISTS`
      },
      {
        type: 'code',
        title: '9. Complex example: LATERAL for top-N per group',
        language: 'sql',
        code: `-- Top 2 most expensive items per order (LATERAL runs per left row)
select
  o.id as order_id,
  o.total,
  top_items.variant_id,
  top_items.unit_price
from orders o
cross join lateral (
  select oi.variant_id, oi.unit_price
  from order_items oi
  where oi.order_id = o.id
  order by oi.unit_price desc
  limit 2
) top_items
where o.created_at >= now() - interval '30 days'
order by o.total desc;`
      },
      {
        type: 'table',
        title: '10. Output of the LATERAL example (top 2 per order)',
        headers: ['order_id', 'total', 'variant_id', 'unit_price'],
        rows: [
          ['ord_9001', '110.00', 'var_5501', '99.00'],
          ['ord_9001', '110.00', 'var_5502', '11.00'],
          ['ord_8802', '75.50', 'var_4401', '60.00']
        ]
      },
      {
        type: 'callout',
        title: 'LATERAL vs window functions',
        body: 'LATERAL runs a correlated subquery per left row and can return multiple rows per left row (like TOP-N lists). ROW_NUMBER() OVER (PARTITION BY ...) does the same job in one pass. Use LATERAL when the subquery needs LIMIT/OFFSET or per-row ordering that is hard to express with windows; use windows when you also need aggregates over the partition.'
      },
      {
        type: 'paragraph',
        title: '11. PostgreSQL internals: how joins execute',
        body: [
          'The planner rewrites every join into one of three physical algorithms: Nested Loop (outer row × index probe on inner), Hash Join (build hash table on smaller side, probe with larger), or Merge Join (both sides sorted, merge walk). SEMI/ANTI joins become EXISTS plans that stop after the first match — cheaper than a full join. The choice is driven by pg_statistic row estimates and work_mem.'
        ]
      },
      {
        type: 'table',
        title: '12. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['INNER JOIN for master-list reports', 'Drops rows with no matches silently', 'LEFT JOIN + COALESCE'],
          ['NOT IN with NULL-producing subqueries', 'Never matches; empty results', 'NOT EXISTS'],
          ['Unqualified join predicate (cross join by accident)', 'Blows up row counts (cartesian)', 'Always ON with the key'],
          ['Joining on non-indexed columns at scale', 'Nested loop without inner index = seconds of scan', 'Index FK columns or pick hash join']
        ]
      },
      {
        type: 'list',
        title: '13. Production considerations',
        items: [
          'Explain first: run EXPLAIN (ANALYZE) on new joins to confirm the join algorithm and row estimates.',
          'Prefer LEFT JOIN over RIGHT/FULL for readability; FULL is rare and often hides design issues.',
          'For pagination with joins, deduplicate with DISTINCT ON or window functions before paging.',
          'Watch for join fan-out: one order with 3 items triples user-level aggregates unless you aggregate per side first.'
        ]
      },
      {
        type: 'list',
        title: '14. Interview angle',
        items: [
          'Question: LEFT JOIN vs ANTI JOIN? Answer: LEFT keeps non-matching rows with NULL padding; ANTI keeps them without joining at all — faster and semantically clearer for "rows that have no match".',
          'Question: When is a CROSS JOIN LATERAL useful? Answer: To run a per-row subquery that references the outer row, e.g. top-N items per order or JSON array expansion per row.'
        ]
      },
      {
        type: 'list',
        title: '15. Practice tasks',
        items: [
          '1. Write all 8 join types against users/orders and inspect row counts.',
          '2. Convert the LATERAL query to ROW_NUMBER() and compare outputs.',
          '3. Reproduce the NOT IN-with-NULL bug and fix it with NOT EXISTS.'
        ]
      },
      {
        type: 'list',
        title: '16. Further reading',
        items: [
          'PostgreSQL docs: "Joins Between Tables" and the LATERAL subquery chapter',
          'Next: Nested Loop, Hash, and Merge Joins (how they run)'
        ]
      }
    ]
  },
  {
    topicId: '03-joins-set-ops',
    slug: 'join-algorithms',
    title: 'Nested Loop, Hash, and Merge Joins',
    description: 'Learn how PostgreSQL execution engine chooses join algorithms based on data size, indexes, and work_mem.',
    level: 'Advanced',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what join algorithms are',
        body: [
          'A join algorithm is the physical procedure the executor uses to combine two row sets: Nested Loop Join, Hash Join, and Merge Join. The query planner selects the optimal algorithm based on table statistics, available B-tree indexes, and work_mem configuration.',
          'What they do: they trade memory, CPU, and I/O differently — nested loop is great for small indexed lookups, hash join for medium unindexed sets, merge join for sorted large sets.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'The same SQL join can run in 1ms or 30s depending on which algorithm is picked. Understanding the three algorithms lets you read EXPLAIN output, spot planner mistakes (wrong estimates), and reshape queries or indexes so the right algorithm gets chosen.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Nested loop: for each row in list A, look up list B by its index — like checking each guest against a hotel registry. Hash join: memorize the small list in a table (hash), then check the big list once — like stamping attendees\' hands. Merge join: sort both lists by the same key and walk them in lockstep, like merging two sorted decks.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: algorithm comparison',
        headers: ['Algorithm', 'Cost profile', 'When planner picks it', 'Memory', 'Best when'],
        rows: [
          ['Nested Loop', 'O(N x M) worst, O(N log M) with index', 'Small outer + indexed inner (FK lookups)', 'Low', 'Point lookups, LATERAL, filtered small sets'],
          ['Hash Join', 'O(N + M)', 'Unindexed equi-joins, inner fits work_mem', 'work_mem for build side', 'Medium joins, no useful index'],
          ['Merge Join', 'O(N + M) after sort', 'Both sides already sorted or sortable', 'Low (sorts may spill)', 'Range/equi joins on sorted data, big tables']
        ]
      },
      {
        type: 'interactive',
        title: '5. Interactive join engine visualizer',
        visual: 'join-algorithms'
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '7. Basic example: recognizing the algorithm in EXPLAIN',
        language: 'sql',
        code: `-- FK join with index on order_items.order_id -> Nested Loop expected
explain (analyze, buffers)
select o.id, oi.variant_id
from orders o
join order_items oi on oi.order_id = o.id
where o.created_at >= now() - interval '7 days';

-- Output (shape):
-- Nested Loop  (cost=0.43..1234.56 rows=891 width=16) (actual time=0.05..4.12 rows=891)
--   ->  Seq Scan on orders o  (rows=97 ...)
--   ->  Index Scan using order_items_order_id_idx on order_items oi (rows=9 ...)`
      },
      {
        type: 'code',
        title: '8. Medium example: forcing and comparing plans',
        language: 'sql',
        code: `-- Hash join appears when the inner side has NO index:
set enable_nestloop = off;   -- discourage nested loops to see the alternative
explain (analyze, buffers)
select u.email, o.total
from users u
join orders o on o.user_id = u.id;

-- Output (shape):
-- Hash Join  (cost=1234.0..5678.9 rows=25000 width=40) (actual time=8.1..40.2 rows=25000)
--   Hash Cond: (o.user_id = u.id)
--   ->  Seq Scan on orders o ...
--   ->  Hash  (cost=... rows=...)
--         ->  Seq Scan on users u ...
--
-- Reset planner overrides after experimenting
reset enable_nestloop;`
      },
      {
        type: 'code',
        title: '9. Complex example: merge join on large sorted range + spilling to disk',
        language: 'sql',
        code: `-- Large-range equi join where both sides are ordered by the same key
set work_mem = '4MB';   -- small work_mem forces sort spills
explain (analyze, buffers)
select o.id, oi.variant_id, oi.quantity
from orders o
join order_items oi on oi.order_id = o.id
where o.created_at between '2026-01-01' and '2026-03-31';

-- Output (shape):
-- Merge Join  (cost=0.43..8921.50 rows=120000 width=16)
--   Merge Cond: (o.id = oi.order_id)
--   ->  Index Scan using orders_created_at_idx on orders o
--   ->  Index Scan using order_items_order_id_idx on order_items oi
-- If sorts are needed: "Sort Method: external merge  Disk: 8912kB" -> work_mem too small`
      },
      {
        type: 'callout',
        title: 'Reading a spill warning',
        body: 'When EXPLAIN prints "Sort Method: external merge Disk: NkB" or "Memory: NkB wanted, MMB used", the work_mem budget was exceeded and the node spilled to disk. In production this appears as slow queries; raise work_mem for that query (set work_mem in the session) or reduce the data volume being sorted.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: how each algorithm executes',
        body: [
          'Nested Loop: for each outer tuple, the inner plan is re-started (with a parameter binding) — with an inner index this is an index probe per row; without one it is a full inner scan (quadratic). Hash Join: the smaller side (chosen by estimated size) is built into a hash table in work_mem; if it exceeds work_mem it spills to disk batches (Hybrid Hash). Merge Join: needs both inputs sorted by the join key; if an index provides the order, no sort node appears; otherwise an explicit sort runs — and sorts can spill to disk.'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Joining unindexed FK columns at scale', 'Planner picks hash join; fine for medium, deadly for huge', 'Index FK columns; verify with EXPLAIN'],
          ['Blindly disabling node types (enable_* = off)', 'Degrades other queries globally', 'Fix estimates/indexes; never ship planner hacks'],
          ['Under-sizing work_mem on many connections', 'Per-query spill; 100 connections x 64MB = OOM risk', 'Keep work_mem modest (4-64MB) per connection'],
          ['Ignoring row estimate mismatches', 'Planner picks the wrong algorithm entirely', 'ANALYZE tables; create extended statistics for correlated columns']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Establish EXPLAIN baselines for your top-10 hot queries and diff them after releases.',
          'Nested loops are fine when the outer set is small — forcing hash joins can be slower.',
          'Track temp_files and temp_bytes in pg_stat_database as a global spill signal.',
          'Pre-sorted indexes (multi-column, matching ORDER BY) often eliminate sort nodes entirely.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: When is nested loop better than hash join? Answer: When the inner side is indexed and the outer side is small — per-row index probes cost O(log M), and the hash join build would cost more than it saves.',
          'Question: What makes a merge join cheaper than a hash join? Answer: If both inputs arrive already sorted (from indexes), merge join avoids both the hash build and the hash probe, streaming tuples with minimal memory.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Run the three EXPLAIN examples and confirm the algorithm names.',
          '2. Drop the order_items FK index and re-run — watch Nested Loop become Hash Join.',
          '3. Set work_mem to 1MB and find the "external merge" spill line in a large sort.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "Planner/Optimizer" chapter',
          'Next: Set Operations (UNION, INTERSECT, EXCEPT)'
        ]
      }
    ]
  },
  {
    topicId: '03-joins-set-ops',
    slug: 'set-operations',
    title: 'Set Operations',
    description: 'Combine query result sets using UNION, UNION ALL, INTERSECT, and EXCEPT with precedence rules.',
    level: 'Intermediate',
    readingTime: '20 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what set operations are',
        body: [
          'Set operations combine the result sets of two independent SELECT queries: UNION merges results (deduplicating rows), UNION ALL merges without deduplication (much faster), INTERSECT returns common rows, and EXCEPT returns rows in query 1 absent from query 2.',
          'What they do: they answer cross-query questions like "which emails appear in both lists?" or "which SKUs were ordered but never restocked?" without writing join machinery.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Set operations are the standard tool for reconciliation, deduplication, and diff-style reporting. Picking UNION ALL over UNION is a classic micro-optimization that avoids an expensive sort+dedupe node, and INTERSECT/EXCEPT replace convoluted EXISTS chains with one readable statement.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Think of two ingredient bowls: UNION is pouring both together and picking out duplicates; UNION ALL is pouring both together without checking; INTERSECT is the ingredients present in both bowls; EXCEPT is the ingredients only in the first bowl.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: operator reference',
        headers: ['Operator', 'Result', 'Deduplicates?', 'Typical use'],
        rows: [
          ['UNION', 'All rows from both queries', 'Yes', 'Merged master lists'],
          ['UNION ALL', 'All rows, duplicates kept', 'No', 'Streaming event merge, log concatenation'],
          ['INTERSECT', 'Rows present in both', 'Yes', 'Overlap analysis, matching cohorts'],
          ['INTERSECT ALL', 'Rows present in both, counting multiplicity', 'No (counts)', 'Duplicate-sensitive intersection'],
          ['EXCEPT', 'Rows in first but not second', 'Yes', 'Missing records, reconciliation'],
          ['EXCEPT ALL', 'Rows in first minus multiplicity from second', 'No (counts)', 'Quantity-aware differences']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: UNION vs UNION ALL cost difference',
        language: 'sql',
        code: `-- UNION ALL: streams rows, no dedupe sort — fast
select user_id, 'order_placed' as event_type, created_at from orders
union all
select user_id, 'seat_reserved' as event_type, created_at from seat_reservations
order by created_at desc
limit 50;

-- UNION: deduplicates identical (user_id, event_type, created_at) rows
select user_id, 'order_placed' as event_type, created_at from orders
union
select user_id, 'seat_reserved' as event_type, created_at from seat_reservations
order by created_at desc
limit 50;`
      },
      {
        type: 'code',
        title: '7. Medium example: reconciliation with EXCEPT',
        language: 'sql',
        code: `-- SKUs that appear in orders but have no inventory record (broken data)
select distinct oi.variant_id as sku
from order_items oi
except
select id
from product_variants;

-- Users in the "paid" list who are NOT in the "cancelled" list
select user_id from orders where status = 'paid'
intersect
select user_id from orders where status = 'completed';`
      },
      {
        type: 'code',
        title: '8. Complex example: set operations with precedence + window merge',
        language: 'sql',
        code: `-- Precedence: INTERSECT binds tighter than UNION/EXCEPT.
-- This returns (A AND B) UNION C — not A AND (B UNION C):
select 1 union select 2 intersect select 2;
--  -> rows: {1, 2}   (INTERSECT runs first)

-- Production pattern: merge two event streams, dedupe by id, keep latest
with merged as (
  select 'order' as kind, id, created_at from orders
  union all
  select 'reservation' as kind, id, created_at from seat_reservations
),
ranked as (
  select kind, id, created_at,
         row_number() over (partition by id order by created_at desc) as rn
  from merged
)
select kind, id, created_at
from ranked
where rn = 1
order by created_at desc;`
      },
      {
        type: 'callout',
        title: 'INTERSECT/EXCEPT and NULLs',
        body: 'Set operations treat NULLs as equal to each other (standard SQL), so EXCEPT will NOT keep a row just because one list has NULL and the other has a value — plan for it when reconciling nullable columns.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how set operations execute',
        body: [
          'UNION is implemented as an Append node followed by a Unique node (which sorts or hashes to find duplicates). UNION ALL is a bare Append — no dedupe cost. INTERSECT/EXCEPT use hash-based or sort-based set-ops nodes that keep one copy of each row. Because ordering across set operations is not guaranteed, an explicit ORDER BY at the end sorts the whole result.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['UNION when UNION ALL suffices', 'Unnecessary sort+dedupe on huge sets', 'Prefer UNION ALL; dedupe only when needed'],
          ['Column order mismatch between branches', 'Silent wrong mapping or type errors', 'Name/align columns explicitly in both SELECTs'],
          ['ORDER BY inside a branch', 'Ignored or illegal; ordering applies to whole set', 'Put ORDER BY once at the end'],
          ['Forgetting precedence in mixed expressions', 'Results differ from intent', 'Wrap operands in parentheses']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'For very large merges, aggregate or filter each branch before combining — the Append sees less data.',
          'UNION ALL over partitioned data is the idiomatic "merge partitions" pattern.',
          'Set operations require matching column types; cast explicitly to avoid implicit conversions.',
          'In CDC pipelines, UNION ALL + row_number dedupe is the standard exactly-once shape.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: UNION vs UNION ALL performance? Answer: UNION adds a deduplication node (sort or hash); UNION ALL streams rows with zero extra cost. Use UNION ALL whenever duplicates are acceptable or impossible.',
          'Question: INTERSECT vs EXISTS? Answer: INTERSECT operates on full result sets and dedupes; EXISTS short-circuits per row. For existence checks with an index, NOT EXISTS/EXISTS is usually faster.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Run UNION and UNION ALL on orders x seat_reservations and count rows.',
          '2. Write the reconciliation EXCEPT query and verify it against real data.',
          '3. Test the precedence example and explain the result with parentheses.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Combining Queries" (UNION, INTERSECT, EXCEPT)',
          'Next: Subqueries and CTEs'
        ]
      }
    ]
  }
];
