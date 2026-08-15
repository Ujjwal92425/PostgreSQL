import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const awsRdsNotes: NotePage[] = [
  {
    topicId: '14-aws-rds',
    slug: 'rds-vs-aurora',
    title: 'RDS vs Aurora',
    description: 'Compare standard AWS RDS PostgreSQL with Amazon Aurora PostgreSQL storage engine architectures.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what RDS and Aurora are',
        body: [
          'AWS RDS runs standard PostgreSQL on EBS volume block storage with managed backups, patching, and failover. Amazon Aurora PostgreSQL is a re-engineered PostgreSQL-compatible engine that decouples compute from storage, replicating log-structured storage across 6 copies in 3 Availability Zones (AZs) with auto-scaling disk volumes.',
          'What they do: both are managed PostgreSQL services; the difference is the storage architecture underneath — EBS-attached disks vs a distributed log-based storage fabric.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'The engine choice changes your failover time, replica count, storage growth behavior, and pricing model — all visible in outages and monthly bills. Aurora is not "RDS but faster everywhere": its advantages show in replication and storage, its costs in compute pricing and some PostgreSQL feature gaps.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'RDS is a managed car with a normal engine: you rent the car, but the engine is the same one you know. Aurora is a hybrid: the bodywork and dashboard look identical (PostgreSQL-compatible), but the engine is electric — the "gas tank" is a shared, self-healing storage grid that every instance reads, instead of one disk bolted to one car.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: architectural comparison',
        headers: ['Feature', 'AWS RDS PostgreSQL', 'Amazon Aurora PostgreSQL'],
        rows: [
          ['Storage engine', 'Amazon EBS (gp3/io2)', 'Distributed log-structured 6-way storage'],
          ['Replication lag', '10ms - 100ms (physical streaming)', '< 10ms (shared storage volume)'],
          ['Failover time', '60s - 120s', '10s - 30s'],
          ['Read replicas', 'Up to 5 (data copied per replica)', 'Up to 15 (zero storage cost replication)'],
          ['Storage scaling', 'Manual / fixed size', 'Auto-grows to 128 TiB'],
          ['Data model compatibility', '100% stock PostgreSQL', 'PostgreSQL-compatible (feature gaps)']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: how the choice shows up in SQL behavior',
        language: 'sql',
        code: `-- Both engines accept the SAME SQL. The difference is operational:

-- Aurora exposes cluster-specific views:
select * from information_schema.aurora_replica_status;      -- Aurora only

-- And cluster endpoints in DNS (writer vs reader):
--   mycluster.cluster-XXXX.us-east-1.rds.amazonaws.com   (writer)
--   mycluster.cluster-ro-XXXX.us-east-1.rds.amazonaws.com (reader/load balancer)

-- RDS single instance uses one endpoint:
--   mydb.XXXX.us-east-1.rds.amazonaws.com

-- Read-your-own-write check on Aurora: use the writer endpoint for
-- writes, then read via reader endpoint — lag is ms, but still lag:
select pg_last_wal_replay_lsn() as reader_lsn,
       pg_current_wal_lsn()    as writer_lsn;   -- compare the two`
      },
      {
        type: 'code',
        title: '7. Medium example: choosing parameters that differ between engines',
        language: 'sql',
        code: `-- Both run parameter groups, but some knobs behave differently:

-- RDS: stock behavior for autovacuum/checkpointing on EBS
alter system set autovacuum_vacuum_scale_factor = 0.05;
alter system set checkpoint_completion_target = 0.9;
select pg_reload_conf();

-- Aurora: storage is log-structured — full page writes are less relevant
-- and crash recovery is faster; also has its own storage telemetry:
select * from aurora_heartbeat;                  -- Aurora storage health
select * from aurora_global_db_status;           -- Aurora Global Database

-- Engine versions: Aurora trails stock PostgreSQL releases by months —
-- check the compatibility matrix before adopting new PG features.`
      },
      {
        type: 'code',
        title: '8. Complex example: failover behavior and connection handling',
        language: 'sql',
        code: `-- RDS Multi-AZ failover: DNS + 60-120s outage; the app MUST reconnect.
-- Aurora failover: reader promoted in seconds; app should use the
-- cluster endpoint and retry-on-connection-reset.

-- Production-ready app connection logic (pseudo):
--   1. Always connect via the CLUSTER endpoint (writer or reader role).
--   2. On connection error, retry with exponential backoff for 60s.
--   3. Use the reader endpoint for read-heavy reports.
--   4. Verify which role you are on after failover:

select pg_is_in_recovery();   -- true => you are on a reader

-- Aurora Global Database (cross-region DR, 1s+ lag) adds:
--   primary region writes -> secondaries replicate asynchronously
--   promoted at DR time via the global cluster endpoint.`
      },
      {
        type: 'callout',
        title: 'Feature gap reality check',
        body: 'Aurora PostgreSQL is compatible but not identical: some extensions (e.g. PostGIS versions) and features lag or differ, and storage-mapped behavior like crash recovery differs. Always test the specific PostgreSQL features your app uses against the Aurora engine version before committing.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: why Aurora behaves differently',
        body: [
          'RDS runs stock postgres binaries on an EBS volume: WAL and heap share one disk device; replication copies WAL to separate instances; failover requires a new instance to mount and replay. Aurora instead writes WAL records to a distributed storage service (6 copies, quorum of 4) where compute instances are stateless readers of that log — the log IS the storage, heap pages are materialized on demand. This is why replication is near-free (no WAL shipping to replicas; they read the same storage) and recovery is fast (no WAL replay from a cold disk).'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Choosing Aurora for tiny workloads', 'Compute price premium with no storage benefit', 'Start RDS; migrate when storage/replica limits bite'],
          ['Aurora with 15 readers hammering reader endpoint', 'Reader instances still have compute limits', 'Balance readers; cache hot queries'],
          ['Assuming 100% extension compatibility', 'PostGIS/extension versions differ', 'Check the Aurora extension matrix first'],
          ['RDS app code with hardcoded instance endpoint', 'Failover changes the IP; app breaks', 'Use cluster/reader endpoints + retry logic'],
          ['Ignoring I/O cost classes', 'Storage I/O charges surprise the bill', 'Use Aurora I/O-Optimized for heavy workloads']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'RDS: pick io2/gp3 by I/O pattern; enable Performance Insights and Enhanced Monitoring.',
          'Aurora: use Serverless v2 for spiky traffic; I/O-Optimized for sustained I/O.',
          'Set up read-your-own-write: writes through writer endpoint, reads tolerant of ms lag.',
          'Test failover with a quarterly drill: kill the writer and measure app recovery.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: RDS vs Aurora — when would you pick each? Answer: RDS for standard managed PostgreSQL with predictable cost and full stock behavior; Aurora when you need sub-minute failover, many readers, or multi-TB auto-scaling storage — accepting the premium and version gap.',
          'Question: How does Aurora get near-zero replication cost? Answer: All instances read the same distributed storage log; replicas do not copy WAL — they replay from shared storage, so reader count and storage don\'t multiply.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Map your app\'s SQL and extensions against the Aurora compatibility matrix.',
          '2. Design the endpoint strategy: which traffic uses writer vs reader endpoints?',
          '3. Draft the failover runbook including the retry logic and DNS changes.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'AWS docs: "Amazon Aurora PostgreSQL" and "RDS for PostgreSQL"',
          'Next: Multi-AZ and Read Replicas'
        ]
      }
    ]
  },
  {
    topicId: '14-aws-rds',
    slug: 'multi-az-read-replicas',
    title: 'Multi-AZ and Read Replicas',
    description: 'Design high availability (HA) Multi-AZ deployments, parameter groups, read scaling, and failover drills.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what Multi-AZ and read replicas are',
        body: [
          'Multi-AZ creates a synchronous standby replica in a second Availability Zone for automatic infrastructure failover. Read Replicas scale read queries horizontally off the Primary engine.',
          'What they do: Multi-AZ protects against AZ loss with automatic promotion; read replicas move analytical/reporting load off the primary so OLTP latency stays stable.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need them',
        body: [
          'An AZ outage or primary crash without HA means downtime measured in hours while you rebuild. Without read replicas, reporting queries compete with checkout traffic for CPU and I/O on the one engine. Multi-AZ + replicas are the difference between an incident and a page.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Multi-AZ is a backup generator in a second building: it is always running, takes over automatically when the main power dies, but it does not serve load. Read replicas are extra checkout lanes: they serve customers (reads) while the main lane keeps taking orders (writes) — but they see the receipt book with a small delay (lag).'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: comparison',
        headers: ['Aspect', 'Multi-AZ standby', 'Read replica'],
        rows: [
          ['Purpose', 'Availability / failover target', 'Read scaling'],
          ['Replication', 'Synchronous', 'Asynchronous (small lag)'],
          ['Serves reads', 'No (standby only)', 'Yes'],
          ['Promotion', 'Automatic on failure', 'Manual or via failover management'],
          ['Cost', 'Full instance cost', 'Full instance cost each']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: replica configuration essentials',
        language: 'sql',
        code: `-- Create a read replica from the RDS console/CLI (no SQL involved):
--   aws rds create-db-instance-read-replica
--     --db-instance-identifier orders-replica-1
--     --source-db-instance-identifier orders-primary
--     --availability-zone us-east-1b
--     --db-instance-class db.r6g.xlarge

-- Point reporting at the replica's endpoint:
--   orders-replica-1.CLUSTER.us-east-1.rds.amazonaws.com:5432

-- Verify replica health:
select now() - pg_last_xact_replay_timestamp() as replica_lag
from pg_stat_wal_receiver;   -- or pg_stat_replication on the primary

-- Promote (manual failover):
--   aws rds promote-read-replica --db-instance-identifier orders-replica-1`
      },
      {
        type: 'code',
        title: '7. Medium example: parameter groups and instance sizing',
        language: 'sql',
        code: `-- Parameter groups are cluster-level (RDS) or cluster-parameter-group (Aurora):
--   custom-pg-orders: shared_buffers=25% RAM, work_mem=16MB,
--                     max_connections=500, autovacuum tuned for the workload

-- Sizing checklist (from the workload, not guesses):
--   CPU: avg 40% on writers, 70% on readers (headroom for spikes)
--   Memory: shared_buffers + work_mem x connections < RAM - OS
--   Storage: growth rate x retention; io2 IOPS = read+write IOPS

-- After changing parameters, apply immediately or in the next window:
--   aws rds modify-db-parameter-group --db-parameter-group-name custom-pg-orders
--   (apply-method: immediate | pending-reboot)`
      },
      {
        type: 'code',
        title: '8. Complex example: failover drill runbook',
        language: 'sql',
        code: `-- BEFORE the drill: record the baseline
select pg_is_in_recovery(), pg_last_xact_replay_timestamp() from pg_stat_wal_receiver;

-- STEP 1: Reboot the primary with forced failover (RDS Multi-AZ):
--   aws rds reboot-db-instance --db-instance-identifier orders-primary
--     --force-failover

-- STEP 2: App observes the connection reset; the retry logic reconnects
-- to the same endpoint (RDS moves DNS to the promoted standby).

-- STEP 3: Verify recovery:
select pg_is_in_recovery();            -- false => we are the new writer
select * from pg_stat_replication;     -- replication resumed

-- STEP 4: Check data continuity — the promoted standby had zero data loss:
select count(*) from orders;           -- matches pre-failover count

-- STEP 5: Log the drill: RTO = time to serve writes; document deviations.
-- Quarterly repeats keep the runbook honest.`
      },
      {
        type: 'callout',
        title: 'Replica lag is a real, tunable number',
        body: 'Replica lag (RDS ReplicaLag metric) grows with big writes, DDL, and autovacuum on the primary. Reads from replicas are stale by design — alert when lag exceeds your SLA (e.g. 10s), and keep read-your-own-write paths on the writer endpoint. Do not put analytics-heavy scans on the only replica if OLTP reports also use it.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how Multi-AZ/replicas work underneath',
        body: [
          'RDS Multi-AZ runs a synchronous standby: every commit waits for the standby\'s acknowledgment (synchronous replication semantics), which adds a few ms but guarantees zero data loss on AZ failover. Read replicas use normal streaming replication (async), so lag depends on network and replay speed. On promotion, the replica finishes replaying buffered WAL and transitions to primary (standby promotion). Aurora\'s shared-storage model makes "replicas" nearly free, as covered in the RDS vs Aurora page.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Multi-AZ in the SAME AZ', 'Defeats the purpose — one AZ kills both', 'Choose two distinct AZs'],
          ['Reads on the primary + replicas unmonitored', 'Primary saturation; replicas silently lag', 'Route traffic; alert on lag'],
          ['Forgetting the read-only flag on replicas', 'Writes fail with "cannot execute in a read-only transaction"', 'Document replica role; app uses reader endpoint'],
          ['Failing over without app retry logic', 'Connections die mid-request; 5xx storm', 'Connection pools with failover-aware retry'],
          ['Oversized replicas for analytics', 'Costs double with no HA value', 'Match replica size to read workload only']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Synchronous standby adds commit latency — measure before enabling Multi-AZ sync.',
          'Use one replica per workload family (reporting vs user-facing reads).',
          'Automate failover verification in CI: promote, assert, fail back.',
          'Cost: Multi-AZ doubles instance cost; replicas add full instance cost each — size deliberately.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Multi-AZ vs read replicas? Answer: Multi-AZ is a synchronous standby for automatic failover (availability); read replicas are asynchronous copies serving reads (scalability). You usually want both.',
          'Question: What breaks in failover? Answer: Application connections (reset), in-flight transactions (lost), and session state; the database itself resumes consistent — hence retry logic and connection pooling.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Draw the deployment topology: writer, Multi-AZ standby, 2 read replicas, and app routing.',
          '2. Write the SQL to verify replica lag and read-only state.',
          '3. Plan a failover drill: steps, success criteria, rollback.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'AWS docs: "Multi-AZ deployments", "Working with read replicas"',
          'Next: Metrics and Alerts'
        ]
      }
    ]
  }
];
