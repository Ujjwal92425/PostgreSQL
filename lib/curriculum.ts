export type Subtopic = {
  slug: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Production';
};

export type Topic = {
  id: string;
  title: string;
  summary: string;
  subtopics: Subtopic[];
};

export const topics: Topic[] = [
  {
    id: '00-foundations',
    title: 'Foundations',
    summary: 'Database mental models, relational thinking, ACID, CAP, OLTP, OLAP, and keys.',
    subtopics: [
      { slug: 'database-mental-model', title: 'Database Mental Model', level: 'Beginner' },
      { slug: 'dbms-rdbms-nosql', title: 'DBMS vs RDBMS vs NoSQL', level: 'Beginner' },
      { slug: 'acid-cap-oltp-olap', title: 'ACID, CAP, OLTP, OLAP', level: 'Intermediate' },
      { slug: 'keys-and-relationships', title: 'Keys and Relationships', level: 'Intermediate' }
    ]
  },
  {
    id: '01-core-sql',
    title: 'Core SQL',
    summary: 'DDL, DML, DQL, DCL, TCL, constraints, inserts, updates, deletes, and reads.',
    subtopics: [
      { slug: 'ddl-dml-dql-dcl-tcl', title: 'SQL Command Families', level: 'Beginner' },
      { slug: 'constraints', title: 'Constraints in Production', level: 'Intermediate' },
      { slug: 'writes-and-returning', title: 'Writes and RETURNING', level: 'Intermediate' }
    ]
  },
  {
    id: '02-data-types',
    title: 'Data Types',
    summary: 'Numeric precision, timestamps, JSONB, arrays, enums, ranges, inet, and UUIDs.',
    subtopics: [
      { slug: 'numeric-money-decimal', title: 'Numeric, Money, and Decimal Values', level: 'Intermediate' },
      { slug: 'jsonb-arrays-enums', title: 'JSONB, Arrays, and Enums', level: 'Intermediate' },
      { slug: 'ranges-time-inet', title: 'Ranges, Time, and Network Types', level: 'Advanced' }
    ]
  },
  {
    id: '03-joins-set-ops',
    title: 'Joins and Set Operations',
    summary: 'Inner, outer, lateral, semi joins, anti joins, UNION, INTERSECT, and EXCEPT.',
    subtopics: [
      { slug: 'join-types', title: 'Join Types', level: 'Intermediate' },
      { slug: 'join-algorithms', title: 'Nested Loop, Hash, and Merge Joins', level: 'Advanced' },
      { slug: 'set-operations', title: 'Set Operations', level: 'Intermediate' }
    ]
  },
  {
    id: '04-subqueries-window-functions',
    title: 'Subqueries and Windows',
    summary: 'Subqueries, CTEs, recursive CTEs, rankings, frames, and analytical SQL.',
    subtopics: [
      { slug: 'subqueries-and-ctes', title: 'Subqueries and CTEs', level: 'Intermediate' },
      { slug: 'recursive-ctes', title: 'Recursive CTEs', level: 'Advanced' },
      { slug: 'window-functions', title: 'Window Functions', level: 'Advanced' }
    ]
  },
  {
    id: '05-functions-plpgsql',
    title: 'Functions and Triggers',
    summary: 'SQL functions, PL/pgSQL, procedures, trigger timing, and trigger tradeoffs.',
    subtopics: [
      { slug: 'functions-procedures', title: 'Functions vs Procedures', level: 'Advanced' },
      { slug: 'triggers', title: 'Triggers', level: 'Production' }
    ]
  },
  {
    id: '06-indexing',
    title: 'Indexing',
    summary: 'B-tree, GIN, GiST, BRIN, partial, covering, composite, and expression indexes.',
    subtopics: [
      { slug: 'btree-indexes', title: 'B-tree Indexes', level: 'Advanced' },
      { slug: 'gin-gist-brin', title: 'GIN, GiST, and BRIN', level: 'Advanced' },
      { slug: 'index-selection', title: 'When Indexes Are Not Used', level: 'Production' }
    ]
  },
  {
    id: '07-query-optimization',
    title: 'Query Optimization',
    summary: 'EXPLAIN ANALYZE, planner estimates, statistics, query rewrites, and N+1 patterns.',
    subtopics: [
      { slug: 'explain-analyze', title: 'Reading EXPLAIN ANALYZE', level: 'Advanced' },
      { slug: 'planner-statistics', title: 'Planner Statistics', level: 'Production' },
      { slug: 'n-plus-one-pooling', title: 'N+1 and Connection Pooling', level: 'Production' }
    ]
  },
  {
    id: '08-transactions-locking',
    title: 'Transactions and Locking',
    summary: 'Isolation, MVCC, row locks, deadlocks, seat booking races, and durability.',
    subtopics: [
      { slug: 'transaction-basics', title: 'Transaction Basics', level: 'Intermediate' },
      { slug: 'seat-locking', title: 'Seat Locking Race Condition', level: 'Production' },
      { slug: 'mvcc-visibility', title: 'MVCC Visibility', level: 'Advanced' },
      { slug: 'deadlocks', title: 'Deadlocks', level: 'Production' }
    ]
  },
  {
    id: '09-schema-design-normalization',
    title: 'Schema Design and Normalization',
    summary: 'ER modeling, 1NF, 2NF, 3NF, BCNF, denormalization, and migration strategy.',
    subtopics: [
      { slug: 'normalization', title: 'Normalization 1NF to BCNF', level: 'Advanced' },
      { slug: 'denormalization', title: 'Denormalization Tradeoffs', level: 'Production' },
      { slug: 'expand-contract-migrations', title: 'Expand/Contract Migrations', level: 'Production' }
    ]
  },
  {
    id: '10-scaling-replication',
    title: 'Scaling and Replication',
    summary: 'Partitioning, logical replication, physical replicas, sharding, and consistency tradeoffs.',
    subtopics: [
      { slug: 'partitioning-orders', title: 'Partitioning Orders', level: 'Production' },
      { slug: 'replication', title: 'Replication', level: 'Production' },
      { slug: 'sharding', title: 'Sharding', level: 'Production' }
    ]
  },
  {
    id: '11-backup-recovery',
    title: 'Backup and Recovery',
    summary: 'pg_dump, physical backups, WAL archiving, restore drills, and PITR.',
    subtopics: [
      { slug: 'backup-types', title: 'Backup Types', level: 'Production' },
      { slug: 'point-in-time-recovery', title: 'Point-in-Time Recovery', level: 'Production' }
    ]
  },
  {
    id: '12-security',
    title: 'Security',
    summary: 'Roles, grants, row-level security, encryption, secrets, and least privilege.',
    subtopics: [
      { slug: 'roles-grants', title: 'Roles and Grants', level: 'Intermediate' },
      { slug: 'row-level-security', title: 'Row-Level Security', level: 'Production' },
      { slug: 'encryption', title: 'Encryption', level: 'Production' }
    ]
  },
  {
    id: '13-extensions',
    title: 'Extensions',
    summary: 'pg_stat_statements, pgcrypto, pg_trgm, citus, and extension risk management.',
    subtopics: [
      { slug: 'pg-stat-statements', title: 'pg_stat_statements', level: 'Production' },
      { slug: 'pgcrypto-pgtrgm', title: 'pgcrypto and pg_trgm', level: 'Advanced' }
    ]
  },
  {
    id: '14-aws-rds',
    title: 'AWS RDS and Aurora',
    summary: 'RDS vs Aurora, Multi-AZ, replicas, parameter groups, sizing, cost, and failover.',
    subtopics: [
      { slug: 'rds-vs-aurora', title: 'RDS vs Aurora', level: 'Production' },
      { slug: 'multi-az-read-replicas', title: 'Multi-AZ and Read Replicas', level: 'Production' }
    ]
  },
  {
    id: '15-monitoring-maintenance',
    title: 'Monitoring and Maintenance',
    summary: 'Metrics, alerts, VACUUM, autovacuum, bloat, slow queries, and operational routines.',
    subtopics: [
      { slug: 'metrics-alerts', title: 'Metrics and Alerts', level: 'Production' },
      { slug: 'vacuum-bloat', title: 'VACUUM and Bloat', level: 'Production' }
    ]
  },
  {
    id: '16-system-design',
    title: 'System Design',
    summary: 'CDC, outbox, order processing, event publishing, and database design interviews.',
    subtopics: [
      { slug: 'outbox-pattern', title: 'Outbox Pattern', level: 'Production' },
      { slug: 'cdc', title: 'Change Data Capture', level: 'Production' },
      { slug: 'order-processing-system', title: 'Order Processing System', level: 'Production' }
    ]
  }
];

export const orderedPages = topics.flatMap((topic) =>
  topic.subtopics.map((subtopic) => ({
    topicId: topic.id,
    topicTitle: topic.title,
    ...subtopic,
    href: `/notes/${topic.id}/${subtopic.slug}`
  }))
);

export function getPagePosition(topicId: string, slug: string) {
  const index = orderedPages.findIndex((page) => page.topicId === topicId && page.slug === slug);

  return {
    current: index >= 0 ? orderedPages[index] : undefined,
    previous: index > 0 ? orderedPages[index - 1] : undefined,
    next: index >= 0 && index < orderedPages.length - 1 ? orderedPages[index + 1] : undefined
  };
}
