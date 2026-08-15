import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const functionsNotes: NotePage[] = [
  {
    topicId: '05-functions-plpgsql',
    slug: 'functions-procedures',
    title: 'Functions vs Procedures',
    description: 'Build user-defined PL/pgSQL functions and stored procedures with explicit transaction control.',
    level: 'Advanced',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what functions and procedures are',
        body: [
          'Functions (CREATE FUNCTION) are server-side routines that return a scalar or set value. Procedures (CREATE PROCEDURE) are routines called with CALL that can manage internal transaction boundaries using COMMIT and ROLLBACK explicitly.',
          'What they do: they push business logic next to the data — validation, audits, idempotent writes — eliminating app↔DB roundtrips and centralizing logic in one place.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Stored logic runs with one network hop instead of N; it is callable from any client language identically; and it can be wrapped in SECURITY DEFINER to grant safe, narrow privileges. The function/procedure distinction decides whether your code can control transactions at all — a procedure can COMMIT inside a batch loop; a function cannot.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'A function is a chef working inside one dish: they cannot pause to serve other dishes mid-cook (no internal COMMIT). A procedure is a manager running a multi-course event: they can officially close one course (COMMIT), and even cancel the whole evening (ROLLBACK). Both live in the kitchen — on the database server, not in the app.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: function vs procedure',
        headers: ['Aspect', 'FUNCTION', 'PROCEDURE'],
        rows: [
          ['Created by', 'CREATE FUNCTION', 'CREATE PROCEDURE'],
          ['Called by', 'SELECT func(...) or in expressions', 'CALL proc(...)'],
          ['Return value', 'Scalar, row, or SETOF', 'None (can OUT params)'],
          ['Transaction control inside', 'Cannot COMMIT/ROLLBACK', 'Can COMMIT/ROLLBACK'],
          ['Used in SQL', 'Yes (expressions, views)', 'No'],
          ['Typical use', 'Computations, validators, triggers', 'Batch jobs, multi-step ETL, maintenance']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: a simple SQL-language function',
        language: 'sql',
        code: `-- Immutable helper: reusable in queries and index expressions
create function active_coupons(now_ts timestamptz)
returns setof coupons
language sql
stable
as $$
  select * from coupons
  where is_active and starts_at <= now_ts and ends_at > now_ts;
$$;

-- Use it like a table
select code, discount_percent from active_coupons(now());
-- Output:
-- code        | discount_percent
-- WELCOME10   | 10.00`
      },
      {
        type: 'code',
        title: '7. Medium example: PL/pgSQL audit trigger function',
        language: 'sql',
        code: `create or replace function log_audit_trail()
returns trigger as $$
begin
  insert into audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata, created_at)
  values (
    gen_random_uuid(),
    nullif(current_setting('app.current_user_id', true), '')::uuid,
    TG_OP,
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
    now()
  );
  return NEW;
end;
$$ language plpgsql;

-- Attach it so every write to orders is audited automatically
create trigger orders_audit
after insert or update or delete on orders
for each row execute function log_audit_trail();`
      },
      {
        type: 'code',
        title: '8. Complex example: a PROCEDURE with internal COMMIT for batch jobs',
        language: 'sql',
        code: `-- Purge expired sessions in batches; each batch commits independently so
-- a crash never loses the already-deleted chunks.
create procedure purge_expired_sessions(batch_size int)
language plpgsql
as $$
declare
  v_affected int;
begin
  loop
    delete from user_sessions
    where id in (
      select id from user_sessions
      where expires_at < now()
      limit batch_size
    );

    get diagnostics v_affected = row_count;

    exit when v_affected = 0;   -- nothing left

    commit;                    -- <-- only procedures may do this
    perform pg_sleep(0.1);     -- give autovacuum a breather
  end loop;
end;
$$;

-- Run the job:
call purge_expired_sessions(10000);`
      },
      {
        type: 'callout',
        title: 'Why the batch COMMIT pattern matters',
        body: 'Deleting 50M rows in ONE transaction holds one giant snapshot, one giant lock window, and one WAL flood — a classic production incident. Batching with internal COMMIT bounds lock time per batch and lets autovacuum keep up. Functions cannot do this; procedures were added in PostgreSQL 11 precisely for this.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how functions execute',
        body: [
          'SQL-language functions can be inlined into the calling query by the planner (flattening function call overhead). PL/pgSQL functions are compiled to bytecode (since PG11, via the plpgsql VM) and executed per call; they use a SPI (Server Programming Interface) connection to issue SQL. Each SPI call has a small per-call overhead, so avoid row-by-row SPI loops — prefer SET-BASED SQL or return query.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Row-by-row FOR loop over 1M rows', 'N SPI calls; 100x slower than set-based SQL', 'Write set-based SQL or RETURN QUERY'],
          ['Marking functions volatile unnecessarily', 'Blocks inlining and index usage (expression indexes need IMMUTABLE)', 'Declare correct VOLATILE/STABLE/IMMUTABLE'],
          ['COMMIT inside a FUNCTION', 'Compile error — functions cannot manage transactions', 'Use a PROCEDURE with CALL'],
          ['Unbounded batch deletes in one transaction', 'Lock and WAL spikes; autovacuum starvation', 'Chunked loop with COMMIT (as above)']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Grant EXECUTE explicitly; by default it is PUBLIC — tighten with REVOKE for security-sensitive functions.',
          'Prefer SECURITY INVOKER (default); SECURITY DEFINER only with SET search_path frozen to prevent hijacking.',
          'Version functions with migration scripts; ALTER FUNCTION ... on name changes to keep deployments green.',
          'Test volatility labels: an IMMUTABLE function that actually depends on session state corrupts index consistency.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Function vs procedure? Answer: Functions return values, run inside SQL, cannot COMMIT; procedures are CALLed, return nothing, and can control transactions — needed for long-running batch jobs.',
          'Question: Why is a row-by-row PL/pgSQL loop slow? Answer: Each SPI statement has parser/executor overhead per row; a set-based query processes rows in one pass. If you must loop, batch with arrays (unnest) or RETURN QUERY.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Create the active_coupons function and query it like a table.',
          '2. Attach the audit trigger, run an UPDATE on orders, and inspect audit_logs.',
          '3. Create and call the purge procedure; verify it runs in batches via pg_stat_activity.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Functions and Operators", "PL/pgSQL", "CREATE PROCEDURE"',
          'Next: Triggers'
        ]
      }
    ]
  },
  {
    topicId: '05-functions-plpgsql',
    slug: 'triggers',
    title: 'Triggers',
    description: 'Implement BEFORE, AFTER, and INSTEAD OF triggers for automated auditing and data enforcement.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what triggers are',
        body: [
          'A Trigger executes a specified PL/pgSQL function automatically whenever a specified DML event (INSERT, UPDATE, DELETE) occurs on a table or view.',
          'What they do: they enforce cross-row invariants (like "stock never goes negative"), maintain derived columns, audit every change, and sync denormalized counters — without any application code involvement.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Some rules simply cannot be expressed with CHECK constraints (which only see the current row) or FKs. Triggers are the enforcement layer for those rules. They also centralize audits so every write path — API, admin console, direct SQL, migrations — is covered.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'A trigger is a motion sensor on a door: BEFORE triggers stand in the doorway and can stop or alter what comes through (modify NEW); AFTER triggers watch from inside after the event passed and cannot change it anymore; INSTEAD OF triggers replace the door entirely (used on views). FOR EACH ROW means the sensor fires per person; FOR EACH STATEMENT once per group.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: trigger anatomy',
        headers: ['Aspect', 'Options', 'Meaning'],
        rows: [
          ['Timing', 'BEFORE / AFTER / INSTEAD OF', 'Before changes are written, after, or instead of'],
          ['Level', 'FOR EACH ROW / FOR EACH STATEMENT', 'Once per affected row, or once per statement'],
          ['Events', 'INSERT / UPDATE / DELETE / TRUNCATE', 'Which DML fires it'],
          ['Filtering', 'WHEN (condition)', 'Skip work unless the predicate is true'],
          ['Transition tables', 'OLD/NEW + NEW TABLE/OLD TABLE', 'Whole-set access for statement triggers']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: BEFORE UPDATE trigger for updated_at',
        language: 'sql',
        code: `create or replace function touch_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_inventory_updated_at
before update on inventory_items
for each row
execute function touch_updated_at_column();

-- Every UPDATE now stamps updated_at automatically:
update inventory_items set available_qty = 42 where variant_id = 'var_5501';
select available_qty, updated_at from inventory_items where variant_id = 'var_5501';
-- Output:
-- available_qty | updated_at
-- 42            | 2026-08-10 10:00:00+00 (auto-stamped)`
      },
      {
        type: 'code',
        title: '7. Medium example: AFTER trigger auditing with WHEN filter',
        language: 'sql',
        code: `-- Audit only price changes, not the noise of every field update
create or replace function audit_price_change()
returns trigger as $$
begin
  insert into audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    gen_random_uuid(),
    nullif(current_setting('app.current_user_id', true), '')::uuid,
    'price_update',
    'product_price',
    new.id,
    jsonb_build_object('old_amount', old.amount, 'new_amount', new.amount)
  );
  return new;
end;
$$ language plpgsql;

create trigger price_change_audit
after update on product_prices
for each row
when (old.amount is distinct from new.amount)
execute function audit_price_change();`
      },
      {
        type: 'code',
        title: '8. Complex example: trigger enforcing the "no negative stock" invariant',
        language: 'sql',
        code: `-- CHECK cannot compare rows; a trigger CAN enforce a real invariant
-- with a transaction-safe guard.
create or replace function prevent_negative_stock()
returns trigger as $$
begin
  if new.available_qty < 0 then
    raise exception 'stock for variant % would go negative: %',
      new.variant_id, new.available_qty
      using errcode = '23514';   -- check_violation
  end if;
  return new;
end;
$$ language plpgsql;

create trigger inventory_non_negative
before insert or update on inventory_items
for each row
execute function prevent_negative_stock();

-- This fails loudly instead of corrupting inventory:
update inventory_items set available_qty = -1 where variant_id = 'var_5501';
-- ERROR: stock for variant var_5501 would go negative: -1`
      },
      {
        type: 'callout',
        title: 'Trigger failure = transaction failure',
        body: 'An exception raised inside a trigger aborts the whole statement (and the surrounding transaction). That is usually what you want for invariant enforcement — but it means triggers are also a source of unexpected rollbacks, so keep them fast and test them under load.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how triggers run',
        body: [
          'Triggers are managed by the trigger manager (AfterTrigger / ExecBRInsertTriggers paths in the executor). BEFORE ROW triggers modify the tuple in memory before it is stored; AFTER ROW triggers are queued and fired at statement end (or COMMIT for deferred triggers). Statement-level triggers with transition tables (OLD TABLE/NEW TABLE) receive whole-result-set tuples, enabling set-based processing instead of per-row functions.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Heavy logic in per-row AFTER triggers', 'Multiplies work by rows touched; blocks the transaction', 'Use statement triggers + transition tables'],
          ['Recursive triggers (trigger updates same table)', 'Infinite loop or deadlock', 'Guard with WHEN filters and trigger flags'],
          ['App logic duplicating trigger logic', 'Two sources of truth drift apart', 'Choose ONE enforcement layer'],
          ['BEFORE trigger without RETURN', 'Function returning NULL silently skips the row', 'Always return NEW/OLD explicitly']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Trigger overhead is per-row SPI — batch operations can get 2-10x slower; keep trigger bodies lean.',
          'Audit triggers on multi-billion-row tables: consider logical replication/CDC instead.',
          'Deferred constraints (SET CONSTRAINTS ALL DEFERRED) help when triggers must check after a batch.',
          'Document every trigger in the schema migration — invisible behavior causes the worst outages.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: CHECK constraint vs trigger? Answer: CHECK is declarative, index-checked, and sees only the row being written; triggers see OLD and NEW and other tables — use CHECK first, triggers only for cross-row logic.',
          'Question: AFTER vs BEFORE? Answer: BEFORE can mutate the incoming tuple (updated_at stamping, normalization); AFTER observes the committed row state and is the right place for audits and downstream effects.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Wire the updated_at trigger and verify the timestamp changes.',
          '2. Add the negative-stock trigger and try to break it with a bad update.',
          '3. Rewrite the audit as a statement trigger with transition tables and compare EXPLAIN.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Triggers" and "CREATE TRIGGER"',
          'Next: B-tree Indexes'
        ]
      }
    ]
  }
];
