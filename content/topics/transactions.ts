import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const transactionsNotes: NotePage[] = [
  {
    topicId: '08-transactions-locking',
    slug: 'transaction-basics',
    title: 'Transaction Basics',
    description: 'What transactions are, isolation levels (Read Committed, Repeatable Read, Serializable), and the phenomena they prevent.',
    level: 'Intermediate',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what transactions and isolation levels are',
        body: [
          'A transaction is a single logical unit of work bounded by BEGIN and COMMIT or ROLLBACK. An isolation level is the contract that defines which concurrent changes a transaction may see.',
          'PostgreSQL supports the ANSI SQL isolation levels: Read Committed (default), Repeatable Read, and Serializable (SSI), each trading consistency for concurrency.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'The isolation level determines the failure modes you must handle in code: duplicate seat bookings (serialization errors), lost updates (dirty/lost updates), and inconsistent reads. Most production apps run fine on Read Committed with row locks; Serializable is the safety net for complex multi-row invariants.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Imagine four people reading a shared whiteboard. Read Committed: each statement looks at the board freshly, so you might see different numbers between two statements in your session. Repeatable Read: you take a photograph (snapshot) at your first statement and read only that photo for the whole transaction. Serializable: the DB rewinds and replays conflicting transactions so the result equals them having run one after the other.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: isolation levels and phenomena',
        headers: ['Level', 'Dirty read', 'Non-repeatable read', 'Phantom / serialization anomaly', 'PostgreSQL default?'],
        rows: [
          ['Read Uncommitted', 'Possible (not real in PG)', 'Possible', 'Possible', 'No â€” PG maps it to Read Committed'],
          ['Read Committed', 'Prevented', 'Possible', 'Possible', 'Yes (default)'],
          ['Repeatable Read', 'Prevented', 'Prevented', 'Prevented (snapshot)', 'No'],
          ['Serializable', 'Prevented', 'Prevented', 'Prevented (SSI + retries)', 'No']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: BEGIN/COMMIT/ROLLBACK and autocommit pitfalls',
        language: 'sql',
        code: `-- Without BEGIN, every statement autocommits:
insert into audit_logs (actor_user_id, action, entity_type, entity_id)
values ('usr_9021a', 'login', 'user', 'usr_9021a');
-- ^ committed immediately, cannot be rolled back

-- Explicit transaction:
begin;
insert into audit_logs (actor_user_id, action, entity_type, entity_id)
values ('usr_9021a', 'login', 'user', 'usr_9021a');
rollback;   -- nothing was written
select count(*) from audit_logs where action = 'login';   -- 0`
      },
      {
        type: 'code',
        title: '7. Medium example: setting the isolation level',
        language: 'sql',
        code: `begin transaction isolation level repeatable read;

-- Snapshot taken on the FIRST read; stable for the whole transaction
select total from orders where id = 'ord_9001';
-- ... long-running business logic ...
select total from orders where id = 'ord_9001';   -- SAME value, even if another
                                                  -- session committed a change

commit;

-- Serializable is set the same way:
begin isolation level serializable;
-- any serialization failure raises:
-- ERROR: could not serialize access due to read/write dependencies among transactions
rollback;`
      },
      {
        type: 'code',
        title: '8. Complex example: Repeatable Read vs Read Committed behavior',
        language: 'sql',
        code: `-- Session A (repeatable read)        | Session B (read committed, default)
begin isolation level repeatable read;   |
select sum(total) from orders            |
  where user_id = 'usr_9021a';           |  begin;
   -- snapshot S1 -> sum = 4219.70        |  update orders set total = total + 10
                                         |    where id = 'ord_9001';
                                         |  commit;
select sum(total) from orders            |
  where user_id = 'usr_9021a';           |
  -- still 4219.70 (snapshot S1!)       |
commit;                                  |

-- Under READ COMMITTED, the second SELECT would return 4229.70 (fresh snapshot).
-- Lesson: repeatable read prevents non-repeatable reads, but your app must
-- handle the serialization failure retry pattern on concurrent writers.`
      },
      {
        type: 'callout',
        title: 'The Serializable retry loop',
        body: 'Serializable transactions can abort at COMMIT with a serialization error even if the SQL was valid. Production code must catch error 40001 and retry the whole transaction a bounded number of times â€” this is the documented SSI contract.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how isolation is implemented',
        body: [
          'PostgreSQL implements isolation with MVCC snapshots, not locks. Read Committed takes a new snapshot per statement; Repeatable Read and Serializable take one snapshot per transaction (hence "snapshot isolation"). Serializable adds SSI (Serializable Snapshot Isolation): it tracks read/write dependencies between transactions and aborts one when the dependency graph would not be serializable. Reads never block writes and writes never block reads at any level.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Default Read Committed for multi-step business flows', 'Intermediate reads see committed changes mid-flow', 'Repeatable Read or explicit row locks'],
          ['Not handling serialization failures', 'Silent aborts = lost work', 'Retry loop on 40001'],
          ['Long transactions holding snapshots', 'Autovacuum cannot clean old tuples; table bloat', 'Keep transactions short; move I/O out'],
          ['BEGIN in the app, COMMIT in a different connection', 'The lock is never released (transaction dangles)', 'Manage transactions on one connection']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Keep transactions as short as possible â€” idle-in-transaction holds locks and blocks VACUUM.',
          'Set idle_in_transaction_session_timeout to kill forgotten open transactions.',
          'Prefer READ COMMITTED + SELECT FOR UPDATE for hot paths; Serializable only where truly needed.',
          'Test isolation behavior with two psql sessions before shipping concurrency-critical code.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Why does PostgreSQL allow dirty reads at all? Answer: It does not â€” Read Uncommitted behaves as Read Committed because MVCC always reads committed versions; the ANSI level is accepted but upgraded.',
          'Question: Repeatable Read vs Serializable? Answer: Both use one snapshot; Serializable additionally detects and aborts non-serializable interleavings (SSI), guaranteeing the outcome equals some serial order.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Reproduce the two-session sum example in both isolation levels.',
          '2. Set idle_in_transaction_session_timeout and observe an idle transaction get killed.',
          '3. Trigger a serialization error with two serializable transactions and implement the retry.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Transaction Isolation" and "Serializable Snapshot Isolation"',
          'Next: Seat Locking Race Condition'
        ]
      }
    ]
  },
  {
    topicId: '08-transactions-locking',
    slug: 'seat-locking',
    title: 'Seat Locking Race Condition',
    description: 'Prevent two concurrent buyers from booking the same seat using SELECT FOR UPDATE and unique constraints.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what the race condition is',
        body: [
          'A race condition occurs when concurrent backend requests read identical unreserved state and attempt simultaneous reservations. Explicit row-level locking (SELECT FOR UPDATE) forces concurrent requests to wait sequentially, and a UNIQUE constraint backstops every path.',
          'What it protects: the invariant "one seat, one booking" under thousands of concurrent checkout requests.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Ticket booking is the canonical interview and production concurrency problem: without locks, two buyers both see seat_b7 free and both get it. The fix must work at the database level because the check-then-insert is not atomic in application code.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The seat row is a hotel room key behind the front desk. SELECT FOR UPDATE means "hand me the key now and hold it" â€” the next buyer waits at the desk until you return it (COMMIT/ROLLBACK). The UNIQUE constraint is the deadbolt: even if someone sneaks past the desk, the second key cannot be cut.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the three defense layers',
        headers: ['Layer', 'Mechanism', 'Blocks'],
        rows: [
          ['1. Row lock', 'SELECT ... FOR UPDATE on the seat', 'Two concurrent checkouts of the same seat'],
          ['2. Unique constraint', 'unique (event_id, seat_id)', 'Any duplicate insert, even from other code paths'],
          ['3. Idempotency/hold expiry', 'seat_holds status + expires_at cleanup', 'Expired holds being resurrected']
        ]
      },
      {
        type: 'interactive',
        title: '5. High-Concurrency Seat Locking Visualizer',
        visual: 'seat-locking'
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '7. Basic example: the UNSAFE version (the bug)',
        language: 'sql',
        code: `-- Two buyers both run this WITHOUT locks:
select count(*) from seat_reservations
where event_id = 'evt_1001' and seat_id = 'seat_b7';   -- both see 0 (free)

insert into seat_reservations (id, event_id, seat_id, user_id, hold_id)
values (gen_random_uuid(), 'evt_1001', 'seat_b7', 'usr_9021a', 'hold_7712');

insert into seat_reservations (id, event_id, seat_id, user_id, hold_id)
values (gen_random_uuid(), 'evt_1001', 'seat_b7', 'usr_8192b', 'hold_7713');
-- With the unique constraint this second insert FAILS...
-- without it, both reservations exist and the seat is double-booked.`
      },
      {
        type: 'code',
        title: '8. Medium example: the SAFE version with SELECT FOR UPDATE',
        language: 'sql',
        code: `begin;

-- Acquire the row lock: the second buyer BLOCKS here until the first commits
select id
from seats
where id = 'seat_b7'
for update;

insert into seat_reservations (id, event_id, seat_id, user_id, hold_id)
values (gen_random_uuid(), 'evt_1001', 'seat_b7', 'usr_9021a', 'hold_7712');

update seat_holds
set status = 'used'
where id = 'hold_7712';

commit;

-- Result: exactly one reservation. The loser waits, then its predicate
-- re-evaluates; it can retry with a different seat.`
      },
      {
        type: 'code',
        title: '9. Complex example: locking with SKIP LOCKED for queue-style allocation',
        language: 'sql',
        code: `-- When ANY free seat is acceptable, don't make clients wait â€”
-- skip locked seats and grab one that is free right now:
begin;

select id
from seats
where event_id = 'evt_1001'
  and not exists (
    select 1 from seat_reservations sr
    where sr.event_id = 'evt_1001' and sr.seat_id = seats.id
  )
order by row_label, seat_number
limit 1
for update skip locked;

-- (Row chosen above is now locked for this transaction)

insert into seat_reservations (id, event_id, seat_id, user_id)
values (gen_random_uuid(), 'evt_1001', <locked_seat_id>, 'usr_9021a');

commit;

-- SKIP LOCKED: other buyers bypass locked rows instead of waiting,
-- so 1000 concurrent buyers each grab a DIFFERENT seat immediately.`
      },
      {
        type: 'callout',
        title: 'FOR UPDATE vs FOR SHARE vs SKIP LOCKED',
        body: 'FOR UPDATE takes an exclusive row lock (blocks other lockers); FOR SHARE allows concurrent readers but blocks writers; SKIP LOCKED skips rows already locked â€” perfect for job queues and seat allocation. All three require an index on the filtered columns to avoid locking the whole table.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: how row locks work',
        body: [
          'SELECT FOR UPDATE sets the tuple\'s xmax as a lock marker (no new tuple version). The lock lives in the transaction\'s lock table; waiting is managed by the lock manager with a queue (deadlock detection may abort one waiter after deadlock_timeout). The planner picks the row-lock strategy through RowMarkClause in the plan â€” an index scan with FOR UPDATE must lock rows as it reads them.'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Check-then-insert without locks', 'Double booking under concurrency', 'FOR UPDATE or unique constraint (or both)'],
          ['FOR UPDATE on a full-table filter', 'Locks every row it scans', 'Always filter on an indexed column'],
          ['No unique(event_id, seat_id) backstop', 'One buggy path breaks the invariant forever', 'Enforce the unique constraint always'],
          ['Holding locks during slow external calls', 'Convoy: everyone waits on the slow buyer', 'Keep the lock scope tiny: lock, insert, commit']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Use seat_holds with expires_at and a cleanup job: locks are only as good as hold expiry.',
          'Put a UNIQUE index on (event_id, seat_id) and handle the duplicate-key error as "seat taken".',
          'For flash-sale bursts, use SKIP LOCKED + retry instead of waiting in a queue.',
          'Monitor pg_stat_activity for long FOR UPDATE waits; alert at a threshold.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: How do you prevent double booking? Answer: Lock the row with SELECT FOR UPDATE, then insert inside the transaction, with a UNIQUE (event_id, seat_id) constraint as the final safety net.',
          'Question: What does FOR UPDATE SKIP LOCKED do? Answer: It skips rows locked by others instead of blocking â€” clients get different rows immediately, ideal for allocating one of N identical resources.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Reproduce the double-booking bug without the unique constraint.',
          '2. Run two sessions with FOR UPDATE and watch the second block.',
          '3. Test SKIP LOCKED with 5 concurrent sessions on 5 seats â€” verify no conflicts.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "Row-Level Locks" and "Locking Clauses"',
          'Next: MVCC Visibility'
        ]
      }
    ]
  },
  {
    topicId: '08-transactions-locking',
    slug: 'mvcc-visibility',
    title: 'MVCC Visibility',
    description: 'Deep dive into Multi-Version Concurrency Control, header flags (xmin, xmax), and tuple snapshots.',
    level: 'Advanced',
    readingTime: '30 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what MVCC is',
        body: [
          'Multi-Version Concurrency Control (MVCC) is PostgreSQL\'s mechanism to ensure readers never block writers and writers never block readers. Every tuple version carries a header with xmin (creating transaction ID) and xmax (deleting/updating transaction ID).',
          'What it does: each transaction computes a snapshot (the set of visible transaction IDs) and every tuple checks its xmin/xmax against that snapshot â€” making "who sees what" a pure arithmetic question, no locks needed for reads.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'MVCC explains everything: why UPDATE creates a new tuple (and old ones become dead), why long transactions bloat tables, why autovacuum exists, and why index-only scans need the visibility map. Without this model, production incidents (bloat, tuple-not-visible bugs) are undebuggable.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The heap is a wall of sticky notes. An update does not erase the old note â€” it sticks a new one on top with a new ID stamp. Each reader carries a snapshot of "IDs that were complete when I started reading" and simply ignores notes stamped later. Cleanup (VACUUM) removes notes nobody can ever see again.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: tuple header fields',
        headers: ['Field', 'Meaning', 'Visibility rule'],
        rows: [
          ['xmin', 'ID of the transaction that created this version', 'Visible if xmin is committed and < snapshot'],
          ['xmax', 'ID of the transaction that deleted/updated it (0 = alive)', 'Invisible if xmax is a committed active-in-snapshot txn'],
          ['cmin / cmax', 'Command counter within the transaction', 'Distinguishes statements inside one transaction'],
          ['infomask bits', 'Flags: inserted-in-progress, multixact, HOT, etc.', 'Fast-path visibility without checking pg_xact'],
          ['t_ctid', 'Pointer to the next version (or self)', 'Row-chasing for updates (HOT chains)']
        ]
      },
      {
        type: 'interactive',
        title: '5. MVCC Tuple Header Visibility Visualizer',
        visual: 'mvcc-visibility'
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '7. Basic example: seeing versions with a raw peek',
        language: 'sql',
        code: `-- Update a row twice and inspect the version chain via ctid/xmin:
create table demo (id int primary key, val text);
insert into demo values (1, 'v1');

begin;
update demo set val = 'v2' where id = 1;    -- xmax set on old version
update demo set val = 'v3' where id = 1;
commit;

-- The visible row:
select id, val, ctid from demo;   -- one row: (1, 'v3')

-- Dead versions are invisible but still on disk (until VACUUM):
-- pg_relation_size shows them: bloated demo = old versions sitting around.`
      },
      {
        type: 'code',
        title: '8. Medium example: the long-transaction bloat trap',
        language: 'sql',
        code: `-- Session A: long idle transaction pins a snapshot
begin isolation level repeatable read;
select count(*) from orders;      -- snapshot taken; will not move

-- Meanwhile Session B churns the table:
update orders set total = total where created_at < now();   -- 1M new versions

-- The old versions cannot be vacuumed while A's snapshot lives:
select pg_relation_size('orders') before;  -- small
-- (run B's update)
select pg_relation_size('orders') after;   -- ballooned

-- Root cause: xmax/xmin of old tuples are still "in the future"
-- relative to A's snapshot -> VACUUM skips them.
rollback;   -- releasing the snapshot lets autovacuum catch up`
      },
      {
        type: 'code',
        title: '9. Complex example: visibility map and index-only scans',
        language: 'sql',
        code: `-- Index-only scans need to skip the heap read entirely.
-- That requires ALL tuple versions in a page to be visible to everyone:
create index orders_io_idx on orders (user_id) include (total);

explain (analyze, buffers)
select user_id, total from orders where user_id = 'usr_9021a';
-- Output (shape):
-- Index Only Scan using orders_io_idx on orders
--   Heap Fetches: 0        <- visibility map says: safe, no heap visits
-- If Heap Fetches > 0, pages had dead tuples (after heavy updates);
-- VACUUM (or the next autovacuum pass) sets the all-visible bits:
vacuum orders;
-- Heap Fetches now drops to 0.`
      },
      {
        type: 'callout',
        title: 'The visibility map is the hidden hero',
        body: 'The visibility map (one bit per 8KB page) records which pages contain only visible tuples. It powers index-only scans (skip heap) AND lets VACUUM skip whole pages (skip frozen pages) â€” two of the biggest performance wins in PostgreSQL come from this single bit array.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: the snapshot algorithm',
        body: [
          'A snapshot is built from pg_active_snapshot stores of running transaction IDs; at statement start (Read Committed) or transaction start (Repeatable Read+). Visibility check: a tuple is visible if xmin < snapshot->xmin and committed, or in the committed-array; xmax handling mirrors it. The infomask fast path avoids pg_xact lookups. Old tuples are reclaimed by VACUUM (which sets hint bits and freezes tuples older than vacuum_freeze_min_age to handle XID wraparound).'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Long-running transactions', 'Snapshots pin dead tuples; bloat + wraparound pressure', 'Short transactions; idle_in_transaction_session_timeout'],
          ['Believing DELETE frees space instantly', 'Space only returns after VACUUM', 'Monitor dead_tuples and schedule VACUUM'],
          ['Forgetting snapshot differences across statements', 'Read Committed sees different data mid-transaction', 'Choose Repeatable Read when consistency matters'],
          ['Ignoring heap fetches in index-only scans', 'Silent performance loss after heavy writes', 'VACUUM to refresh the visibility map']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Watch max_dead_tuples vs autovacuum_vacuum_scale_factor on hot tables.',
          'Track age(datfrozenxid) â€” MVCC freezing lags are the #1 cause of emergency vacuuming.',
          'Use pg_stat_user_tables.n_dead_tup as the leading bloat signal.',
          'For analytics-heavy tables, consider storing rollups so MVCC churn stays low.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: How does PostgreSQL avoid read-write blocking? Answer: MVCC: readers use snapshots and tuple xmin/xmax headers; writers create new versions. Neither blocks the other â€” only write-write conflicts serialize via row locks.',
          'Question: Why do updates bloat the table? Answer: An UPDATE creates a new tuple version and marks the old one dead via xmax; space is only returned when VACUUM runs, and only for versions no snapshot can still see.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Create the demo table, update twice, and compare pg_relation_size before/after VACUUM.',
          '2. Hold a repeatable-read snapshot open while another session updates the same rows; verify you see the old values.',
          '3. Check pg_class.relfrozenxid and explain what wraparound protection is doing.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "MVCC", "VACUUM", and the visibility map description',
          'PostgreSQL source: src/backend/access/heap/README',
          'Next: Deadlocks'
        ]
      }
    ]
  },
  {
    topicId: '08-transactions-locking',
    slug: 'deadlocks',
    title: 'Deadlocks',
    description: 'Analyze deadlock detection (deadlock_timeout), lock mode graphs, and consistent lock acquisition ordering.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what deadlocks are',
        body: [
          'A deadlock occurs when two or more transactions hold locks on resources the other transaction needs to acquire â€” a circular wait. PostgreSQL automatically detects circular lock dependency graphs after deadlock_timeout (default 1s) and aborts one transaction with error 40P01.',
          'What it does: without detection, deadlocked transactions would wait forever; with detection, one victim aborts and the survivor proceeds.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Deadlocks are the most common concurrency failure in multi-table writes (orders + payments + inventory). They are not a bug to "fix away" entirely â€” they are an expected outcome you must handle: retry the aborted transaction. Understanding the wait graph tells you how to make them rare.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Two people meet in a doorway: A holds the left handle, B holds the right handle; each refuses to let go until the other moves first. Nobody moves. The deadlock detector is the referee who, after 1 second of frozen staring, taps one on the shoulder and sends them back to the queue (ROLLBACK + retry).'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the essentials',
        headers: ['Concept', 'Detail'],
        rows: [
          ['Wait-for graph', 'Nodes = transactions, edges = "waits for lock held by"'],
          ['Detection', 'Wakes on lock waits, builds the graph, finds cycles'],
          ['deadlock_timeout', 'How long a wait is tolerated before detection runs (default 1s)'],
          ['Error 40P01', 'deadlock_detected â€” application must retry the transaction'],
          ['Prevention', 'Lock rows in the same ORDER across all code paths']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: reproducing a deadlock',
        language: 'sql',
        code: `-- Session A                        Session B
begin;                              begin;
update inventory_items              update product_prices
  set available_qty = 9               set amount = 99.00
  where variant_id = 'var_5501';      where variant_id = 'var_5501';

update product_prices                update inventory_items
  set amount = 109.00                 set reserved_qty = 1
  where variant_id = 'var_5501';      where variant_id = 'var_5501';

-- A now waits on B's price lock; B waits on A's inventory lock.
-- After deadlock_timeout, one of them gets:
-- ERROR: deadlock detected (40P01) â€” the victim is rolled back
-- The survivor then acquires both locks and completes.`
      },
      {
        type: 'code',
        title: '7. Medium example: the fix â€” consistent lock ordering',
        language: 'sql',
        code: `-- Root cause: A locked inventory THEN prices; B locked prices THEN inventory.
-- Fix: every transaction acquires locks in the SAME sorted order.

-- Canonical order for our schema: inventory_items -> product_prices -> orders
begin;
update inventory_items set available_qty = 9
  where variant_id = 'var_5501';
update product_prices set amount = 99.00
  where variant_id = 'var_5501';
commit;

-- B uses the same order:
begin;
update inventory_items set reserved_qty = 1
  where variant_id = 'var_5501';
update product_prices set amount = 109.00
  where variant_id = 'var_5501';
commit;

-- Now B can only ever WAIT on A (never form a cycle), so no deadlock.`
      },
      {
        type: 'code',
        title: '8. Complex example: ordered multi-row locking with row ranking',
        language: 'sql',
        code: `-- Multi-row updates across two tables â€” acquire by sorted key:
begin;

-- 1) Lock inventory rows sorted by variant_id
select id from inventory_items
where variant_id in ('var_5501', 'var_5502')
order by variant_id
for update;

-- 2) Lock price rows sorted by id
select id from product_prices
where variant_id in ('var_5501', 'var_5502')
order by id
for update;

-- 3) Now do the writes
update inventory_items set available_qty = available_qty - 1
  where variant_id in ('var_5501', 'var_5502');
update product_prices set amount = amount * 1.0
  where variant_id in ('var_5501', 'var_5502');

commit;

-- The ORDER BY ... FOR UPDATE pattern guarantees all transactions
-- walk the same lock order -> cycles become impossible.`
      },
      {
        type: 'callout',
        title: 'Deadlock prevention rule',
        body: 'Always acquire locks on multiple tables or rows in the exact same sorted order (e.g. ORDER BY id ASC FOR UPDATE) across all backend application handlers. And always wrap transactions in a retry loop for 40P01 â€” prevention reduces, never eliminates, deadlocks.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: the detection algorithm',
        body: [
          'The lock manager (src/backend/storage/lmgr) records waiter-holder edges in a WaitLock queue. On each new lock wait, DeadLockCheck() runs a depth-first search of the wait-for graph; finding a cycle picks a victim by a cost heuristic (least total writes) and sends it error 40P01, releasing its locks so the cycle breaks. Detection only runs when a process has waited longer than deadlock_timeout â€” lowering it detects faster but burns CPU checking; raising it hides detection latency behind real waits.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Inconsistent lock order across services', 'Frequent deadlock storms at load peaks', 'Document and enforce one global lock order'],
          ['No retry on 40P01', 'Silent lost transactions', 'Retry 2-3 times with backoff'],
          ['Setting deadlock_timeout very low globally', 'Detection overhead and needless aborts', 'Leave default 1s; fix ordering instead'],
          ['Ignoring lock waits in monitoring', 'Deadlocks look like random errors', 'Track pg_stat_activity wait_event_type = Lock']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Log deadlock details with log_lock_waits = on to see exactly which locks waited.',
          'Alert on deadlock rate â€” a spike usually means a new code path broke lock ordering.',
          'Keep transactions short: fewer locks held, fewer chances to form a cycle.',
          'In distributed systems, use a single deterministic ordering key (e.g. record IDs) across all writers.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: What is a deadlock and how does PostgreSQL handle it? Answer: A circular wait on locks; PostgreSQL builds the wait-for graph after deadlock_timeout and aborts one victim with 40P01, which the app must retry.',
          'Question: How do you design to avoid deadlocks? Answer: Acquire locks in the same sorted order everywhere (ORDER BY id FOR UPDATE), keep transactions short, and retry on 40P01.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Reproduce the two-session deadlock exactly as written.',
          '2. Fix it with consistent ordering and verify zero deadlocks over 100 runs.',
          '3. Turn on log_lock_waits and read the deadlock log entry format.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Locking" and "Deadlocks"',
          'PostgreSQL source: src/backend/storage/lmgr/deadlock.c',
          'Next: Normalization 1NF to BCNF'
        ]
      }
    ]
  }
];
