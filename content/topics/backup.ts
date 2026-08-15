import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const backupNotes: NotePage[] = [
  {
    topicId: '11-backup-recovery',
    slug: 'backup-types',
    title: 'Backup Types',
    description: 'Compare logical dumps (pg_dump), physical base backups (pg_basebackup), and WAL archiving.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what the backup types are',
        body: [
          'Logical backups (pg_dump, pg_dumpall) output SQL text scripts (or custom archives) that recreate tables and data. Physical backups (pg_basebackup) take a binary copy of the database cluster file directory on disk.',
          'What they do: logical backups restore into ANY compatible PostgreSQL (even different versions) and can select subsets of data; physical backups restore the exact cluster state byte-for-byte and are the foundation for Point-in-Time Recovery.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Backups are the last line of defense: accidental DROP, corrupt data, ransomware, or a bad migration — each has a different optimal restore path. Choosing the wrong backup type means hours (or never) of recovery, which is why production runs BOTH logical (for surgical restore) and physical + WAL archiving (for PITR).'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'A logical backup is a printed transcript of your ledger: readable, portable, restorable into any book — but it is a copy of a snapshot in time. A physical backup is a photocopy of the ledger pages themselves: identical down to the binding, perfect for cloning, and combined with the daily transactions journal (WAL archive) it lets you rewind to ANY minute.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: backup type comparison',
        headers: ['Aspect', 'pg_dump (logical)', 'pg_basebackup (physical)'],
        rows: [
          ['Output', 'SQL/custom/directory archive', 'Binary copy of the cluster'],
          ['Granularity', 'Per database / table / schema / data only', 'Whole cluster'],
          ['Version portability', 'Yes (older -> newer)', 'No (same major version)'],
          ['Supports PITR', 'No (single point in time)', 'Yes (with WAL archive)'],
          ['Speed', 'Slow on big data (re-executes SQL)', 'Fast (file copy)'],
          ['Restore target', 'Any new server', 'Same/other cluster layout']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: logical dump and restore',
        language: 'sql',
        code: `-- Single database, custom format (compressed, parallel-restorable):
pg_dump -h localhost -U postgres -F c -f /backups/orders.backup postgres_db

-- Restore with parallel jobs:
pg_restore -h localhost -U postgres -d restored_db -j 8 /backups/orders.backup

-- Data-only vs schema-only:
pg_dump --schema-only -f schema.sql postgres_db
pg_dump --data-only -f data.sql postgres_db

-- Specific table (surgical restore for a bad migration):
pg_dump -t public.orders -F c -f orders_table.backup postgres_db`
      },
      {
        type: 'code',
        title: '7. Medium example: high-speed parallel dump & restore',
        language: 'sql',
        code: `-- Parallel dump in custom directory format (-j 8 jobs):
pg_dump -h localhost -U postgres -F d -j 8 -f /backups/db_dump postgres_db

-- Parallel restore into a fresh database:
pg_restore -h localhost -U postgres -d postgres_restored -j 8 /backups/db_dump

-- Directory format is REQUIRED for parallel jobs;
-- custom format (-F c) supports parallel RESTORE but not parallel dump.

-- Verify the dump is restorable WITHOUT restoring (--list):
pg_restore --list /backups/db_dump | head -20`
      },
      {
        type: 'code',
        title: '8. Complex example: physical base backup + WAL archiving',
        language: 'sql',
        code: `-- postgresql.conf:
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /wal_archive/%f && cp %p /wal_archive/%f'

-- Base backup (while the primary keeps serving!):
pg_basebackup -h localhost -U repl -D /backups/base_$(date +%F) -X stream -P

-- Typical backup policy:
--   hourly: pg_basebackup (or daily + incremental tools)
--   continuous: WAL segments copied by archive_command
--   daily: pg_dump -F c for surgical restores
--   weekly: test restore drill (the backup that is never restored
--           is a backup that might not work!)`
      },
      {
        type: 'callout',
        title: 'Test your restores',
        body: 'A backup you have never restored is an unverified hope. Production teams schedule restore drills (weekly logical, quarterly full PITR) and measure recovery time. The RTO you promise your stakeholders is fiction until a drill proves it.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how each backup works',
        body: [
          'pg_dump connects as a normal client and reads table data through SQL (SELECT ...), plus the catalogs for schema; custom format stores compressed data with a TOC for selective restore. pg_basebackup copies the data directory with pg_start_backup/pg_stop_backup style labeling (or the -X stream WAL), producing a consistent cluster image: any backups that overlap WAL activity include the required WAL segment. Restoring a base backup replays WAL from the label point, which is exactly the PITR path.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Logical dump on a 500GB database', 'Hours to dump, hours to restore, load on the primary', 'Physical base backup + WAL for size; dumps for small surgical needs'],
          ['No archive_command or broken one', 'PITR silently impossible', 'Test archive_command and verify files land'],
          ['Backups stored on the same host', 'Disk failure destroys data and backup together', 'Off-site / object storage, different AZ'],
          ['Never restoring', 'Restore always fails at the worst moment', 'Scheduled restore drills'],
          ['pg_dump during heavy write peak', 'Consistent but long and lock-touching', 'Use --no-sync, low work_mem, off-peak window']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Define RPO (acceptable data loss) and RTO (recovery time) — then pick: WAL every 5 min -> RPO=5min; base backup + archive -> RTO=hours.',
          'Encrypt backups at rest and in transit; protect credentials separately.',
          'Keep N copies in M locations (3-2-1 rule) and automate retention cleanup.',
          'For managed clouds, layer your own logical dumps on top of vendor snapshots.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Logical vs physical backup? Answer: Logical = SQL/custom archive, portable, selective restore, no PITR; physical = byte copy of the cluster, required for PITR, same-version only. Production uses both.',
          'Question: What is your backup strategy? Answer: Hourly base backups, continuous WAL archiving (RPO minutes), daily logical dumps for surgical restores, monthly restore drills, off-site storage.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Dump and restore a scratch database; verify row counts match.',
          '2. Run a parallel dump/restore and measure the speedup vs serial.',
          '3. Configure archive_command with a scratch WAL archive and confirm segments arrive.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Backup and Restore" chapter (pg_dump, pg_basebackup, archive)',
          'Next: Point-in-Time Recovery'
        ]
      }
    ]
  },
  {
    topicId: '11-backup-recovery',
    slug: 'point-in-time-recovery',
    title: 'Point-in-Time Recovery',
    description: 'Restore a database cluster to an exact target timestamp or LSN using WAL archive logs.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what PITR is',
        body: [
          'Point-in-Time Recovery (PITR) combines a physical base backup with continuous WAL segment archiving, allowing database administrators to restore the database to any exact millisecond timestamp prior to a catastrophic data error (e.g. accidental DROP TABLE).',
          'What it does: it replays WAL from the base backup forward, then stops at the chosen timestamp — a "rewind" button for the whole cluster.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'The two most expensive words in database ops are "accidental deletion". PITR is the only tool that restores to BEFORE the bad statement instead of the last backup. Combined with a good RPO (WAL archive frequency), it turns an "hours of lost data" incident into "the 5 minutes before the mistake".'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The base backup is a photograph of the ledger; WAL segments are the daily transaction journal that follows it. PITR is a librarian with a rewind dial: photo on the table, journal in hand, spinning backward to the exact minute before the terrible entry was written — then locking the book there.'
        ]
      },
      {
        type: 'interactive',
        title: '4. Continuous Durability WAL Pipeline',
        visual: 'wal-pipeline'
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: the PITR restore sequence',
        language: 'sql',
        code: `-- 1) Restore the base backup to a NEW directory:
# tar -xzf /backups/base_2026-08-01.tgz -C /var/lib/postgresql/restore

-- 2) Point it at the WAL archive (postgresql.conf on the restored cluster):
restore_command = 'cp /wal_archive/%f %p'
recovery_target_time = '2026-08-05 14:31:22+00'   -- the moment BEFORE the mistake

-- 3) Signal recovery mode (PG12+):
# touch /var/lib/postgresql/restore/recovery.signal

-- 4) Start PostgreSQL — it replays WAL and stops at the target:
pg_ctl -D /var/lib/postgresql/restore start
# PostgreSQL 16.x: recovery ended at 2026-08-05 14:31:22+00, stop time reached`
      },
      {
        type: 'code',
        title: '7. Medium example: recovery targets — timestamp, LSN, XID, name',
        language: 'sql',
        code: `-- Timestamp (most common):
recovery_target_time = '2026-08-05 14:31:22+00'

-- LSN: recover to a specific WAL position (from a script that recorded it):
recovery_target_lsn = '0/4ABE8F0'

-- Transaction ID: after finding the bad txid in logs:
recovery_target_xid = '812345'

-- Named target: mark safe points in advance with pg_create_restore_point():
-- (as DBA, before risky operations)
select pg_create_restore_point('before_coupon_migration');

recovery_target_name = 'before_coupon_migration'

-- Inclusive/exclusive:
recovery_target_inclusive = false   -- stop BEFORE the target, not at it`
      },
      {
        type: 'code',
        title: '8. Complex example: full disaster drill script (simulate a DROP)',
        language: 'sql',
        code: `-- The incident:
--   DROP TABLE orders;  (accident, 14:31:25)
-- We have: base backup 2026-08-01, WAL archive up to now.

# 1. Restore the base backup to a fresh cluster directory
tar -xzf /backups/base_2026-08-01.tgz -C /data/pitr_restore

# 2. Configure PITR
cat >> /data/pitr_restore/postgresql.conf <<'EOF'
restore_command = 'cp /wal_archive/%f %p'
recovery_target_time = '2026-08-05 14:31:22+00'
EOF
touch /data/pitr_restore/recovery.signal

# 3. Start (replays ~4 days of WAL, lands right before the DROP)
pg_ctl -D /data/pitr_restore start

# 4. Sanity check — orders still exist:
psql -c "select count(*) from orders;"   -- expected: the count from BEFORE the drop

# 5. Extract ONLY the lost table and load it into production:
pg_dump -t public.orders /data/pitr_restore > orders_recovered.sql
psql -f orders_recovered.sql production_db

# 6. Verify production: counts match, spot-check recent orders.`
      },
      {
        type: 'callout',
        title: 'PITR restores the whole cluster — extract, don\'t merge',
        body: 'A PITR restore cannot coexist with production on the same port. Restore to a side cluster, verify, then export the affected objects and re-import into production. Never try to merge WAL-recovered files directly into a live cluster.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how recovery replays WAL',
        body: [
          'At startup, PostgreSQL checks for recovery.signal/standby.signal. It loads the control file, locates the WAL start point from the base backup label, then reads WAL segments from restore_command (or pg_wal), re-applying physical changes (XLOG records) through the startup process. recovery_target_* filters stop replay at the requested point; the system then runs with pg_is_in_recovery() = false and opens for writes. WAL segments are 16MB; archives that lose segments break PITR — archive integrity is the true backup.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['No WAL archiving configured', 'PITR impossible — only last base backup', 'archive_mode=on + verified archive_command'],
          ['Gaps in the archive', 'Recovery stops at the gap, possibly corrupt', 'Monitor archive list continuity (pg_backup_end / checksums)'],
          ['Wrong recovery_target_inclusive', 'Stops AFTER the bad transaction (data lost again)', 'Understand inclusive; verify with counts'],
          ['Restoring into the live data directory', 'Destroys the production cluster', 'Always a separate directory/cluster'],
          ['No restore drills', 'First PITR attempt fails under stress', 'Quarterly full PITR rehearsal with timing']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Set archive_timeout (e.g. 60s) to bound RPO even during quiet periods.',
          'Use pg_create_restore_point() before every risky migration for named targets.',
          'Store WAL archives off-host with integrity checks (pg_waldump spot checks).',
          'Document the runbook: who, where, how long; rehearse it.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: How does PITR achieve sub-5-minute RPO? Answer: Continuous WAL archiving: every committed change is copied to the archive; the base backup plus replay to target time = loss limited to the archive gap.',
          'Question: PITR vs logical dump? Answer: PITR rewinds the whole cluster to a point in time (physical replay); logical dumps restore a snapshot into any server — PITR for disasters, dumps for surgical/schema work.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Stand up a scratch cluster with WAL archiving; take a base backup.',
          '2. Simulate a DROP, run the PITR drill, and verify the table count.',
          '3. Test recovery_target_name with a restore point you created.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Continuous Archiving and Point-in-Time Recovery"',
          'Next: Roles and Grants'
        ]
      }
    ]
  }
];
