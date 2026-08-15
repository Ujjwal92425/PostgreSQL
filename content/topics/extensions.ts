import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const extensionsNotes: NotePage[] = [
  {
    topicId: '13-extensions',
    slug: 'pg-stat-statements',
    title: 'pg_stat_statements',
    description: 'What pg_stat_statements is, how it tracks query performance, and how to find slow queries and buffer problems.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what pg_stat_statements is',
        body: [
          'pg_stat_statements is the most important extension for PostgreSQL performance tuning. It records execution statistics of all SQL statements executed by the server, parameterized into normalized query fingerprint templates.',
          'What it does: for every query shape it tracks call count, total/mean/min/max time, rows, shared buffer hits/reads, and temp I/O — the raw material for every "what is slow?" investigation.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need it',
        body: [
          'Without it you are debugging blind: logs show individual slow queries but not which query SHAPE burns 80% of total time. pg_stat_statements answers "which queries cost the most cumulative CPU, which miss the cache, which spill to disk" in one query — and works for production traffic with zero app changes.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Think of it as a fitness tracker for the database: every workout (query) is logged by exercise type (normalized fingerprint), with total minutes, average pace, and calories (buffers). Identical exercises with different weights (parameters) share one line, so "this exercise in total" is visible at a glance.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the key columns',
        headers: ['Column', 'Meaning', 'Tells you'],
        rows: [
          ['calls', 'Times this fingerprint ran', 'Frequency hot paths'],
          ['total_exec_time / mean_exec_time', 'Cumulative / average ms', 'Where time is spent'],
          ['rows', 'Rows returned', 'Efficiency of the query'],
          ['shared_blks_hit / read', 'Cache hits vs disk reads', 'Cache miss ratio'],
          ['temp_bytes', 'Bytes written to temp files', 'work_mem spills'],
          ['queryid', 'Stable fingerprint id', 'Correlate across restarts']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: install and verify',
        language: 'sql',
        code: `-- postgresql.conf:
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
-- (restart required for shared_preload_libraries)

create extension if not exists pg_stat_statements;

select queryid, calls, query
from pg_stat_statements
order by calls desc
limit 5;`
      },
      {
        type: 'code',
        title: '7. Medium example: find the top cumulative-time consumers',
        language: 'sql',
        code: `select
  round(total_exec_time::numeric, 2) as total_time_ms,
  calls,
  round(mean_exec_time::numeric, 2) as avg_time_ms,
  round((100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0))::numeric, 2) as cache_hit_pct,
  rows,
  left(query, 80) as query_snippet
from pg_stat_statements
order by total_exec_time desc
limit 5;

-- Interpretation:
-- 1. total_time_ms huge + calls small  -> rare but slow: needs index/rewrite
-- 2. total_time_ms huge + calls huge   -> hot path: optimize or cache
-- 3. cache_hit_pct < 99                -> buffer misses: memory or stats issue
-- 4. rows huge per call                -> missing filter or index-only scan`
      },
      {
        type: 'code',
        title: '8. Complex example: spill detection and baseline diffing',
        language: 'sql',
        code: `-- Queries spilling to disk (work_mem too small for them):
select queryid,
       calls,
       round(mean_exec_time::numeric, 2) as avg_ms,
       round(temp_bytes::numeric / nullif(calls, 0), 0) as temp_bytes_per_call
from pg_stat_statements
where temp_bytes > 0
order by temp_bytes desc
limit 5;

-- Snapshot for diffing over time:
create table baseline_pss as
select queryid, calls, total_exec_time, rows from pg_stat_statements;

-- After a release:
select b.queryid,
       b.calls as before_calls,
       p.calls as after_calls,
       round((p.total_exec_time - b.total_exec_time)::numeric, 2) as delta_ms
from pg_stat_statements p
join baseline_pss b using (queryid)
order by delta_ms desc
limit 10;

-- Reset the stats for clean measurement windows:
select pg_stat_statements_reset();`
      },
      {
        type: 'callout',
        title: 'Sampling vs logging',
        body: 'pg_stat_statements gives cumulative totals, not per-query logs. For the actual statement text of a specific slow run, combine it with log_min_duration_statement (e.g. 500ms) or auto_explain. The extension tells you WHAT, the logs tell you WHEN and with WHICH parameters.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how it records',
        body: [
          'The extension hooks into the executor via a shared memory area loaded at startup (shared_preload_libraries). Each parsed query is normalized: literals become $1/$2 placeholders (unless track_utility=false and pg_stat_statements.track=top), producing a stable queryid hash. Counters are updated per execution from the planner/executor stats, with per-database breakdowns. Because it is shared memory, multiple backends aggregate into one global table — cheap, lock-free increments.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Not in shared_preload_libraries', 'The stats view stays empty for utility statements', 'Preload + restart, then CREATE EXTENSION'],
          ['Trusting one number in isolation', 'calls alone hides the slow rare queries', 'Rank by total_exec_time, rows, and spills'],
          ['Comparing across code changes', 'Fingerprints shift when SQL text changes', 'Snapshot baselines; diff queryid'],
          ['Forgetting pg_stat_statements_reset before A/B tests', 'Old stats pollute the measurement', 'Reset, load test, measure, reset']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Prometheus/Grafana dashboards on pg_stat_statements are standard: track total time delta per query per interval.',
          'Alert on queries whose total_exec_time growth rate spikes (a sign of data growth or stats drift).',
          'Auto_explain complements it: log plans for statements slower than X ms.',
          'Restrict query text visibility (pg_read_all_stats) — it can leak literals.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: How do you find the slowest queries in production? Answer: pg_stat_statements — order by total_exec_time; then correlate with EXPLAIN (ANALYZE, BUFFERS) and auto_explain logs for the actual plan.',
          'Question: Why is it preloaded at server start? Answer: It allocates shared memory for lock-free counters that all backends update — created at startup via shared_preload_libraries, hence the restart requirement.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Install the extension, run a workload, and rank queries by total time.',
          '2. Force a spill with work_mem=1MB and find it in temp_bytes.',
          '3. Build the baseline diff table and use it after a query change.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "pg_stat_statements" and "auto_explain"',
          'Next: pgcrypto and pg_trgm'
        ]
      }
    ]
  },
  {
    topicId: '13-extensions',
    slug: 'pgcrypto-pgtrgm',
    title: 'pgcrypto and pg_trgm',
    description: 'Master fast fuzzy string matching with trigram GIN indexes (pg_trgm) and cryptographic primitives (pgcrypto).',
    level: 'Advanced',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what these extensions are',
        body: [
          'pg_trgm splits text strings into 3-character trigram sequences, enabling fast ILIKE %search% substring matching via GIN indexes and fuzzy similarity ranking (%, <->). pgcrypto provides cryptographic hashing (SHA-256, bcrypt) and symmetric/asymmetric encryption functions.',
          'What they do: pg_trgm turns "contains substring" from a full scan into an index probe; pgcrypto brings password hashing and column encryption into the database without external tools.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why we need them',
        body: [
          'LIKE \'%term%\' cannot use a plain B-tree — leading wildcards force scans; autocomplete and "did you mean" need similarity scoring. And every secure application needs bcrypt-style password hashing plus optional column encryption, which pgcrypto provides with a one-line function call.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Trigrams are the letters you slide along the text: "postgres" becomes "pos", "ost", "stg", ... The GIN index is a dictionary of every trigram pointing at the strings containing it — searching "%gres%" is now a dictionary lookup. pgcrypto is a sealed envelope factory: crypt() seals passwords so nobody can read them, pgp_sym_encrypt seals columns so only key holders can.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: operator reference',
        headers: ['Extension', 'Operator/function', 'Meaning', 'Index needed'],
        rows: [
          ['pg_trgm', 'ILIKE \'%term%\'', 'Substring match (now indexable)', 'GIN (name gin_trgm_ops)'],
          ['pg_trgm', 'a % b', 'Similarity above threshold', 'GIN/GiST trigram ops'],
          ['pg_trgm', '<->', 'Distance (low = similar)', 'GiST for ORDER BY <->'],
          ['pg_trgm', 'similarity(a, b)', '0..1 similarity score', 'None (runtime)'],
          ['pgcrypto', 'crypt(pw, gen_salt(\'bf\', n))', 'bcrypt password hash', 'None'],
          ['pgcrypto', 'pgp_sym_encrypt/decrypt', 'AES symmetric column encryption', 'None (hash column for lookups)']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: enable and index substring search',
        language: 'sql',
        code: `create extension if not exists pg_trgm;

create index products_name_trgm_idx on products using gin (name gin_trgm_ops);

-- Now the leading-wildcard search is an INDEX scan:
select id, name, sku
from products
where name ilike '%ergonom%';

-- EXPLAIN shows:
-- Bitmap Index Scan on products_name_trgm_idx
--   Index Cond: (name ~~* '%ergonom%')`
      },
      {
        type: 'code',
        title: '7. Medium example: fuzzy autocomplete with similarity',
        language: 'sql',
        code: `-- "Did you mean?" ranking:
select id, name,
       similarity(name, 'ergonomic chair') as score
from products
where name % 'ergonomic chair'          -- above pg_trgm.similarity_threshold (0.3)
order by score desc
limit 5;

-- Output (shape):
-- id       | name                 | score
-- prd_1001 | Ergonomic Chair      | 0.428571
-- prd_1002 | Ergonomic Footrest   | 0.333333

-- Nearest-neighbor autocomplete (GiST index + <->):
create index products_name_trgm_gist on products using gist (name gist_trgm_ops);
select id, name from products
order by name <-> 'ergonomic'
limit 3;`
      },
      {
        type: 'code',
        title: '8. Complex example: pgcrypto in a production users table',
        language: 'sql',
        code: `create extension if not exists pgcrypto;

-- Registration with bcrypt (cost 10) — one function call:
insert into users (id, email, password_hash)
values (gen_random_uuid(), 'maya@example.com',
        crypt('correct horse battery staple', gen_salt('bf', 10)));

-- Login — crypt() is timing-safe:
select id from users
where email = 'maya@example.com'
  and password_hash = crypt('supplied password', password_hash);

-- Sensitive column with symmetric encryption + searchable hash:
alter table users add column ssn_enc bytea, add column ssn_hash text;

update users
set ssn_enc = pgp_sym_encrypt('123-45-6789', current_setting('app.ssn_key')),
    ssn_hash = encode(digest('123-45-6789', 'sha256'), 'hex')
where id = 'usr_9021a';

-- Exact lookup via hash (indexed), decrypt only at the API boundary:
select pgp_sym_decrypt(ssn_enc, current_setting('app.ssn_key'))
from users
where ssn_hash = encode(digest('123-45-6789', 'sha256'), 'hex');`
      },
      {
        type: 'callout',
        title: 'Trigram limits and costs',
        body: 'Trigram matching only helps for terms >= 3 chars (2-char searches degrade to scans — set pg_trgm.word_similarity_threshold and keep GIN pending lists small). The GIN trigram index is large; GiST is smaller but returns candidates needing recheck. For autocomplete, combine trigram with tsvector full-text search for the best of both.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how trigrams and crypto execute',
        body: [
          'pg_trgm converts each string into trigram tuples (with word-boundary padding: "a" -> "  a", " a "), stored in a GIN posting list per trigram; a query string\'s trigrams are AND-combined, then the bitmap filters candidates — hence recheck. Similarity uses the Dice coefficient on trigram sets. pgcrypto hooks OpenSSL: crypt() is bcrypt with a per-password salt and adaptive cost; pgp_* implements the OpenPGP message format with AES; digest() computes server-side hashes.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['pg_trgm for < 3-char searches', 'Index unusable, full scans', 'Prefix indexes (text_pattern_ops) or n-gram alternatives'],
          ['Similarity thresholds left at default', 'Too many/noisy results', 'Tune pg_trgm.similarity_threshold per use case'],
          ['Symmetric key hardcoded in code', 'Key extraction = total compromise', 'External vault, per-request injection'],
          ['Encrypting columns used in JOINs/filters', 'Joins and range scans break', 'Hash/derived column for lookups'],
          ['md5 instead of bcrypt', 'GPU-crackable hashes', 'crypt() with bf cost 10+']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Size check: a GIN trigram index on a big text column can be large — measure before committing.',
          'Autocomplete: cache top-N similarity results; don\'t hit the DB per keystroke.',
          'Key rotation: re-encrypt data with pgp_sym_encrypt when the key changes; keep a rotation window.',
          'Combine pg_trgm with full-text search (tsvector) for rank quality: FTS for keywords, trigram for typos.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Why can\'t a B-tree serve LIKE \'%x%\'? Answer: A leading wildcard makes the first character unknown — the B-tree ordering is useless; trigram indexes solve it by indexing substrings as tokens.',
          'Question: bcrypt vs SHA-256 for passwords? Answer: bcrypt is deliberately slow and salted (adaptive cost, GPU-resistant); SHA-256 is fast by design — right tool for digests, wrong tool for passwords.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Install pg_trgm, index products.name, and EXPLAIN an ilike \'%term%\' query.',
          '2. Tune the similarity threshold and observe result counts.',
          '3. Encrypt a column, search via hash, decrypt at the boundary.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "pg_trgm", "pgcrypto"',
          'Next: RDS vs Aurora'
        ]
      }
    ]
  }
];
