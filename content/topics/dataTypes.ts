import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const dataTypesNotes: NotePage[] = [
  {
    topicId: '02-data-types',
    slug: 'numeric-money-decimal',
    title: 'Numeric, Money, and Decimal Values',
    description: 'Model financial ledger balances, taxes, and prices without floating point rounding errors.',
    level: 'Intermediate',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what these types are',
        body: [
          'PostgreSQL offers three families of numeric types: exact-precision NUMERIC (also written DECIMAL), fixed-size integers (smallint, integer, bigint), and IEEE 754 floating point (real, double precision).',
          'What they do: NUMERIC stores digits exactly as decimal values; float stores binary approximations. For money, any inexact type silently corrupts totals â€” the classic example is 0.1 + 0.2 = 0.30000000000000004.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'A single rounding error in a payment ledger is a compliance and trust disaster. Choosing the right numeric type determines whether 0.1 + 0.2 equals 0.3 exactly, how much disk space you use, and how fast aggregate math runs.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'NUMERIC is a calculator: it computes in decimal like a human would, one digit at a time. double precision is a slide rule: fast and good enough for measurements, but it rounds at the 15th digit. bigint is a tally counter of cents: exact if you agree that all amounts are integers of the smallest unit.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: type comparison',
        headers: ['Type', 'Storage', 'Precision', 'Best use case'],
        rows: [
          ['numeric(12,2)', 'Variable (4-10 bytes)', 'Exact decimal math', 'Financial ledgers, order totals, tax'],
          ['bigint (minor units)', '8 bytes fixed', 'Exact integer cents', 'Ultra-high-throughput payment pipelines'],
          ['integer / bigint', '4 / 8 bytes fixed', 'Exact integers', 'Counters, ids, quantities'],
          ['double precision', '8 bytes fixed', 'Inexact floating point', 'Scientific measurements, GIS coordinates'],
          ['money', '8 bytes fixed', 'Exact cents, locale formatting', 'Display-layer values; avoid in math (locale-dependent)']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: exact math with NUMERIC',
        language: 'sql',
        code: `select
  0.1::double precision + 0.2::double precision as float_result,        -- 0.30000000000000004
  0.1::numeric(12,2) + 0.2::numeric(12,2) as decimal_result;             -- 0.30 (exact)

-- Output
-- float_result            | decimal_result
-- 0.30000000000000004     | 0.30`
      },
      {
        type: 'code',
        title: '7. Medium example: a production double-entry ledger',
        language: 'sql',
        code: `create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  account text not null,
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Transfer: both legs must succeed atomically
begin;
insert into ledger_entries (payment_id, account, direction, amount)
values ('pay_8801', 'customer_balance', 'debit', 110.00);
insert into ledger_entries (payment_id, account, direction, amount)
values ('pay_8801', 'revenue', 'credit', 110.00);
commit;

-- The books must balance:
select direction, sum(amount) from ledger_entries group by direction;`
      },
      {
        type: 'table',
        title: '8. Output of the medium example',
        headers: ['direction', 'sum'],
        rows: [
          ['credit', '110.00'],
          ['debit', '110.00']
        ]
      },
      {
        type: 'code',
        title: '9. Complex example: tax computation with exact rounding rules',
        language: 'sql',
        code: `-- Tax must be computed per line then rounded, never on the total (rounding rules!)
begin;

insert into order_items (id, order_id, variant_id, quantity, unit_price)
values (gen_random_uuid(), 'ord_9001', 'var_5501', 3, 19.99);

-- Per-line tax, HALF_EVEN rounding via numeric
select
  sum(oi.quantity * oi.unit_price)::numeric(12,2) as subtotal,
  round(sum(oi.quantity * oi.unit_price * 0.0825)::numeric, 2) as tax,
  round((sum(oi.quantity * oi.unit_price) * 1.0825)::numeric, 2) as total_due
from order_items oi
where order_id = 'ord_9001';

commit;`
      },
      {
        type: 'table',
        title: '10. Output of the complex example',
        headers: ['subtotal', 'tax', 'total_due'],
        rows: [
          ['59.97', '4.95', '64.92']
        ]
      },
      {
        type: 'callout',
        title: 'Why per-line rounding matters',
        body: 'Compute tax on each line item (3 x 19.99 = 59.97; 59.97 x 0.0825 = 4.947525 -> 4.95) instead of on the grand total. Different rounding bases produce different totals, and auditors expect the line-item method. NUMERIC rounds half away from zero by default; use explicit round() calls with the 4th argument (numeric_round_mode) for half-even.'
      },
      {
        type: 'paragraph',
        title: '11. PostgreSQL internals: how NUMERIC is stored',
        body: [
          'NUMERIC is stored as a sign, a scale, and an array of base-10000 digits (each "digit" holds 4 decimal places), with a 2-byte header per group. This is why storage is variable (4-10+ bytes depending on precision). Arithmetic on NUMERIC uses software decimal routines â€” slower than hardware float math, but exact. Sums over millions of rows on double precision diverge from numeric sums; never mix types in money columns.'
        ]
      },
      {
        type: 'table',
        title: '12. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['double precision for prices', '0.1 + 0.2 style drift corrupts totals', 'numeric(12,2) or bigint cents'],
          ['numeric without scale (numeric)', 'Arbitrary precision invites 33-digit values and slow math', 'Always declare numeric(p, s)'],
          ['Cross-type arithmetic in one column', 'Implicit casts silently convert money to float', 'Keep one canonical money type'],
          ['money type for math', 'Locale-dependent output, comparisons break across locales', 'Use numeric for storage, money only for display']
        ]
      },
      {
        type: 'list',
        title: '13. Production considerations',
        items: [
          'Choose a scale strategy once (2 decimals for USD) and enforce with CHECK (amount >= 0).',
          'For payment providers, store both the raw provider amount and the internally computed one.',
          'Aggregations over millions of rows: numeric is slower than bigint â€” consider bigint micro-units for hot paths.',
          'Always cast aggregates: sum(numeric) can exceed declared scale; cast results to numeric(14,2).'
        ]
      },
      {
        type: 'list',
        title: '14. Interview angle',
        items: [
          'Question: Why not store money as double? Answer: binary floats cannot represent most decimal fractions exactly, so totals drift; financial systems require exactness for auditability.',
          'Question: When would you pick bigint cents over numeric? Answer: When the hot write path does billions of additions and you can afford the app-level conversion; numeric is slower but simpler to audit.'
        ]
      },
      {
        type: 'list',
        title: '15. Practice tasks',
        items: [
          '1. Reproduce the 0.1 + 0.2 difference between float and numeric.',
          '2. Build the ledger table and verify debit == credit after a transfer.',
          '3. Compute tax both per-line and on-total and observe the difference.'
        ]
      },
      {
        type: 'list',
        title: '16. Further reading',
        items: [
          'PostgreSQL docs: "Numeric Types" and the numeric_round_mode GUC',
          'Next: JSONB, Arrays, and Enums'
        ]
      }
    ]
  },
  {
    topicId: '02-data-types',
    slug: 'jsonb-arrays-enums',
    title: 'JSONB, Arrays, and Enums',
    description: 'Master JSONB indexing, array containment operations, and enumerated type safety in PostgreSQL.',
    level: 'Intermediate',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what these types are',
        body: [
          'JSONB is a binary JSON document type: it parses, validates, deduplicates keys, and stores a sorted tree. Arrays store ordered collections of the same type. ENUMs define a fixed list of allowed string values.',
          'What they do: JSONB makes PostgreSQL a document store (queryable via operators like @>), arrays enable set-like predicates (ANY, @>), and enums give type-safe, compact string enums with ordering.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'JSONB is the escape hatch that keeps schema changes cheap for truly dynamic attributes; arrays replace junction tables for lightweight lists; enums prevent the classic bug of arbitrary strings like "PAID" vs "Paid" in status columns. Each has sharp edges you must understand before using them in production.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'JSONB is a filing cabinet drawer you can stuff a whole folder into â€” flexible but hard to enforce rules inside. Arrays are a shopping list: same item type, order matters. An enum is a vending machine button: only the exact labeled options exist, and pressing "PENDING" vs "pending" is impossible.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: key operators and storage',
        headers: ['Type', 'Key operators', 'Index support', 'When to use'],
        rows: [
          ['jsonb', '@> containment, ->/->> access, ?/?|/?& existence, jsonb_path', 'GIN (default jsonb_ops, or jsonb_path_ops)', 'Dynamic nested attributes, search over documents'],
          ['text[] / int[]', '= ANY(array), @> containment, && overlap, unnest()', 'GIN (array_ops)', 'Tags, simple multi-valued flags'],
          ['enum (CREATE TYPE ... AS ENUM)', '=, <, > with declared order', 'Plain B-tree', 'Fixed vocabularies: status, direction, level']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: JSONB access operators',
        language: 'sql',
        code: `select
  id,
  metadata->>'brand' as brand,                    -- text value
  metadata->'dimensions'->>'weight_kg' as weight,  -- nested
  metadata ? 'is_featured' as has_featured_flag,   -- existence
  metadata @> '{"color": "Midnight Blue"}' as is_midnight_blue  -- containment
from products
where id = 'prd_1001';`
      },
      {
        type: 'table',
        title: '7. Output of the basic example',
        headers: ['id', 'brand', 'weight', 'has_featured_flag', 'is_midnight_blue'],
        rows: [
          ['prd_1001', 'HermanMiller', '18.5', 'true', 'false']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: GIN-indexed JSONB search + array tags',
        language: 'sql',
        code: `-- GIN index makes containment queries index-backed
create index products_metadata_gin_idx on products using gin (metadata);
create index products_tags_gin_idx on products using gin (tags);

select id, sku, name, tags
from products
where metadata @> '{"attributes": {"color": "Midnight Blue"}}'
  and tags @> array['eco'];`
      },
      {
        type: 'code',
        title: '9. Complex example: enums for state machines + arrays for bulk matching',
        language: 'sql',
        code: `create type order_status as enum ('pending_payment', 'paid', 'shipped', 'cancelled', 'refunded');

alter table orders alter column status type order_status
using status::order_status;

-- Enum ordering powers range queries over the state machine
select status, count(*)
from orders
where status >= 'paid'
group by status;

-- Array containment: find events matching any of a set of paths
select id, path, occurred_at
from page_views
where path = any(array['/checkout', '/cart', '/pricing'])
order by occurred_at desc
limit 10;`
      },
      {
        type: 'callout',
        title: 'The enum trap',
        body: 'You cannot remove a value from an enum without dropping the type (which rewrites every dependent table). Add new values with ALTER TYPE ... ADD VALUE, but they can only be used inside a transaction after a re-check. If your vocabulary changes often, prefer a lookup table + FK or a text column with a CHECK constraint.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: JSONB binary format',
        body: [
          'JSONB stores keys in a sorted container; each container has a type tag and length, so traversal is O(depth) pointer hops rather than string scans. GIN indexes on jsonb build inverted lists of keys/paths and values (or paths only with jsonb_path_ops, which is smaller and faster for containment but cannot index individual keys). Arrays use similar GIN machinery with hash-based elements. Enums are stored as 4-byte oids mapped to labels in pg_enum â€” compact but migration-hostile.'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['json instead of jsonb', 'No index, no operators, slower, duplicates preserved', 'Always use jsonb'],
          ['GIN index without jsonb_path_ops on huge tables', 'Large indexes, slower inserts', 'Try jsonb_path_ops for containment-only workloads'],
          ['enum for volatile vocabularies', 'ALTER TYPE ADD VALUE blocks and type rewrites', 'Lookup table or CHECK constraint'],
          ['Arrays used for business-critical relations', 'No FK enforcement inside arrays', 'Use junction tables for relational data']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Keep only truly dynamic attributes in JSONB; promote stable ones to columns.',
          'Index hot JSONB queries; containment on unindexed jsonb is a full scan.',
          'For analytics over jsonb, consider jsonb_path_query for SQL/JSON or extraction into columns.',
          'Validate JSONB shape at the app layer or with generated columns + CHECK.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: jsonb vs json? Answer: jsonb is parsed, deduplicated, indexable, and faster; json keeps exact textual representation and ordering for JSON_PATH passthrough â€” production code uses jsonb.',
          'Question: When do arrays beat a junction table? Answer: For simple, always-read-together flags (tags), where joins would add overhead; never when the list needs integrity or to be queried as relations.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Insert a products row with nested metadata and test all access operators.',
          '2. Create a GIN index and compare EXPLAIN of a containment query before/after.',
          '3. Create an enum, use it, then try to DROP VALUE â€” read the error and the workaround.'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "JSON Types", "Arrays", and "Enumerated Types"',
          'Next: Ranges, Time, and Network Types'
        ]
      }
    ]
  },
  {
    topicId: '02-data-types',
    slug: 'ranges-time-inet',
    title: 'Ranges, Time, and Network Types',
    description: 'Work with timestamptz, tstzrange, inet, and GiST overlap operators for scheduling and IP filtering.',
    level: 'Advanced',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what these types are',
        body: [
          'Time types: timestamp, timestamptz (timezone-aware), date, time, interval. Range types: int4range, numrange, tsrange, tstzrange â€” an interval with a lower and upper bound. Network types: inet and cidr for IP addresses and subnets.',
          'What they do: timestamptz stores an absolute instant in UTC; ranges store a whole interval as one value, enabling overlap (&&) tests; inet supports containment (<<) and arithmetics.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Booking systems must never double-book a room; event schedules must not overlap; abuse teams must check whether an IP belongs to a blocked subnet. Range types + exclusion constraints make these guarantees at the database level â€” the only place concurrency-safe.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'timestamptz is a point on a universal timeline (instant). A tstzrange is a thick marker covering a span of that timeline. inet is a point in IP space; cidr is a whole subnet region. The && operator asks "do these two markers overlap?", and an exclusion constraint turns "no overlap" into an enforced law.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: operators and types',
        headers: ['Type', 'Sample values', 'Key operators', 'Use case'],
        rows: [
          ['timestamptz', "2026-08-10 12:00:00+00", 'now(), date_trunc, extract, age', 'Absolute event times (always UTC)'],
          ['tstzrange', "[2026-01-01, 2026-02-01)", '&& (overlap), @> (contains), -|- (adjacent)', 'Scheduling, price validity windows'],
          ['interval', "interval '30 days'", '+ , - , justify_interval', 'Expiry math'],
          ['inet', "'192.168.1.5'::inet", '<< (contained by), >>, & (bitwise)', 'IP logging, geo-routing'],
          ['cidr', "'192.168.1.0/24'::cidr", '<< containment', 'Subnet allow/block lists']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: time math and timezone correctness',
        language: 'sql',
        code: `-- Always store instants; render in the user's zone at read time
select
  now() as now_utc,
  now() at time zone 'Asia/Kolkata' as now_in_kolkata,
  now() + interval '30 days' as expires_at;

-- Filtering "last 7 days" â€” compare timestamptz with timestamptz
select count(*) as orders_last_week
from orders
where created_at >= now() - interval '7 days';`
      },
      {
        type: 'table',
        title: '7. Output of the basic example',
        headers: ['now_utc', 'now_in_kolkata', 'expires_at'],
        rows: [
          ['2026-08-10 10:00:00+00', '2026-08-10 15:30:00', '2026-09-09 10:00:00+00']
        ]
      },
      {
        type: 'code',
        title: '8. Medium example: querying ranges with overlap',
        language: 'sql',
        code: `-- All price windows that are active TODAY
select pv.sku, pp.amount, pp.valid_from, pp.valid_to
from product_prices pp
join product_variants pv on pv.id = pp.variant_id
where tstzrange(pp.valid_from, pp.valid_to, '[)')
      && tstzrange(now(), now(), '[]');

-- inet containment: did this request come from a known datacenter subnet?
select id, ip_address, user_agent
from user_sessions
where ip_address << '192.168.0.0/16'::cidr;`
      },
      {
        type: 'code',
        title: '9. Complex example: exclusion constraint prevents double-booking',
        language: 'sql',
        code: `create extension if not exists btree_gist;

create table event_schedules (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id),
  during tstzrange not null,
  exclude using gist (room_id with =, during with &&)
);

-- OK: schedule a rehearsal
insert into event_schedules (room_id, during)
values ('room_1', '[2026-08-10 09:00, 2026-08-10 11:00)');

-- FAILS: overlapping concert in the same room â€” database refuses, no app check needed
insert into event_schedules (room_id, during)
values ('room_1', '[2026-08-10 10:30, 2026-08-10 13:00)');
-- ERROR: conflicting key value violates exclusion constraint "event_schedules_room_id_during_excl"`
      },
      {
        type: 'callout',
        title: 'Concurrency: why app-level overlap checks are not enough',
        body: 'Two requests can both run "is the room free?" before either inserts â€” both see free and both insert. The EXCLUDE constraint resolves the race at the storage engine: the loser gets an error and can retry. This is the same idea as the unique seat reservation in the transactions topic, but for continuous ranges.'
      },
      {
        type: 'paragraph',
        title: '10. PostgreSQL internals: how ranges and exclusion work',
        body: [
          'A range value is stored as bounds (inclusive/exclusive flags) plus the two endpoints; canonical form is maintained with a btree comparison function. Exclusion constraints use GiST index support functions (consistent(), union(), compress()) to test overlap during inserts â€” essentially a spatial index over intervals. timestamptz is stored as microseconds since 2000-01-01 UTC in 8 bytes, so timezone conversions never affect storage.'
        ]
      },
      {
        type: 'table',
        title: '11. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['timestamp without time zone for events', 'Absolute instants drift across deployments/timezones', 'Always timestamptz; convert at read time'],
          ['BETWEEN a AND b for intervals', 'BETWEEN is inclusive on both ends â€” off-by-one windows', 'Use tstzrange with explicit bound semantics'],
          ['Overlap checks in app code only', 'Races under concurrency double-book resources', 'EXCLUDE USING gist at the DB level'],
          ['Storing IPs as text', 'No containment queries, slower indexes', 'Use inet/cidr with GiST or btree_gin support']
        ]
      },
      {
        type: 'list',
        title: '12. Production considerations',
        items: [
          'Set timezone=UTC in postgresql.conf; render local times only in the presentation layer.',
          'Bound every range explicitly â€” an unbounded tstzrange(valid_from, NULL) hides "forever" rows.',
          'Index the lower bound of hot range columns for partition pruning and point queries.',
          'For booking systems, keep hold expiry in timestamptz and clean expired holds in a cron.'
        ]
      },
      {
        type: 'list',
        title: '13. Interview angle',
        items: [
          'Question: timestamp vs timestamptz? Answer: timestamptz stores UTC instants (converted on input/output per session timezone); timestamp stores wall-clock values with no zone â€” almost never correct for events.',
          'Question: How would you enforce "an employee cannot have overlapping shifts"? Answer: EXCLUDE USING gist (employee_id WITH =, shift_range WITH &&) â€” the storage engine enforces it atomically.'
        ]
      },
      {
        type: 'list',
        title: '14. Practice tasks',
        items: [
          '1. Build the event_schedules table and reproduce the exclusion error.',
          '2. Insert overlapping price windows and confirm btree_gist catches them.',
          '3. Test inet containment: is your loopback address inside 127.0.0.0/8?'
        ]
      },
      {
        type: 'list',
        title: '15. Further reading',
        items: [
          'PostgreSQL docs: "Date/Time Types", "Range Types", "Network Address Types"',
          'Next: Join Types'
        ]
      }
    ]
  }
];
