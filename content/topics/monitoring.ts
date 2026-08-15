import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const monitoringNotes: NotePage[] = [
  {
    topicId: '15-monitoring-maintenance',
    slug: 'metrics-alerts',
    title: 'Metrics and Alerts',
    description: 'Monitor key database metrics: Connection utilization, Cache Hit Ratio, Replication Lag, Transaction ID Wraparound, and Deadlocks.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what monitoring is',
        body: [
          'Effective database monitoring tracks 5 critical health indicators: Buffer Cache Hit Ratio (>99%), Max Connection Utilization, Replication Lag in bytes/seconds, Autovacuum Dead Tuple accumulation, and Transaction ID (XID) age.',
          'What it does: metrics tell you the current health; alerts fire BEFORE the outage — the difference between a page at 2am and a postmortem at 9am.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Every PostgreSQL outage class — connection exhaustion, cache thrash, replica lag, XID wraparound, autovacuum starvation — has a metric that trends for hours before it kills you. Monitoring is the instrument panel; alerts are the warning lights; both are mandatory at production scale.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The database is a car; metrics are the gauges: temperature (XID age), fuel gauge (connection count), oil pressure (cache hit ratio), speedometer with a lag warning (replication lag), and a maintenance light (dead tuples / autovacuum). You do not wait for the smoke — you watch the gauges and pull over when a needle passes the red line.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the big-5 metrics',
        headers: ['Metric', 'Healthy threshold', 'Failure mode it predicts', 'Primary source view'],
        rows: [
          ['Cache hit ratio', '> 99%', 'Disk-bound reads, latency spikes', 'pg_statio_user_tables'],
          ['Connection utilization', '< 80% of max_connections', 'Connection refused, app outages', 'pg_stat_activity'],
          ['Replication lag', 'Seconds (workload dependent)', 'Stale reads, data loss window', 'pg_stat_replication'],
          ['Dead tuple ratio', 'Bounded by autovacuum', 'Bloat, bloat-driven seq scans', 'pg_stat_user_tables'],
          ['XID age', '< 1.5B (warn at 1B)', 'Wraparound = database shutdown', 'pg_database / age()']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: the health-check query pack',
        language: 'sql',
        code: `-- 1. Cache hit ratio
select
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  round((sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100.0)::numeric, 2) as cache_hit_ratio
from pg_statio_user_tables;

-- 2. Connections
select count(*) as active,
       (select setting::int from pg_settings where name = 'max_connections') as max_conn
from pg_stat_activity;

-- 3. XID age per database
select datname,
       age(datfrozenxid) as xid_age,
       round(age(datfrozenxid)::numeric / 2000000000 * 100, 1) as pct_to_wraparound
from pg_database
order by age(datfrozenxid) desc;`
      },
      {
        type: 'code',
        title: '7. Medium example: dead tuples and bloat trend',
        language: 'sql',
        code: `-- Autovacuum effectiveness per hot table:
select
  relname,
  n_live_tup,
  n_dead_tup,
  round(n_dead_tup::numeric / nullif(n_live_tup, 0) * 100, 1) as dead_pct,
  last_autovacuum,
  last_autoanalyze
from pg_stat_user_tables
order by n_dead_tup desc
limit 10;

-- Rule of thumb: dead_pct trending above ~20% means autovacuum
-- cannot keep up -> investigate long transactions or autovacuum tuning:
--   alter table orders set (autovacuum_vacuum_scale_factor = 0.05, ...)

-- Table bloat in bytes (index + heap):
select relname,
       pg_size_pretty(pg_relation_size(relid)) as size,
       pg_size_pretty(pg_total_relation_size(relid)) as total_with_indexes
from pg_stat_user_tables
where relname in ('orders', 'order_items', 'users');`
      },
      {
        type: 'code',
        title: '8. Complex example: a full alerting dashboard query set',
        language: 'sql',
        code: `-- Replication lag (primary side):
select client_addr,
       state,
       write_lag, flush_lag, replay_lag,
       sent_lsn, replay_lsn
from pg_stat_replication
where state = 'streaming';

-- (RDS exposes ReplicaLag in CloudWatch; self-managed: scrape the above)

-- Long-running queries (kills idle-in-transaction too):
select pid, state, wait_event_type, wait_event,
       now() - query_start as duration,
       left(query, 60) as query
from pg_stat_activity
where state <> 'idle'
  and now() - query_start > interval '30 seconds'
order by duration desc;

-- Deadlock rate (log-monitor or pg_stat_database):
select datname, deadlocks, conflicts
from pg_stat_database
order by deadlocks desc;

-- Alert thresholds (PagerDuty-style):
--   cache_hit_ratio < 99% for 10min  -> page
--   connections > 80% of max         -> page
--   replication lag > 30s            -> page
--   xid_age > 1.0B                   -> page (wraparound window)
--   dead_pct > 20%                   -> ticket`
      },
      {
        type: 'callout',
        title: 'Metrics vs logs vs traces',
        body: 'Metrics answer "is it sick?" (numbers, alerts); logs answer "what happened?" (auto_explain, error logs); traces answer "why is it slow?" (query plans). Production monitoring uses all three: scrape metrics every 30s (Prometheus), ship logs to your log store, and keep auto_explain on.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: where the numbers come from',
        body: [
          'The statistics collector (pg_stat_*) tracks counters in shared memory: heap_blks_read/hit are incremented per page access in the buffer manager; connections count backend slots in use; XID age comes from pg_database.datfrozenxid (the point autovacuum\'s freeze sweep has reached); replication lag is computed from LSN differences between sender and receiver; deadlocks counter increments on each abort in the lock manager. Prometheus exporters (postgres_exporter) translate these into scrape-able metrics.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Monitoring only CPU/RAM', 'DB-specific failures (XID, bloat, lag) invisible', 'Track the big-5 PostgreSQL metrics'],
          ['No alert thresholds or wrong ones', 'Alerts ignored = no alerts', 'Tune thresholds; keep a quiet baseline'],
          ['Scraping too rarely', 'Spikes invisible between samples', 'Scrape every 30-60s'],
          ['One dashboard for all environments', 'Dev noise hides prod issues', 'Separate per environment'],
          ['No runbook linked to alerts', 'On-call has no idea what to do', 'Every alert links to a runbook']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Start with 5 alerts, not 50: connections, cache, lag, XID age, dead tuples; expand with experience.',
          'Use auto_explain (log_min_duration) to capture plans of the queries your metrics say are slow.',
          'Postgres exports (postgres_exporter, RDS CloudWatch) integrate with your existing stack.',
          'Alert on TRENDS, not levels: a rising dead_tup graph catches the problem earlier.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Which metrics would you monitor on a PostgreSQL primary? Answer: Cache hit ratio, connection utilization, XID age, dead tuples/autovacuum progress, replication lag (if replicas exist), and deadlock/lock-wait rates.',
          'Question: What does XID wraparound do and how do you prevent it? Answer: When age(datfrozenxid) nears 2^31, the database shuts down to protect transaction IDs; prevent by monitoring age and letting autovacuum freeze aggressively before the threshold.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Run the health-check pack against your database and note the values.',
          '2. Generate dead tuples (bulk update), watch dead_pct, then watch autovacuum reclaim.',
          '3. Set up two alerts (connections, cache) in your monitoring tool and trigger them.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "The Statistics Collector" and "Monitoring"',
          'Next: VACUUM and Bloat'
        ]
      }
    ]
  },
  {
    topicId: '15-monitoring-maintenance',
    slug: 'vacuum-bloat',
    title: 'VACUUM and Bloat',
    description: 'Manage autovacuum tuning parameters, table bloat detection, Visibility Map bits, and zero-downtime pg_repack.',
    level: 'Production',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what VACUUM and bloat are',
        body: [
          'Table Bloat is the accumulation of dead tuple versions and unused space inside table disk pages caused by MVCC updates and deletes. VACUUM reclaims dead tuple space into the Free Space Map (FSM) so future INSERTs reuse the space; autovacuum does this automatically.',
          'What they do: VACUUM removes dead versions and refreshes the visibility map; without it, tables and indexes balloon, scans slow down, and eventually XID wraparound forces an emergency freeze.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Bloat is the silent killer: a 10GB table that "should" be 2GB, indexes that need 3x their space, queries that were milliseconds and become seconds. Misunderstanding MVCC cleanup is the #1 cause of mysterious production slowdowns — and emergency vacuuming at 3am.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The table is a whiteboard where every update writes over the same line. But MVCC means old lines are never erased while anyone might still be reading them — erasing happens only when the janitor (autovacuum) passes with a bucket (visibility map) of who can no longer see them. If the janitor is understaffed (long transactions) or slow (bad tuning), the board fills with ghost text: bloat.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the vacuum mechanics',
        headers: ['Concept', 'Meaning', 'Control knobs'],
        rows: [
          ['Dead tuple', 'Row version no snapshot can see', 'Deleted/updated versions'],
          ['Visibility map', 'Per-page "all tuples visible" bits', 'Index-only scans + VACUUM skip'],
          ['Freeze', 'Mark old xids as frozen (never age)', 'vacuum_freeze_min_age'],
          ['Autovacuum trigger', 'dead > threshold + scale x live', 'autovacuum_vacuum_threshold / _scale_factor'],
          ['Cost limits', 'Throttle vacuum I/O', 'autovacuum_vacuum_cost_limit / _delay']
        ]
      },
      {
        type: 'interactive',
        title: '5. Autovacuum & Bloat Simulation',
        visual: 'vacuum-bloat'
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '7. Basic example: the bloat query',
        language: 'sql',
        code: `-- Which tables are bloated right now?
select
  relname,
  n_live_tup,
  n_dead_tup,
  round(n_dead_tup::numeric / nullif(n_live_tup + n_dead_tup, 0) * 100, 1) as dead_pct,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  last_vacuum, last_autovacuum
from pg_stat_user_tables
order by n_dead_tup desc
limit 10;

-- Manual vacuum for a hot table:
vacuum (analyze, verbose) orders;`
      },
      {
        type: 'code',
        title: '8. Medium example: tuning autovacuum for a high-write table',
        language: 'sql',
        code: `-- The default (20% of rows dead) is too lazy for write-heavy tables:
alter table orders set (
  autovacuum_vacuum_scale_factor = 0.05,    -- wake at 5% dead instead of 20%
  autovacuum_vacuum_threshold = 100,
  autovacuum_vacuum_cost_limit = 2000       -- work faster per pass
);

-- Per-index autovacuum (index bloat):
alter index orders_user_id_idx set (
  autovacuum_vacuum_scale_factor = 0.05
);

-- Verify the settings:
select relname, reloptions from pg_class where relname = 'orders';

-- For always-updating tables, consider reducing fillfactor so page
-- splits reserve room for in-place HOT updates:
alter table orders set (fillfactor = 80);`
      },
      {
        type: 'code',
        title: '9. Complex example: zero-downtime REINDEX and pg_repack',
        language: 'sql',
        code: `-- Bloat query for indexes:
select
  schemaname, relname, indexrelname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  pg_stat_get_numscans(indexrelid) as scans
from pg_stat_user_indexes
order by pg_relation_size(indexrelid) desc
limit 10;

-- Standard rebuild (takes ACCESS EXCLUSIVE — maintenance window only):
reindex index orders_user_id_idx;

-- CONCURRENT rebuild (no blocking — production-safe):
reindex index concurrently orders_user_id_idx;
-- (requires a free slot; cannot run in a transaction block)

-- TABLE-level defrag without downtime: pg_repack
create extension pg_repack;
pg_repack -d postgres -t public.orders -k
-- (builds a shadow copy, swaps via a lock-free dance; needs 2x space)

-- Emergency freeze check (wraparound deadline):
select datname, age(datfrozenxid) from pg_database order by 2 desc;`
      },
      {
        type: 'callout',
        title: 'Long transactions are bloat\'s best friend',
        body: 'A single session with an open snapshot (even idle-in-transaction) blocks vacuum from removing EVERYTHING created after its snapshot. One forgotten app connection can pin gigabytes of dead tuples. Set idle_in_transaction_session_timeout and monitor longest running transaction — the cheapest bloat prevention there is.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: what VACUUM actually does',
        body: [
          'VACUUM scans heap pages, for each dead tuple removes it and records the freed line pointers in the Free Space Map; it also sets all-visible/all-frozen bits in the visibility map when every remaining tuple is visible (and old enough to freeze). It then walks indexes removing entries pointing to dead tuples. Index-only scans rely on the visibility map: pages marked all-visible skip heap fetches. Because VACUUM cannot run while a transaction holds a snapshot that sees the dead tuples, cleanup waits — hence the long-transaction trap. autovacuum is a sleeping worker woken when dead tuple counts exceed threshold + scale x live.'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Disabling autovacuum "to save load"', 'Tables bloat to multiples of their size', 'Tune thresholds instead; never disable'],
          ['Long-lived app connections with open snapshots', 'Vacuum starvation; bloat grows unbounded', 'idle_in_transaction_session_timeout + monitoring'],
          ['REINDEX without CONCURRENTLY on live tables', 'Blocks writes for the whole rebuild', 'REINDEX INDEX CONCURRENTLY / pg_repack'],
          ['Ignoring index bloat', 'Index scans cost 3x; memory waste', 'Track index sizes; rebuild periodically'],
          ['fillfactor 100 on update-heavy tables', 'Every update splits pages (HOT fails)', 'fillfactor 70-85 on hot tables']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Keep a weekly bloat report: dead_pct and index sizes per top-20 tables.',
          'Before release-freeze: run a maintenance pass (VACUUM FULL in a window) if bloat is bad.',
          'For very large tables, partition so VACUUM works per chunk.',
          'Wraparound: warn at 1B, emergency at 1.5B; autovacuum_freeze_max_age default 200M makes freezing proactive.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: Why does a DELETE not shrink the table? Answer: MVCC dead tuples remain until VACUUM; space returns to the Free Space Map for reuse, and only VACUUM FULL/CLUSTER physically compacts the file (with a full lock).',
          'Question: How do you fix bloat on a huge live table? Answer: Diagnose (dead_pct + long transactions), stop the cause (timeout idle transactions), tune autovacuum per table, then defrag with REINDEX CONCURRENTLY and pg_repack — never VACUUM FULL on the primary during peak.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Create a 1M-row table, update it in bulk, and watch dead_pct grow.',
          '2. Let autovacuum reclaim; verify size and dead_pct drop.',
          '3. Hold a repeatable-read snapshot open and observe VACUUM waiting (blocking) — then rollback and repeat.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "VACUUM", "Automatic Vacuuming", "The Visibility Map"',
          'Next: Outbox Pattern'
        ]
      }
    ]
  }
];
